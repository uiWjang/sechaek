// 공통 데이터/화면 도구. 화면 문구는 각 .html 파일에서 수정하세요.
import { createClient } from "../vendor/supabase.js";
import { config } from "./config.js";
export const db = createClient(config.url, config.key, {
  auth: { storageKey: "sechaek-html-auth" },
});
export const data = {};
export let user = null;
export const $ = (s, root = document) => root.querySelector(s),
  $$ = (s, root = document) => [...root.querySelectorAll(s)];
export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const id = () => crypto.randomUUID();
export const day = (v) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(v ? new Date(v) : new Date());
export const money = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
export const digits = (v) =>
  String(v)
    .replace(/[^0-9]/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 9);
export const statuses = {
  planned: "읽을 예정",
  reading: "읽는 중",
  finished: "완독",
  paused: "중단",
};
export const stores = ["교보문고", "알라딘", "예스24", "리디"];
export const genres = [
  "일상 소설",
  "대하소설",
  "고전",
  "SF(공상과학)",
  "판타지",
  "로맨스",
  "추리/스릴러",
  "무협",
  "공포/호러",
  "철학",
  "심리학",
  "정치",
  "역사/문화",
  "재테크",
  "마케팅",
  "자기계발",
  "IT",
  "자연과학",
  "공학",
  "음악",
  "미술",
  "여행/지침서",
  "취미",
  "건강/의학",
  "일상",
  "시집",
];
export const query = new URLSearchParams(location.search);
const tables = [
  "profiles",
  "books",
  "store_prices",
  "library_items",
  "reading_logs",
  "notes",
  "reviews",
  "follows",
  "bookmark_ledger",
  "shop_items",
  "room_items",
  "room_layout",
  "diary_entries",
  "guestbook_entries",
  "monthly_picks",
];
const privateTables = [
  "library_items",
  "reading_logs",
  "notes",
  "bookmark_ledger",
];
export const bookBy = (id) => data.books?.find((b) => b.id === id);
export const profileBy = (id) => data.profiles?.find((p) => p.id === id);
export const balance = () =>
  data.bookmark_ledger
    ?.filter((l) => l.user_id === user?.id)
    .reduce((n, l) => n + l.amount, 0) || 0;
export function safeUrl(value, hosts) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && (!hosts || hosts.includes(u.hostname))
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function icon(name) {
  const paths = {
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    logout: '<path d="M9 4H4v16h5M10 12h11m-5-5 5 5-5 5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    book: '<path d="M12 5C8 2 3 3 3 3v17s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v17"/>',
  };
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
}
export function avatar(p, small = false) {
  const url = safeUrl(p?.avatar_url);
  return `<span class="profile-avatar ${small ? "small" : ""}">${url ? `<img src="${esc(url)}" alt="${esc(p.nickname)} 프로필" loading="lazy">` : icon("user")}</span>`;
}
export function cover(b, small = false) {
  if (!b) return "";
  const url = safeUrl(b.cover_url, ["image.yes24.com"]);
  return `<div class="book-cover ${url ? "actual-cover" : ""} ${small ? "small" : ""}">${url ? `<img src="${esc(url)}" alt="${esc(b.title)} 표지" loading="lazy" decoding="async">` : `<div class="cover-ornament">${icon("book")}</div><strong>${esc(b.title)}</strong><span class="cover-author">${esc(b.author || "저자 미확인")}</span><span class="cover-bottom">${esc(b.publisher || "출판사 미확인")}</span>`}</div>`;
}
export function card(b) {
  return `<article class="book-card-wrap"><a class="book-card" href="book.html?id=${encodeURIComponent(b.id)}">${cover(b)}<span class="eyebrow">${esc((b.genres || []).join(" · "))}</span><h3>${esc(b.title)}</h3><p>${esc(b.author || "저자 미확인")}</p></a>${safeUrl(b.yes24_url, ["www.yes24.com"]) ? `<a class="tiny provider-link" target="_blank" rel="noreferrer" href="${esc(b.yes24_url)}">예스24 도서정보 ↗</a>` : ""}</article>`;
}
export function empty(text) {
  return `<div class="empty"><p>${esc(text)}</p></div>`;
}
export function progress(read, total) {
  return total
    ? Math.min(100, Math.max(0, Math.round((read / total) * 100)))
    : 0;
}
export const options = (values, selected = "") =>
  values
    .map(
      (v) =>
        `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(v)}</option>`,
    )
    .join("");
