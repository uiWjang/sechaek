import { init, $, query, catalog, card, empty, attempt } from "./common.js";
let page = Math.max(1, Number(query.get("page")) || 1),
  generation = 0;
const q = query.get("q") || "";
async function render() {
  const current = ++generation;
  $("#search-results").innerHTML = empty("불러오는 중입니다.");
  $("#pagination").innerHTML = "";
  try {
    const r = await catalog({ action: q ? "search" : "chart", query: q, page });
    if (current !== generation) return;
    const total = Math.max(1, Math.ceil(r.total / 15));
    if (page > total) {
      page = total;
      return render();
    }
    $("#search-count").textContent =
      `${r.total.toLocaleString()}권 · ${page}페이지`;
    $("#search-results").innerHTML =
      r.books.map(card).join("") || empty("검색 결과가 없습니다.");
    if (!r.books.length) return;
    const first = Math.floor((page - 1) / 8) * 8 + 1;
    $("#pagination").innerHTML =
      `<button data-page="${first - 8}" ${first === 1 ? "disabled" : ""}>이전</button>` +
      Array.from({ length: Math.min(8, total - first + 1) }, (_, i) => {
        let n = first + i;
        return `<button data-page="${n}" class="${n === page ? "current-page" : ""}" ${n === page ? 'aria-current="page"' : ""}>${n}</button>`;
      }).join("") +
      `<button data-page="${first + 8}" ${first + 8 > total ? "disabled" : ""}>다음</button>`;
    $("#pagination").onclick = (e) => {
      let b = e.target.closest("[data-page]");
      if (!b || b.disabled) return;
      page = Number(b.dataset.page);
      const url = new URL(location.href);
      url.searchParams.set("page", page);
      history.replaceState(null, "", url);
      render();
    };
  } catch (e) {
    if (current !== generation) return;
    $("#search-results").innerHTML =
      empty(e.message) + '<button id="retry-search">다시 시도</button>';
    $("#retry-search").onclick = render;
  }
}
attempt(async () => {
  await init();
  $("#search-title").textContent = q ? "책 검색" : "인기차트 전체 목록";
  $("#search-form").elements.q.value = q;
  $("#search-form").onsubmit = (e) => {
    e.preventDefault();
    location.href =
      "search.html?q=" +
      encodeURIComponent($("#search-form").elements.q.value.trim());
  };
  await render();
});
