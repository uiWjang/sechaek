import {
  init,
  $,
  $$,
  data,
  user,
  query,
  getBook,
  cover,
  esc,
  empty,
  save,
  remove,
  id,
  day,
  loadTables,
  attempt,
  busy,
  toast,
  money,
  safeUrl,
} from "./common.js";
attempt(async () => {
  await init();
  const b = await getBook(query.get("id"));
  if (!b) {
    $("#page-content").innerHTML = empty("도서를 찾을 수 없습니다.");
    return;
  }
  $("#book-cover").innerHTML = cover(b);
  $("#book-title").textContent = b.title;
  $("#book-author").textContent = b.author || "저자 미확인";
  $("#book-publisher").textContent = b.publisher || "출판사 미확인";
  $("#book-pages").textContent = b.pages ? b.pages + "쪽" : "전체 쪽수 미확인";
  $("#book-description").textContent =
    b.description || "등록된 책 소개가 없습니다.";
  const source = safeUrl(b.yes24_url, ["www.yes24.com"]);
  $("#book-source").hidden = !source;
  if (source) $("#book-source").href = source;
  const form = $("#register-form");
  let kind = "owned";
  form.elements.purchased_at.value = day();
  function registerState() {
    const exists = data.library_items.some(
      (l) => l.user_id === user?.id && l.book_id === b.id && l.kind === kind,
    );
    $("#purchase-fields").hidden = kind !== "owned";
    form.elements.price.required = form.elements.purchased_at.required =
      kind === "owned";
    $("#register-submit").disabled = exists;
    $("#register-submit").textContent = !user
      ? "로그인 후 등록"
      : exists
        ? "이미 등록한 책"
        : kind === "owned"
          ? "소장한 책으로 등록"
          : "찜하기";
  }
  $$("[data-kind]", form).forEach(
    (btn) =>
      (btn.onclick = () => {
        kind = btn.dataset.kind;
        $$("[data-kind]", form).forEach((x) =>
          x.classList.toggle("selected", x === btn),
        );
        registerState();
      }),
  );
  form.onsubmit = (e) => {
    e.preventDefault();
    if (!user) {
      location.href = "auth.html";
      return;
    }
    const fields = Object.fromEntries(new FormData(form));
    attempt(() =>
      busy(form, async () => {
        await save("library_items", {
          id: id(),
          user_id: user.id,
          book_id: b.id,
          kind,
          status: "planned",
          started_at: null,
          finished_at: null,
          store: kind === "owned" ? fields.store : null,
          price: kind === "owned" ? Number(fields.price) : null,
          purchased_at: kind === "owned" ? fields.purchased_at : null,
          is_public: false,
          read_pages: 0,
          rating: 0,
          genres: b.genres || [],
          format: "종이책",
          possession: kind === "owned" ? "소장" : "미소장",
        });
        await loadTables(["library_items"]);
        toast("서재에 등록했습니다.");
      }),
    ).then(registerState);
  };
  registerState();
  let format = "paper";
  const benefits = {};
  function prices() {
    const stored = data.store_prices.filter(
      (p) => p.book_id === b.id && p.format === format,
    );
    let rows = [...stored];
    if (
      format === "paper" &&
      b.list_price != null &&
      b.source_sale_price != null
    ) {
      rows = rows.filter((p) => p.store !== "예스24");
      rows.push({
        id: "yes24",
        store: "예스24",
        list_price: b.list_price,
        discount: Math.max(0, b.list_price - b.source_sale_price),
        coupon: 0,
        points: 0,
      });
    }
    if (!rows.length) {
      $("#price-table").innerHTML = empty("등록된 가격 정보가 없습니다.");
      return;
    }
    const net = (p) =>
      Math.max(
        0,
        p.list_price -
          p.discount -
          (benefits[p.id]?.coupon ?? p.coupon) -
          (benefits[p.id]?.points ?? p.points),
      );
    const low = Math.min(...rows.map(net));
    $("#price-table").innerHTML =
      "<table><thead><tr><th>서점</th><th>정가</th><th>할인</th><th>쿠폰</th><th>포인트</th><th>예상 결제액</th></tr></thead><tbody>" +
      rows
        .map(
          (p) =>
            `<tr class="${net(p) === low ? "lowest" : ""}"><td>${esc(p.store)}</td><td>${money(p.list_price)}</td><td>${money(p.discount)}</td><td><input aria-label="${esc(p.store)} 쿠폰" data-digits inputmode="numeric" maxlength="9" data-price="${p.id}" data-field="coupon" value="${benefits[p.id]?.coupon ?? p.coupon}"></td><td><input aria-label="${esc(p.store)} 포인트" data-digits inputmode="numeric" maxlength="9" data-price="${p.id}" data-field="points" value="${benefits[p.id]?.points ?? p.points}"></td><td>${money(net(p))}</td></tr>`,
        )
        .join("") +
      "</tbody></table>";
    $("#price-table").onchange = (e) => {
      if (!e.target.dataset.price) return;
      const k = e.target.dataset.price;
      benefits[k] = {
        ...benefits[k],
        [e.target.dataset.field]: Number(e.target.value),
      };
      prices();
    };
  }
  $$("[data-format]").forEach(
    (btn) =>
      (btn.onclick = () => {
        format = btn.dataset.format;
        $$("[data-format]").forEach((x) =>
          x.classList.toggle("selected", x === btn),
        );
        prices();
      }),
  );
  prices();
  const reviewForm = $("#review-form");
  reviewForm.hidden = !user;
  let mine = data.reviews.find(
    (r) => r.book_id === b.id && r.user_id === user?.id,
  );
  if (mine) {
    reviewForm.elements.content.value = mine.content;
    reviewForm.elements.rating.value = mine.rating;
    reviewForm.elements.visibility.value = mine.visibility;
  }
  function reviews() {
    $("#reviews").innerHTML =
      data.reviews
        .filter((r) => r.book_id === b.id)
        .map(
          (r) =>
            `<article class="review"><small>${esc(data.profiles.find((p) => p.id === r.user_id)?.nickname || "독자")} · ${r.rating}점 · ${day(r.created_at)}</small><p>${esc(r.content)}</p>${user?.id === r.user_id ? `<button class="text-button" data-delete-review="${r.id}">삭제</button>` : ""}</article>`,
        )
        .join("") || empty("볼 수 있는 리뷰가 없습니다.");
  }
  reviewForm.onsubmit = (e) => {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(reviewForm));
    attempt(() =>
      busy(reviewForm, async () => {
        await save("reviews", {
          id: mine?.id || id(),
          user_id: user.id,
          book_id: b.id,
          content: fields.content,
          rating: Number(fields.rating),
          visibility: fields.visibility,
          created_at: mine?.created_at || new Date().toISOString(),
        });
        await loadTables(["reviews"]);
        mine = data.reviews.find(
          (r) => r.book_id === b.id && r.user_id === user.id,
        );
        reviews();
        toast("리뷰를 저장했습니다.");
      }),
    );
  };
  $("#reviews").onclick = (e) => {
    const btn = e.target.closest("[data-delete-review]");
    if (!btn || !confirm("리뷰를 삭제할까요?")) return;
    attempt(async () => {
      await remove("reviews", btn.dataset.deleteReview);
      await loadTables(["reviews"]);
      mine = null;
      reviewForm.reset();
      reviews();
    });
  };
  reviews();
});