export function bookOptions(list, selected = "") {
  return (
    '<option value="">책 선택</option>' +
    list
      .map(
        (b) =>
          `<option value="${esc(b.id)}" ${b.id === selected ? "selected" : ""}>${esc(b.title)}</option>`,
      )
      .join("")
  );
}
export function error(e) {
  const el = $("#page-error");
  el.hidden = false;
  el.textContent = e?.message || String(e);
}
export function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 3500);
}
export async function attempt(fn) {
  try {
    return await fn();
  } catch (e) {
    error(e);
  }
}
export async function busy(form, fn) {
  if (form.dataset.busy) return;
  form.dataset.busy = "1";
  const controls = $$("button,input,select,textarea", form),
    states = controls.map((c) => c.disabled);
  controls.forEach((c) => (c.disabled = true));
  try {
    return await fn();
  } finally {
    controls.forEach((c, i) => (c.disabled = states[i]));
    delete form.dataset.busy;
  }
}
let writeLock = false;
export async function mutate(fn) {
  if (!user) throw Error("로그인 후 이용해 주세요.");
  if (writeLock) throw Error("저장 중입니다. 잠시 기다려 주세요.");
  writeLock = true;
  try {
    const r = await fn();
    if (r.error) throw r.error;
    return r.data;
  } finally {
    writeLock = false;
  }
}
export async function save(table, row) {
  if (table === "profiles")
    return mutate(() =>
      db
        .from(table)
        .update({
          nickname: row.nickname,
          intro: row.intro,
          ...("avatar_url" in row ? { avatar_url: row.avatar_url } : {}),
        })
        .eq("id", user.id),
    );
  return mutate(() => db.from(table).upsert(row));
}
export async function remove(table, rowId) {
  return mutate(() => db.from(table).delete().eq("id", rowId));
}
export async function rpc(name, args) {
  return mutate(() => db.rpc(name, args));
}
export async function loadTables(names = tables) {
  await Promise.all(
    names.map(async (table) => {
      if (!user && privateTables.includes(table)) {
        data[table] = [];
        return;
      }
      let rows = [];
      for (let start = 0; ; start += 500) {
        const r = await db
          .from(table)
          .select("*")
          .order("id")
          .range(start, start + 499);
        if (r.error) throw r.error;
        rows.push(...r.data);
        if (r.data.length < 500) break;
      }
      data[table] = rows;
    }),
  );
  updateHeader();
}
export async function catalog(body) {
  const r = await fetch("/api/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await r.json();
  if (!r.ok || result.error)
    throw Error(result.error || "도서 정보를 불러오지 못했습니다.");
  return result;
}
export async function getBook(bookId) {
  let b = bookBy(bookId);
  if (bookId?.startsWith("yes24-")) {
    b = (await catalog({ action: "detail", itemId: bookId.slice(6) })).book;
  } else if (b && !b.cover_url) {
    try {
      b = (await catalog({ action: "resolve", bookId })).book;
    } catch {}
  }
  if (b) {
    data.books = data.books.filter((x) => x.id !== b.id).concat(b);
  }
  return b;
}
export function requireUser() {
  if (user) return true;
  $("#page-content").innerHTML =
    empty("로그인 후 이용해 주세요.") +
    '<a class="button" href="auth.html">로그인 / 회원가입</a>';
  return false;
}
export function openDialog(title, html) {
  $("#dialog-title").textContent = title;
  $("#dialog-body").innerHTML = html;
  $("#generic-dialog").showModal();
  return $("#dialog-body");
}
export function updateHeader() {
  $("#balance").textContent = user ? balance().toLocaleString() : "—";
  $("#logout").hidden = !user;
  $("#login-link").hidden = !!user;
}
export async function init() {
  $$("[data-icon]").forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  $$("#main-nav a").forEach((a) => {
    if (a.pathname === location.pathname) a.classList.add("active");
  });
  document.addEventListener("input", (e) => {
    if (e.target.matches("[data-digits]"))
      e.target.value = digits(e.target.value);
  });
  document.addEventListener(
    "error",
    (e) => {
      if (e.target.tagName === "IMG") {
        e.target.hidden = true;
        const p = e.target.parentElement;
        if (!p.querySelector(".image-fallback")) {
          const t = document.createElement("span");
          t.className = "image-fallback";
          t.textContent = e.target.alt;
          p.append(t);
        }
      }
    },
    true,
  );
  $$("[data-stores]").forEach((el) => (el.innerHTML = options(stores)));
  $$("[data-rating]").forEach(
    (el) =>
      (el.innerHTML = Array.from(
        { length: 6 },
        (_, i) => `<option value="${i}">${i}점</option>`,
      ).join("")),
  );
  $$("[data-visibility]").forEach(
    (el) =>
      (el.innerHTML =
        '<option value="private">나만 보기</option><option value="followers">친구(팔로워)</option><option value="public">전체 공개</option>'),
  );
  $$("[data-close]").forEach(
    (b) =>
      (b.onclick = () => {
        const d = b.closest("dialog");
        if (!d.querySelector("[data-busy]")) d.close();
      }),
  );
  $$("dialog").forEach((d) =>
    d.addEventListener("cancel", (e) => {
      if (d.querySelector("[data-busy]")) e.preventDefault();
    }),
  );
  $("#menu-button").onclick = () => {
    const open = $("#main-nav").classList.toggle("open");
    $("#menu-button").setAttribute("aria-expanded", open);
  };
  $("#notifications").onclick = () => toast("새로운 알림이 없습니다.");
  $("#logout").onclick = () =>
    attempt(async () => {
      const r = await db.auth.signOut();
      if (r.error) throw r.error;
      location.href = "index.html";
    });
  $("#ledger-button").onclick = () =>
    openDialog(
      "나의 책갈피",
      user
        ? `<h2>${balance().toLocaleString()}개</h2><p>독서 기록 +3 · 완독 +10</p><div class="ledger-list">${
            [...data.bookmark_ledger]
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .map(
                (l) =>
                  `<div><span>${esc(l.reason)}<small>${day(l.created_at)}</small></span><b>${l.amount > 0 ? "+" : ""}${l.amount}</b></div>`,
              )
              .join("") || empty("아직 적립 내역이 없습니다.")
          }</div>`
        : "<p>로그인하면 보유 책갈피를 확인할 수 있어요.</p>",
    );
  try {
    const r = await db.auth.getSession();
    if (r.error) throw r.error;
    user = r.data.session?.user || null;
    await loadTables();
  } catch (e) {
    error(e);
    $("#page-error").insertAdjacentHTML(
      "beforeend",
      ' <button onclick="location.reload()">다시 시도</button>',
    );
    throw e;
  } finally {
    $("#page-loading").hidden = true;
    $("#page-content").hidden = false;
  }
}
// 실제 저장은 동일한 Supabase RLS를 통과합니다. 비밀번호·관리자 키를 소스에 넣지 않습니다.
export function editProfile(onSaved = () => location.reload()) {
  const p = profileBy(user?.id);
  if (!p) return;
  const dialog = $("#profile-dialog"),
    form = $("#profile-form");
  let file = null,
    removePhoto = false,
    previewUrl = null;
  form.reset();
  form.elements.nickname.value = p.nickname;
  form.elements.intro.value = p.intro || "";
  $("#profile-error").textContent = "";
  $("#photo-name").textContent = "";
  $("#photo-preview").innerHTML = avatar(p);
  const clean = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  };
  dialog.addEventListener("close", clean, { once: true });
  $("#photo-picker").onclick = () => $("#photo-file").click();
  $("#photo-file").onchange = (e) => {
    const next = e.target.files[0];
    e.target.value = "";
    if (!next) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(next.type) ||
      next.size > 10 * 1024 * 1024
    ) {
      $("#profile-error").textContent =
        "10MB 이하의 JPG, PNG, WebP 사진을 선택해 주세요.";
      return;
    }
    clean();
    file = next;
    previewUrl = URL.createObjectURL(file);
    $("#photo-preview").innerHTML =
      `<span class="profile-avatar"><img src="${previewUrl}" alt="선택한 사진"></span>`;
    $("#photo-name").textContent = file.name;
    removePhoto = false;
    $("#profile-error").textContent = "";
  };
  $("#reset-profile-photo").onclick = () => {
    removePhoto = true;
    {
      file = null;
      clean();
      $("#photo-preview").innerHTML = avatar({ ...p, avatar_url: null });
      $("#photo-name").textContent = "";
    }
    $("#photo-name").textContent = "저장하면 기본 프로필 사진으로 변경됩니다.";
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const nickname = form.elements.nickname.value.trim(),
      intro = form.elements.intro.value.trim(),
      removed = removePhoto;
    if (!nickname) return;
    await busy(form, async () => {
      let path = null;
      try {
        let avatar_url = removed ? null : p.avatar_url;
        if (file) {
          const image = await createImageBitmap(file),
            canvas = document.createElement("canvas");
          canvas.width = canvas.height = 256;
          const side = Math.min(image.width, image.height);
          canvas
            .getContext("2d")
            .drawImage(
              image,
              (image.width - side) / 2,
              (image.height - side) / 2,
              side,
              side,
              0,
              0,
              256,
              256,
            );
          image.close();
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/webp", 0.85),
          );
          if (!blob) throw Error("사진을 처리하지 못했습니다.");
          path = `${user.id}/${id()}.webp`;
          const r = await db.storage
            .from("avatars")
            .upload(path, blob, { contentType: "image/webp" });
          if (r.error) throw r.error;
          avatar_url = db.storage.from("avatars").getPublicUrl(path)
            .data.publicUrl;
        }
        await save("profiles", { id: p.id, nickname, intro, avatar_url });
        await loadTables(["profiles"]);
        dialog.close();
        toast("프로필을 저장했습니다.");
        onSaved();
      } catch (e) {
        if (path) await db.storage.from("avatars").remove([path]);
        $("#profile-error").textContent = e.message;
      }
    });
  };
  $('#delete-account').onclick = () => {
    const confirmation = document.createElement('dialog');
    confirmation.className = 'modal account-delete-dialog';
    confirmation.innerHTML = `<h2>정말 탈퇴하시겠어요?</h2><p>계정, 프로필 사진, 서재, 독서 기록·노트, 리뷰, 미니홈피와 책갈피 내역이 삭제됩니다. 삭제 후에는 복구할 수 없습니다.</p><p class="auth-error" role="alert"></p><div class="row"><button type="button" class="secondary-button" data-cancel>취소</button><button type="button" class="button danger-button" data-confirm>탈퇴하고 데이터 삭제</button></div>`;
    document.body.append(confirmation);
    confirmation.addEventListener('close',()=>confirmation.remove(),{once:true});
    confirmation.querySelector('[data-cancel]').onclick=()=>confirmation.close();
    confirmation.querySelector('[data-confirm]').onclick=()=>busy(confirmation,async()=>{
      const preventClose=e=>e.preventDefault();
      confirmation.addEventListener('cancel',preventClose);
      try {
        await deleteOwnAccount();
        await db.auth.signOut({scope:'local'});
        location.replace('auth.html?withdrawn=1');
      } catch(e) {confirmation.querySelector('[role=alert]').textContent=e.message || '탈퇴하지 못했습니다. 다시 시도해 주세요.';}
      finally {confirmation.removeEventListener('cancel',preventClose);}
    });
    confirmation.showModal();
    confirmation.querySelector('[data-cancel]').focus();
  };
  dialog.showModal();
}

export async function deleteOwnAccount() {
  if (!user) throw Error('로그인 후 이용해 주세요.');
  // Preflight avoids deleting photos before the server endpoint is installed.
  await rpc('delete_my_account', {p_confirm:false});
  const bucket = db.storage.from('avatars');
  while (true) {
    const result = await bucket.list(user.id, {limit:100,offset:0});
    if (result.error) throw result.error;
    const paths = (result.data || []).filter(f=>f.id).map(f=>`${user.id}/${f.name}`);
    if (!paths.length) break;
    const removed = await bucket.remove(paths);
    if (removed.error) throw removed.error;
  }
  await rpc('delete_my_account', {p_confirm:true});
}

