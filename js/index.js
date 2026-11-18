import {
  init,
  $,
  data,
  user,
  profileBy,
  bookBy,
  avatar,
  cover,
  esc,
  day,
  empty,
  catalog,
  editProfile,
  attempt,
} from "./common.js";
async function start() {
  await init();
  const me = profileBy(user?.id);
  $("#home-profile").innerHTML = me
    ? `<button class="profile-avatar-button" id="edit-profile" aria-label="프로필 설정">${avatar(me)}</button><div class="home-profile-details"><h2>${esc(me.nickname)}</h2><button class="text-button profile-edit" id="edit-profile-text">프로필 수정</button></div>`
    : "<h2>로그인</h2>";
  if (me) {
    $("#edit-profile").onclick = $("#edit-profile-text").onclick = () =>
      editProfile();
  } else {
    $("#library-link").href = "auth.html";
    $("#library-link").textContent = "로그인 / 회원가입";
  }
  const logs = data.reading_logs
    .filter((l) => l.user_id === user?.id)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const latest = logs.find((l) =>
      data.library_items.some((i) => i.id === l.library_item_id),
    ),
    item = data.library_items.find((i) => i.id === latest?.library_item_id),
    book = bookBy(item?.book_id);
  if (book)
    $("#last-book").innerHTML =
      `<a href="notebook.html?id=${item.id}" class="current-book">${cover(book, true)}<div><small>마지막에 기록한 책</small><h3>${esc(book.title)}</h3><span>${item.read_pages}쪽 / ${book.pages || "미확인"}쪽</span><small class="last-record-date">${day(latest.created_at)} 기록</small></div></a>`;
  const quote = data.diary_entries.find(
    (d) => d.user_id === user?.id && d.is_featured,
  );
  $("#daily-quote").innerHTML = quote
    ? `<blockquote>${esc(quote.content)}</blockquote>`
    : "<p>등록된 대표 문장이 없습니다.</p>";
  $("#recommended-readers").innerHTML =
    data.profiles
      .filter((p) => p.id !== user?.id)
      .slice(0, 2)
      .map(
        (p) =>
          `<a href="room.html?id=${p.id}">${avatar(p, true)}<span>${esc(p.nickname)}</span>↗</a>`,
      )
      .join("") || empty("아직 등록된 독자가 없습니다.");
  const today = day(),
    [year, month] = today.split("-").map(Number),
    days = new Date(year, month, 0).getDate(),
    offset = new Date(year, month - 1, 1).getDay();
  $("#calendar-month").textContent = `${year}. ${month}`;
  $("#calendar-grid").innerHTML =
    ["일", "월", "화", "수", "목", "금", "토"]
      .map((d) => `<b>${d}</b>`)
      .join("") +
    "<span></span>".repeat(offset) +
    Array.from({ length: days }, (_, i) => {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      return `<button class="${date === today ? "today" : ""} ${logs.some((l) => day(l.created_at) === date) ? "recorded" : ""}" data-date="${date}" aria-label="${date}">${i + 1}</button>`;
    }).join("");
  function selectDate(date) {
    $("#calendar-grid")
      .querySelectorAll("button")
      .forEach((b) => {
        b.classList.toggle("selected-date", b.dataset.date === date);
        b.setAttribute("aria-pressed", b.dataset.date === date);
      });
    $("#calendar-records").innerHTML =
      `<h4>${date} 기록</h4>` +
      (logs
        .filter((l) => day(l.created_at) === date)
        .map((l) => {
          const i = data.library_items.find((i) => i.id === l.library_item_id);
          return `<a href="notebook.html?id=${l.library_item_id}"><strong>${esc(bookBy(i?.book_id)?.title || "도서 기록")}</strong><small>${l.pages}쪽 · ${esc(l.content)}</small></a>`;
        })
        .join("") || '<p class="tiny">이 날짜에는 독서 기록이 없습니다.</p>');
  }
  selectDate(today);
  $("#calendar-grid").onclick = (e) => {
    const b = e.target.closest("[data-date]");
    if (b) selectDate(b.dataset.date);
  };
  async function chart() {
    const list = $("#home-chart");
    list.innerHTML = empty("도서를 불러오는 중입니다.");
    try {
      const r = await catalog({ action: "chart", page: 1 });
      list.innerHTML =
        r.books
          .map(
            (b, i) =>
              `<li><a class="shelf-book-link" href="book.html?id=${b.id}"><span class="rank">${i + 1}</span>${cover(b, true)}<div class="shelf-book-info"><h3>${esc(b.title)}</h3><p>${esc(b.author)} · ${esc(b.publisher)}</p></div></a><a class="tiny provider-link" href="${esc(b.yes24_url)}" target="_blank" rel="noreferrer">예스24 상품 ↗</a></li>`,
          )
          .join("") || empty("도서가 없습니다.");
      $("#chart-source").textContent = "도서정보·표지 제공: 예스24";
    } catch (e) {
      list.innerHTML =
        empty(e.message) + '<button id="retry-chart">다시 시도</button>';
      $("#retry-chart").onclick = chart;
    }
  }
  await chart();
}
attempt(start);
