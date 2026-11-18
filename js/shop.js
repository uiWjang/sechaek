import {
  init,
  $,
  $$,
  data,
  user,
  balance,
  esc,
  empty,
  rpc,
  loadTables,
  attempt,
  busy,
  toast,
} from "./common.js";
import { art } from "./art.js";
attempt(async () => {
  await init();
  const requestedTheme = new URLSearchParams(location.search).get("theme");
  let theme = ["추리", "SF", "로맨스", "판타지"].includes(requestedTheme)
    ? requestedTheme
    : "추리";
  function render() {
    $$("#shop-tabs [data-theme]").forEach((b) =>
      b.classList.toggle("selected", b.dataset.theme === theme),
    );
    const order = [
      "wall",
      "sofa",
      "chair",
      "desk",
      "plant",
      "lamp",
      "shelf",
      "frame",
      "floor",
      "clock",
      "rug",
      "outfit",
    ];
    const items = data.shop_items
        .filter((i) => i.theme === theme && !["floor", "outfit", "frame", "clock"].includes(i.shape))
        .sort((a, b) => order.indexOf(a.shape) - order.indexOf(b.shape)),
      owned = data.room_items
        .filter((i) => i.user_id === user?.id)
        .map((i) => i.item_id),
      price = Math.ceil(
        items
          .filter((i) => !owned.includes(i.id))
          .reduce((n, i) => n + i.price, 0) * 0.8,
      ),
      amount = balance();
    $("#shop-balance").textContent = amount.toLocaleString() + " 책갈피";
    $("#set-title").textContent =
      {
        로맨스: "햇살 서재",
        판타지: "숲속 다락방",
        추리: "책 읽는 기차",
        SF: "물가의 캠핑",
      }[theme] +
      " · " +
      theme +
      " 세트";
    const preview = $('#set-preview-image');
    const previewKey = {로맨스:'library',추리:'train',판타지:'attic',SF:'camp'}[theme];
    const previewSrc = 'assets/set-previews/' + previewKey + '.png';
    if (preview.getAttribute('src') !== previewSrc) {
      preview.src = previewSrc;
      preview.alt = $('#set-title').textContent + ' 연출 미리보기';
    }
    $("#set-price").textContent = price + " 책갈피";
    $("#buy-set").disabled = !!user && (price === 0 || amount < price);
    $("#buy-set").textContent = !user
      ? "로그인 후 구매"
      : price === 0
        ? "모두 보유 중"
        : amount < price
          ? "책갈피 부족"
          : "세트 구매";
    $("#shop-list").innerHTML =
      items
        .map(
          (i) =>
            `<article class="shop-card" data-shape="${i.shape}"><div class="shop-art">${art(i.shape, i.theme)}<span class="price-tag">${i.price} 책갈피</span></div><div class="shop-card-body"><span class="eyebrow">${esc({ plant: "화분", lamp: "조명", chair: "의자", sofa: "소파", desk: "책상", rug: "카펫", wall: "방 테마 · 가구 별도" }[i.shape] || i.category)}</span><h3>${esc(i.name)}</h3>${i.shape === "wall" ? '<p class="tiny">벽·바닥·창문 등 빈 공간입니다. 가구는 각각 구매해 배치하세요.</p>' : ""}<button data-buy="${i.id}" class="${owned.includes(i.id) ? "secondary-button" : "button"}" ${user && (owned.includes(i.id) || amount < i.price) ? "disabled" : ""}>${!user ? "로그인 후 구매" : owned.includes(i.id) ? "보유 중" : amount < i.price ? "책갈피 부족" : "구매하기"}</button></div></article>`,
        )
        .join("") || empty("준비된 아이템이 없습니다.");
  }
  async function buy(item) {
    if (!user) {
      location.href = "auth.html";
      return;
    }
    await busy($("#page-content"), async () => {
      await rpc("buy_items", { p_item: item, p_theme: item ? null : theme });
      await loadTables(["room_items", "bookmark_ledger"]);
    });
    render();
    $("#purchase-stamp").hidden = false;
    setTimeout(() => ($("#purchase-stamp").hidden = true), 1300);
    toast("보유 아이템에 추가되었습니다.");
  }
  $("#shop-tabs").onclick = (e) => {
    if (!e.target.dataset.theme) return;
    theme = e.target.dataset.theme;
    $$("[data-theme]").forEach((b) =>
      b.classList.toggle("selected", b === e.target),
    );
    render();
  };
  $("#buy-set").onclick = () => attempt(() => buy(null));
  $("#shop-list").onclick = (e) => {
    const btn = e.target.closest("[data-buy]");
    if (btn) attempt(() => buy(btn.dataset.buy));
  };
  const preview = $('#set-preview-image');
  preview.tabIndex = 0;
  preview.setAttribute('role','button');
  const showPreview = () => {
    const modal=document.createElement('dialog');
    modal.className='shop-image-dialog';
    modal.setAttribute('aria-label',preview.alt+' 확대');
    const close=document.createElement('button');
    close.type='button';close.className='image-close';close.textContent='×';close.setAttribute('aria-label','닫기');
    const image=document.createElement('img');image.src=preview.src;image.alt=preview.alt;
    modal.append(close,image);document.body.append(modal);
    close.onclick=()=>modal.close();
    modal.onclick=e=>{if(e.target===modal)modal.close();};
    modal.addEventListener('close',()=>{modal.remove();preview.focus();},{once:true});
    modal.showModal();close.focus();
  };
  preview.onclick=showPreview;
  preview.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showPreview();}};
  render();
});
