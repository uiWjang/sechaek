import {
  init,
  $,
  $$,
  data,
  user,
  requireUser,
  bookBy,
  cover,
  esc,
  empty,
  statuses,
  progress,
  remove,
  loadTables,
  attempt,
  toast,
} from "./common.js";
attempt(async () => {
  await init();
  if (!requireUser()) return;
  let kind = "owned";
  function render() {
    const q = $("#library-query").value.trim(),
      status = $("#library-status").value;
    const list = data.library_items.filter(
      (l) =>
        l.user_id === user.id &&
        l.kind === kind &&
        (!status || l.status === status) &&
        ((bookBy(l.book_id)?.title || "").includes(q) ||
          (bookBy(l.book_id)?.author || "").includes(q)),
    );
    $("#library-list").innerHTML =
      list
        .map((l) => {
          const b = bookBy(l.book_id);
          if (!b) return "";
          return `<article class="library-card"><a href="book.html?id=${b.id}">${cover(b, true)}</a><div><span class="chip">${statuses[l.status]}</span><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><div class="progress"><span style="width:${progress(l.read_pages, b.pages)}%"></span></div><small>${l.read_pages}쪽 / ${b.pages || "미확인"}쪽</small><p><a class="text-button" href="notebook.html?id=${l.id}">독서 노트 ↗</a></p><button class="text-button" data-remove="${l.id}">서재에서 삭제</button></div></article>`;
        })
        .join("") || empty("등록된 책이 없습니다.");
  }
  $$("[data-kind]").forEach(
    (b) =>
      (b.onclick = () => {
        kind = b.dataset.kind;
        $$("[data-kind]").forEach((x) =>
          x.classList.toggle("selected", x === b),
        );
        render();
      }),
  );
  $("#library-query").oninput = $("#library-status").onchange = render;
  $("#library-list").onclick = (e) => {
    const b = e.target.closest("[data-remove]");
    if (!b || !confirm("서재 등록과 연결된 독서 기록을 삭제할까요?")) return;
    attempt(async () => {
      b.disabled = true;
      try {
        await remove("library_items", b.dataset.remove);
        await loadTables(["library_items", "reading_logs", "bookmark_ledger"]);
        render();
        toast("삭제했습니다.");
      } finally {
        b.disabled = false;
      }
    });
  };
  render();
});
