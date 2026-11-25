import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../js/common.js", import.meta.url), "utf8");
const catalogSource = source.slice(source.indexOf("export async function catalog("), source.indexOf("export async function getBook(")).replace("export ", "");

for (const [hostname, port, endpoint] of [
  ["uiwjang.github.io", "", "https://example.supabase.co/functions/v1/yes24"],
  ["127.0.0.1", "5174", "/api/catalog"],
]) {
  test(`catalog routes correctly on ${hostname}`, async () => {
    let request;
    const context = vm.createContext({
      location: { hostname, port },
      config: { url: "https://example.supabase.co", key: "public-key" },
      fetch: async (url, options) => {
        request = { url, options };
        return { ok: true, json: async () => ({ books: [{ title: "책" }] }) };
      },
    });
    vm.runInContext(catalogSource, context);
    const result = await context.catalog({ action: "chart", page: 1 });
    assert.equal(request.url, endpoint);
    assert.equal(request.options.method, "POST");
    assert.deepEqual(JSON.parse(request.options.body), { action: "chart", page: 1 });
    assert.equal(request.options.headers.apikey, port === "5174" ? undefined : "public-key");
    assert.equal(result.books[0].title, "책");
  });
}
