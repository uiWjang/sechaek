// supabase/functions/yes24/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

// supabase/functions/yes24/normalize.ts
var plain = (v) => String(v ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
function safeUrl(value, host) {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" && u.hostname === host ? u.href : null;
  } catch {
    return null;
  }
}
function normalize(item) {
  if (!Number.isSafeInteger(item.itemId) || item.itemId <= 0 || !plain(item.title)) throw new Error("Invalid product");
  return { yes24_id: String(item.itemId), isbn13: /^\d{13}$/.test(item.isbn13 || "") ? item.isbn13 : null, title: plain(item.title), author: plain(item.author) || null, publisher: plain(item.publisher) || null, pages: Number.isInteger(item.pages) && item.pages > 0 ? item.pages : null, description: plain(item.contentDetail?.bookIntroduction), cover_url: safeUrl(item.cover, "image.yes24.com"), yes24_url: safeUrl(item.link, "www.yes24.com") || `https://www.yes24.com/product/goods/${item.itemId}`, list_price: Number.isFinite(item.shopPrice) && item.shopPrice >= 0 ? Math.round(item.shopPrice) : null, source_sale_price: Number.isFinite(item.salePrice) && item.salePrice >= 0 ? Math.round(item.salePrice) : null, availability: plain(item.itemStatus), metadata_updated_at: (/* @__PURE__ */ new Date()).toISOString() };
}
var identity = (s) => plain(s).normalize("NFKC").replace(/\s/g, "").toLowerCase();
var authorIdentity = (s) => identity(plain(s).split("/")[0].replace(/\s+(저|글|지음)$/, ""));
function exactMatch(book, items) {
  const matches = items.filter((i) => identity(i.title) === identity(book.title) && !!book.author && authorIdentity(i.author) === authorIdentity(book.author) && (!book.publisher || identity(i.publisher) === identity(book.publisher)));
  return matches.length === 1 ? matches[0] : null;
}

