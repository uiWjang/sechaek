import {
  init,
  $,
  $$,
  data,
  user,
  query,
  requireUser,
  bookBy,
  cover,
  esc,
  empty,
  genres,
  progress,
  save,
  remove,
  rpc,
  id,
  day,
  loadTables,
  attempt,
  busy,
  toast,
  digits,
} from "./common.js";
attempt(async () => {
  await init();
  if (!requireUser()) return;
  let item = data.library_items.find(
    (l) => l.id === query.get("id") && l.user_id === user.id,
  );
  if (!item) {
    $("#page-content").innerHTML = empty("이 독서 기록에 접근할 수 없습니다.");
    return;
  }
  const b = bookBy(item.book_id);
  if (!b) throw Error("책 정보를 찾을 수 없습니다.");
  let note = data.notes.find(
    (n) => n.book_id === b.id && n.user_id === user.id,
  ) || {
    id: id(),
    user_id: user.id,
    book_id: b.id,
    summary: "",
    story: "",
    impression: "",
    quotes: [],
  };
  $("#notebook-title").textContent = b.title;
  $("#note-cover").innerHTML = cover(b);
  $("#note-facts").innerHTML =
    `<dt>저자</dt><dd>${esc(b.author)}</dd><dt>출판사</dt><dd>${esc(b.publisher)}</dd><dt>전체 쪽수</dt><dd>${b.pages || "미확인"}</dd>`;
  $("#genres").innerHTML = genres
    .map(
      (g) =>
        `<label><input type="checkbox" form="info-form" name="genres" value="${esc(g)}" ${(item.genres || []).includes(g) ? "checked" : ""}>${g}</label>`,
    )
    .join("");
  const nf = $("#note-form"),
    info = $("#info-form");
  for (const key of ["summary", "story", "impression"])
    nf.elements[key].value = note[key] || "";
  let quotes = structuredClone(note.quotes || []);
  function quoteRows() {
    $("#quotes").innerHTML = quotes
      .map(
        (q, i) =>
          `<div class="quote-entry" data-index="${i}"><label>문장<textarea data-field="text" maxlength="2000">${esc(q.text)}</textarea></label><label>페이지<input inputmode="numeric" data-digits data-field="page" value="${esc(q.page)}"></label><label>내 생각<textarea data-field="thought" maxlength="2000">${esc(q.thought)}</textarea></label><button type="button" class="text-button" data-remove-quote="${i}">문장 삭제</button></div>`,
      )
      .join("");
  }
  $("#quotes").oninput = (e) => {
    const row = e.target.closest("[data-index]");
    if (row && e.target.dataset.field)
      quotes[Number(row.dataset.index)][e.target.dataset.field] =
        e.target.dataset.field === "page"
          ? digits(e.target.value)
          : e.target.value;
  };
  $("#quotes").onclick = (e) => {
    if (e.target.dataset.removeQuote === undefined) return;
    quotes.splice(Number(e.target.dataset.removeQuote), 1);
    quoteRows();
  };
  $("#add-quote").onclick = () => {
    quotes.push({ text: "", page: "", thought: "" });
    quoteRows();
  };
  quoteRows();
  nf.onsubmit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(nf));
    attempt(() =>
      busy(nf, async () => {
        note = {
          ...note,
          summary: f.summary,
          story: f.story,
          impression: f.impression,
          quotes,
        };
        await save("notes", note);
        toast("비공개 노트를 저장했습니다.");
      }),
    );
  };
  for (const key of [
    "status",
    "read_pages",
    "started_at",
    "finished_at",
    "rating",
    "store",
    "price",
    "purchased_at",
    "format",
    "possession",
  ])
    info.elements[key].value = item[key] ?? "";
  info.elements.is_public.checked = item.is_public;
  $("#owned-info").hidden = item.kind !== "owned";
  function showProgress() {
    $("#reading-progress").innerHTML =
      `<span class="tiny">${b.pages ? "진행률 " + progress(Number(info.elements.read_pages.value), b.pages) + "%" : "전체 쪽수 미확인"}</span><div class="progress"><span style="width:${progress(Number(info.elements.read_pages.value), b.pages)}%"></span></div>`;
  }
  info.elements.read_pages.oninput = () => queueMicrotask(showProgress);
  info.elements.status.onchange = (e) => {
    if (e.target.value === "finished" && !info.elements.finished_at.value)
      info.elements.finished_at.value = day();
    if (e.target.value !== "finished") info.elements.finished_at.value = "";
    if (e.target.value === "reading" && !info.elements.started_at.value)
      info.elements.started_at.value = day();
  };
  showProgress();
  info.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(info),
      read = Number(f.get("read_pages"));
    attempt(() =>
      busy(info, async () => {
        if (b.pages && read > b.pages)
          throw Error("읽은 페이지는 전체 쪽수 이하로 입력하세요.");
        if (
          f.get("started_at") &&
          f.get("finished_at") &&
          f.get("started_at") > f.get("finished_at")
        )
          throw Error("완독일은 시작일 이후여야 합니다.");
        item = {
          ...item,
          status: f.get("status"),
          read_pages: read,
          started_at: f.get("started_at") || null,
          finished_at: f.get("finished_at") || null,
          rating: Number(f.get("rating")),
          store: f.get("store") || null,
          price: f.get("price") === "" ? null : Number(f.get("price")),
          purchased_at: f.get("purchased_at") || null,
          format: f.get("format"),
          possession: f.get("possession"),
          genres: f.getAll("genres"),
          is_public: f.has("is_public"),
        };
        await save("library_items", item);
        await loadTables(["library_items", "bookmark_ledger"]);
        toast("독서 정보를 저장했습니다.");
      }),
    );
  };
  function logs() {
    $("#logs").innerHTML =
      data.reading_logs
        .filter((l) => l.library_item_id === item.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(
          (l) =>
            `<div class="log-entry"><small>${day(l.created_at)} · ${l.pages}쪽</small><p>${esc(l.content)}</p><button class="text-button" data-delete-log="${l.id}">삭제</button></div>`,
        )
        .join("") || '<p class="tiny">독서 기록이 없습니다.</p>';
  }
  const lf = $("#log-form");
  lf.onsubmit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(lf));
    attempt(() =>
      busy(lf, async () => {
        await rpc("add_reading_log", {
          p_library: item.id,
          p_pages: Number(f.pages),
          p_content: f.content,
        });
        await loadTables(["reading_logs", "bookmark_ledger"]);
        lf.reset();
        logs();
        toast("독서 기록을 남겼습니다.");
      }),
    );
  };
  $("#logs").onclick = (e) => {
    const btn = e.target.closest("[data-delete-log]");
    if (
      !btn ||
      !confirm("이 기록을 삭제할까요? 이미 적립된 책갈피는 유지됩니다.")
    )
      return;
    attempt(async () => {
      await remove("reading_logs", btn.dataset.deleteLog);
      await loadTables(["reading_logs"]);
      logs();
    });
  };
  logs();
});