// supabase/functions/yes24/index.ts
var db = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
var origins = (Deno.env.get("YES24_ALLOWED_ORIGINS") || "https://sechaek-library-live.vuh14.chatgpt.site,http://127.0.0.1:5173").split(",");
var inflight = /* @__PURE__ */ new Map();
var nextCall = 0;
async function throttle() {
  const now = Date.now(), slot = Math.max(now, nextCall);
  nextCall = slot + 200;
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
}
async function provider(path, params) {
  const key = path + "?" + new URLSearchParams(params), now = Date.now();
  const { data: cache, error } = await db.from("yes24_cache").select("*").eq("key", key).maybeSingle();
  if (error) throw new Error("DB \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
  if (cache && Date.parse(cache.expires_at) > now) return { ...cache.payload, fetchedAt: cache.updated_at };
  if (inflight.has(key)) return inflight.get(key);
  const promise = (async () => {
    const apiKey = Deno.env.get("YES24_API_KEY");
    if (!apiKey) throw new Error("\uC608\uC2A424 \uC5F0\uACB0 \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4.");
    const budget = await db.rpc("take_yes24_budget");
    if (budget.error || !budget.data) throw new Error("\uC870\uD68C \uC694\uCCAD\uC774 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
    await throttle();
    const response = await fetch("https://apis.yes24.com/v1/" + key, { headers: { "X-Api-Key": apiKey }, signal: AbortSignal.timeout(12e3) });
    if (!response.ok) throw new Error(response.status === 429 ? "\uC870\uD68C \uD55C\uB3C4\uC5D0 \uB3C4\uB2EC\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694." : "\uC608\uC2A424 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    const json = await response.json();
    if (!json.success || !Array.isArray(json.data?.items)) throw new Error("\uC608\uC2A424 \uC751\uB2F5\uC744 \uD655\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    const payload = { items: json.data.items.filter((i) => i.adultYn !== "Y"), total: json.data.totalCount || 0 };
    const stamp = (/* @__PURE__ */ new Date()).toISOString();
    const saved = await db.from("yes24_cache").upsert({ key, payload, updated_at: stamp, expires_at: new Date(now + 36e5).toISOString() });
    if (saved.error) throw new Error("\uC870\uD68C \uC815\uBCF4\uB97C \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    await db.from("yes24_cache").delete().lt("expires_at", new Date(now - 864e5).toISOString());
    return { ...payload, fetchedAt: stamp };
  })();
  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
async function remember(item, knownId) {
  const fields = normalize(item);
  let existing = knownId ? { id: knownId } : null;
  if (!existing) {
    const r2 = await db.from("books").select("id").eq("yes24_id", fields.yes24_id).maybeSingle();
    if (r2.error) throw r2.error;
    existing = r2.data;
  }
  if (!existing && fields.isbn13) {
    const r2 = await db.from("books").select("id").eq("isbn13", fields.isbn13).limit(2);
    if (r2.error) throw r2.error;
    if (r2.data.length === 1) existing = r2.data[0];
  }
  if (!existing) {
    const r2 = await db.from("books").select("id,title,author,publisher").eq("title", fields.title).is("yes24_id", null);
    if (r2.error) throw r2.error;
    const matches = r2.data.filter((b) => exactMatch(b, [item]));
    if (matches.length === 1) existing = matches[0];
  }
  const r = existing ? await db.from("books").update(fields).eq("id", existing.id).select().single() : await db.from("books").insert({ ...fields, genres: [] }).select().single();
  if (r.error) {
    const retry = await db.from("books").select("*").eq("yes24_id", fields.yes24_id).maybeSingle();
    if (retry.data) return retry.data;
    throw r.error;
  }
  return r.data;
}
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = { "Access-Control-Allow-Origin": origins.includes(origin) ? origin : origins[0], "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type", "Access-Control-Allow-Methods": "POST,OPTIONS", "Vary": "Origin", "Content-Type": "application/json" };
  if (origin && !origins.includes(origin)) return new Response("{}", { status: 403, headers });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const send = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method !== "POST") return send({ error: "POST required" }, 405);
  try {
    const body = await req.json();
    const action = body.action;
    if (action === "search" || action === "chart") {
      const page = Number(body.page || 1);
      if (!Number.isInteger(page) || page < 1 || page > 1e4) return send({ error: "\uD398\uC774\uC9C0 \uBC94\uC704\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694." }, 400);
      const query = String(body.query || "").trim();
      if (action === "search" && (!query || query.length > 120)) return send({ error: "\uAC80\uC0C9\uC5B4\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694." }, 400);
      const result = await provider(action === "chart" ? "category/bestseller" : "goods/itemList", action === "chart" ? { categoryId: "001", page: String(page), pageSize: "15", detail: "Y" } : { query, category: "BOOK", page: String(page), pageSize: "15", detail: "Y" });
      return send({ books: result.items.map((i) => ({ ...normalize(i), id: "yes24-" + i.itemId, genres: [], rank: i.sortOrder })), total: result.total, fetchedAt: result.fetchedAt, page });
    }
    if (action === "detail") {
      const itemId = String(body.itemId || "");
      if (!/^\d{1,15}$/.test(itemId)) return send({ error: "\uC0C1\uD488 \uBC88\uD638\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694." }, 400);
      const result = await provider("goods/itemDetail", { searchType: "ItemId", query: itemId, detail: "Y" });
      if (!result.items[0]) return send({ error: "\uB3C4\uC11C \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404);
      return send({ book: await remember(result.items[0]) });
    }
    if (action === "resolve") {
      const bookId = String(body.bookId || "");
      if (!/^[0-9a-f-]{36}$/i.test(bookId)) return send({ error: "\uB3C4\uC11C ID\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694." }, 400);
      const r = await db.from("books").select("*").eq("id", bookId).single();
      if (r.error) return send({ error: "\uB3C4\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404);
      if (r.data.metadata_updated_at && Date.parse(r.data.metadata_updated_at) > Date.now() - 864e5) return send({ book: r.data });
      const result = r.data.yes24_id ? await provider("goods/itemDetail", { searchType: "ItemId", query: r.data.yes24_id, detail: "Y" }) : await provider("goods/itemList", { query: r.data.title, category: "BOOK", page: "1", pageSize: "20", detail: "Y" });
      const item = r.data.yes24_id ? result.items[0] : exactMatch(r.data, result.items);
      return send({ book: item ? await remember(item, bookId) : r.data, matched: !!item });
    }
    return send({ error: "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC694\uCCAD\uC785\uB2C8\uB2E4." }, 400);
  } catch (e) {
    return send({ error: e instanceof Error && /예스24|조회|설정/.test(e.message) ? e.message : "\uB3C4\uC11C \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694." }, 503);
  }
});
