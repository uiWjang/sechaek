import {
  init,
  $,
  $$,
  data,
  db,
  user,
  query,
  profileBy,
  bookBy,
  avatar,
  cover,
  esc,
  empty,
  id,
  day,
  save,
  remove,
  rpc,
  loadTables,
  attempt,
  busy,
  toast,
  editProfile,
  openDialog,
  bookOptions,
} from "./common.js";
import { art } from "./art.js";
import { mountRoomMotion } from "./room-motion.js";
attempt(async () => {
  await init();
  const ownerId = query.get("id") || user?.id,
    owner = profileBy(ownerId),
    mine = ownerId === user?.id;
  if (!owner) {
    $("#page-content").innerHTML =
      empty(
        user
          ? "이 독자의 방을 찾을 수 없습니다."
          : "로그인 후 내 미니홈피를 확인할 수 있습니다.",
      ) + '<a class="button" href="auth.html">로그인</a>';
    return;
  }
  $("#room-title").textContent = owner.nickname + "의 미니홈피";
  $("#room-photo").innerHTML = avatar(owner);
  $("#room-nickname").textContent = owner.nickname;
  $("#room-intro").textContent = owner.intro || "등록된 자기소개가 없습니다.";
  $("#room-profile-settings").hidden = !mine;
  $("#room-profile-settings").onclick = () => editProfile();
  function featured() {
    const f = data.diary_entries.find(
      (d) => d.user_id === ownerId && d.is_featured,
    );
    $("#featured-quote").innerHTML = f
      ? `<blockquote>“${esc(f.content)}”<small>${esc(bookBy(f.book_id)?.title)}</small></blockquote>`
      : '<p class="tiny">아직 볼 수 있는 대표 문장이 없습니다.</p>';
  }
  const friends = data.profiles.filter((p) =>
    data.follows.some(
      (f) => f.follower_id === ownerId && f.following_id === p.id,
    ),
  );
  $("#friends-count").textContent = friends.length;
  $("#friends").innerHTML =
    friends
      .map(
        (p) =>
          `<li><a href="room.html?id=${p.id}">${avatar(p, true)}<span>${esc(p.nickname)}</span>↗</a></li>`,
      )
      .join("") || '<li class="tiny">아직 팔로우한 친구가 없습니다.</li>';
  async function counts() {
    if (user && !mine) {
      const r = await db.rpc("visit_room", { p_owner: ownerId });
      if (r.error) throw r.error;
    }
    const r = await db.rpc("visit_counts", { p_owner: ownerId });
    if (r.error) throw r.error;
    $("#visit-count").innerHTML =
      `오늘 ${Number(r.data.today) || 0} · 전체 ${Number(r.data.total) || 0}<small>로그인 독자 · 하루 1회</small>`;
  }
  counts().catch(
    () => ($("#visit-count").textContent = "방문자 수를 불러오지 못했습니다."),
  );
  let saving = false;
  let inventoryOpen = true, selectedFurniture = null, inventoryKind = "all", inventoryHeight = 280;
  const depth = (p, rug=false) => Number.isFinite(p.z) ? p.z : rug ? 1 : Math.round(Number(p.y)||50);
  let editing = false,
    layout = structuredClone(
      data.room_layout.find((l) => l.user_id === ownerId) || {
        id: id(),
        user_id: ownerId,
        placements: [],
        frames: [],
        wallpaper: null,
        floor: null,
        shelf: null,
        frame: null,
        outfit: null,
      },
    );
  layout.shelf_transform ||= { x: 24, y: 76, scale: 1 };
  let savedLayout = structuredClone(layout),
    publicBooks = [];
  const owned = data.room_items
    .filter((i) => i.user_id === ownerId)
    .map((i) => data.shop_items.find((s) => s.id === i.item_id))
    .filter((i) => i && !["floor", "outfit", "frame", "clock"].includes(i.shape) && !(i.theme === "기본" && ["clock", "rug", "lamp", "plant"].includes(i.shape)));
  owned.unshift({id:"basic-shelf",shape:"shelf",theme:"기본",name:"기본 책장"});
  const room = $("#miniroom");
  $("#fixed-shelf").innerHTML = art("shelf");
  const avatarElement = $("#room-avatar");
  avatarElement.innerHTML =
    '<span class="avatar-shadow"></span><span class="reader-sprite" role="img" aria-label="책을 든 아바타"></span>';
  const themeScenes = {
    로맨스: "library",
    판타지: "attic",
    추리: "train",
    SF: "camp",
  };
  const currentScene = () =>
    themeScenes[
      data.shop_items.find((i) => i.id === layout.wallpaper)?.theme
    ] || "basic";
  let drawnScene = currentScene();
  const motion = mountRoomMotion({
    room,
    avatar: avatarElement,
    ownerId,
    isEditing: () => editing,
    initialScene: drawnScene,
    onSceneRequest: (key) => {
      if (saving) return;
      if (!mine) return toast("방 주인이 선택한 테마입니다.");
      const item = owned.find(
        (i) => i.shape === "wall" && themeScenes[i.theme] === key,
      );
      if (key !== "basic" && !item) {
        location.href =
          "shop.html?theme=" +
          encodeURIComponent(
            Object.keys(themeScenes).find((t) => themeScenes[t] === key),
          );
        return;
      }
      if (!editing) {
        toast("방 꾸미기를 켠 뒤 테마를 선택해 주세요.");
        return;
      }
      layout.wallpaper = item?.id || null;
      draw();
    },
  });
  async function shelf() {
    const r = await db.rpc("public_shelf", { p_owner: ownerId });
    if (r.error) throw r.error;
    publicBooks = r.data || [];
    publicBooks.forEach((b) => {
      if (!bookBy(b.id)) data.books.push(b);
    });
    return publicBooks;
  }
  function draw() {
    const nextScene = currentScene();
    if (nextScene !== drawnScene) {
      drawnScene = nextScene;
      motion.setScene(nextScene);
    }
    $$("[data-scene]").forEach((b) => {
      const available =
        b.dataset.scene === "basic" ||
        owned.some(
          (i) => i.shape === "wall" && themeScenes[i.theme] === b.dataset.scene,
        );
      b.classList.toggle("locked", !available);
      b.title = !mine
        ? "방 주인이 선택한 테마"
        : available
          ? "방 꾸미기에서 적용"
          : "상점에서 구매";
    });
    const theme = (value) => {
      const t = data.shop_items.find((i) => i.id === value)?.theme;
      return ["추리", "SF", "로맨스", "판타지"].includes(t) ? t : "기본";
    };
    room.className = `miniroom show-saved-items wall-${theme(layout.wallpaper)} floor-${theme(layout.floor)} ${editing ? "editing" : ""}`;
    $("#fixed-shelf").classList.toggle("decorated", !!layout.shelf);
    $("#fixed-shelf").dataset.skin = theme(layout.shelf);
    $("#fixed-shelf").innerHTML = art(
      "shelf",
      layout.shelf ? theme(layout.shelf) : undefined,
    );
    const shelfPose = layout.shelf_transform;
    const shelfElement = $("#fixed-shelf");
    shelfElement.style.left = shelfPose.x + "%";
    shelfElement.style.top = shelfPose.y + "%";
    shelfElement.style.zIndex = depth(shelfPose);
    shelfElement.style.transform = `translate(-50%, -85%) scale(${shelfPose.scale})`;
    shelfElement.classList.toggle("movable", editing);
    if (editing) shelfElement.insertAdjacentHTML("beforeend", '<span class="resize-handle" aria-label="책장 크기 조절">↘</span>');
    room.querySelector(".room-floor-tint").hidden = !layout.floor;
    avatarElement.classList.toggle("has-outfit", !!layout.outfit);
    if (editing) motion.stop();
    const exhibited=layout.frames.map((bookId,slot)=>({book:publicBooks.find(b=>b.id===bookId),slot})).filter(x=>x.book);
    $("#exhibit-count").textContent=`${exhibited.length}/5`;
    $("#add-exhibit").hidden=!mine;
    $("#add-exhibit").disabled=exhibited.length>=5;
    $("#exhibit-books").innerHTML=exhibited.map(({book,slot})=>`<button type="button" class="room-frame" data-frame="${slot}" aria-label="${esc(book.title)} 전시 수정">${cover(book,true)}</button>`).join("") || '<p class="tiny">전시한 책이 없습니다.</p>';
    $("#placed-items").innerHTML = layout.placements
      .map((p, i) => {
        const item = owned.find((x) => x.id === p.item_id);
        if (!item) return "";
        return `<button type="button" class="placed-item furniture-${item.shape} ${editing ? "movable" : ""}" data-placement="${i}" style="transform:translate(-50%, -85%) scale(${Math.max(0.4, Math.min(2, Number(p.scale) || 1))});z-index:${depth(p, item.shape === "rug")};left:${Math.max(7, Math.min(93, Number(p.x) || 50))}%;top:${Math.max(12, Math.min(87, Number(p.y) || 50))}%" aria-label="${esc(item.name)}${editing ? " 방향키로 이동 가능" : ""}">${art(item.shape, item.theme)}${editing ? '<span class="resize-handle" aria-label="크기 조절">↘</span>' : ""}</button>`;
      })
      .join("");
    $("#inventory").hidden = !editing;
    $("#inventory").classList.toggle("collapsed",!inventoryOpen);
    $("#inventory-grid").hidden = !inventoryOpen;
    $("#inventory-filters").hidden = !inventoryOpen;
    $("#inventory-resize").hidden = !inventoryOpen;
    fitInventory();
    $$("[data-kind]").forEach(b=>{b.classList.toggle("selected",b.dataset.kind===inventoryKind);b.setAttribute("aria-pressed",String(b.dataset.kind===inventoryKind));});
    $("#room-theme-toggle").hidden = !inventoryOpen;
    $("#inventory-toggle").hidden = !editing;
    $("#inventory-toggle").textContent = inventoryOpen ? "▾" : "▸";
    $("#inventory-toggle").setAttribute("aria-expanded", String(inventoryOpen));
    $("#inventory-toggle").setAttribute("aria-label", inventoryOpen ? "보유 아이템 닫기" : "보유 아이템 열기");
    $("#layer-controls").hidden = !editing;
    updateSelection();
    $("#decorate").textContent = editing ? "배치 저장" : "방 꾸미기";
    $("#inventory-grid").innerHTML = owned.filter((item) => item.shape !== "wall" && (inventoryKind === "all" || item.shape === inventoryKind))
      .map(
        (item) =>
          `<button data-item="${item.id}" class="${(item.id === "basic-shelf" && !layout.shelf) || layout.placements.some((p) => p.item_id === item.id) || Object.values(layout).includes(item.id) ? "selected" : ""}">${art(item.shape, item.theme)}${esc(item.name)}</button>`,
      )
      .join("") || '<p class="tiny">이 종류의 보유 아이템이 없습니다.</p>';
  }
  function layerEntries() {
    return [{ key:"shelf", p:layout.shelf_transform, el:$("#fixed-shelf"), name:"책장", rug:false }, ...layout.placements.flatMap((p,i)=>{
      const item=owned.find(x=>x.id===p.item_id);
      return item ? [{key:p.item_id,p,el:$(`[data-placement="${i}"]`),name:item.name,rug:item.shape==="rug"}] : [];
    })];
  }
  function updateSelection() {
    const entries=layerEntries(), selected=entries.find(x=>x.key===selectedFurniture);
    entries.forEach(x=>x.el?.classList.toggle("layer-selected",editing && x===selected));
    $("#selected-furniture").textContent=selected?.name || "가구를 선택하세요";
    $$("[data-layer]").forEach(b=>b.disabled=!selected || saving);
  }
  $("#inventory-filters").onclick=(e)=>{const b=e.target.closest("[data-kind]");if(b){inventoryKind=b.dataset.kind;draw();}};
  const resizeBar=$("#inventory-resize");let barDrag=null;
  function fitInventory() {
    const panel=$("#inventory"), details=$("#room-theme-toggle");
    const themeHeight=details.open && inventoryOpen ? details.scrollHeight : 0;
    const height=Math.max(inventoryHeight,themeHeight ? themeHeight+200 : 200);
    panel.style.height=inventoryOpen ? height+"px" : "auto";
    panel.style.marginTop=editing && inventoryOpen ? Math.min(0,280-height)+"px" : "0px";
  }
  $("#room-theme-toggle").addEventListener("toggle",fitInventory);
  const resizeInventory=(height)=>{inventoryHeight=Math.max(200,Math.min(600,height));fitInventory();resizeBar.setAttribute("aria-valuenow",String(Math.round(inventoryHeight)));};
  resizeBar.onpointerdown=(e)=>{if(!editing)return;barDrag={y:e.clientY,height:inventoryHeight};resizeBar.setPointerCapture?.(e.pointerId);e.preventDefault();};
  resizeBar.onpointermove=(e)=>{if(barDrag)resizeInventory(barDrag.height+barDrag.y-e.clientY);};
  resizeBar.onpointerup=resizeBar.onpointercancel=()=>barDrag=null;
  resizeBar.onkeydown=(e)=>{if(["ArrowUp","ArrowDown"].includes(e.key)){e.preventDefault();resizeInventory(inventoryHeight+(e.key==="ArrowUp"?20:-20));}};
  $("#inventory-toggle").onclick=()=>{if(editing){inventoryOpen=!inventoryOpen;draw();}};
  $("#layer-controls").onclick=(e)=>{
    const action=e.target.closest("[data-layer]")?.dataset.layer;
    if(!action || !mine || !editing || saving) return;
    const entries=layerEntries().sort((a,b)=>depth(a.p,a.rug)-depth(b.p,b.rug));
    const index=entries.findIndex(x=>x.key===selectedFurniture);
    if(index<0)return;
    const target={back:0,down:Math.max(0,index-1),up:Math.min(entries.length-1,index+1),front:entries.length-1}[action];
    const [entry]=entries.splice(index,1);entries.splice(target,0,entry);
    entries.forEach((x,i)=>x.p.z=10+i*2);
    draw();
  };
  const hasUnsavedChanges = () => editing && JSON.stringify(layout) !== JSON.stringify(savedLayout);
  function confirmLeaving() {
    if (saving) { toast("저장 중입니다. 잠시만 기다려 주세요."); return false; }
    if (!hasUnsavedChanges()) return true;
    if (!confirm("방 꾸미기 변경 사항이 아직 저장되지 않았어요.\n저장하지 않고 나가면 변경 사항이 사라집니다.\n\n이동하려면 확인, 계속 꾸미려면 취소를 눌러 주세요.")) return false;
    layout = structuredClone(savedLayout);
    editing = false;
    draw();
    return true;
  }
  document.addEventListener("click", (e) => {
    const target=e.target.closest('a[href],#room-tabs [data-tab],#logout,[data-frame],#open-shelf,#add-exhibit');
    if (!target || !editing) return;
    if(target.matches('a') && (target.target==='_blank' || e.ctrlKey || e.metaKey || e.shiftKey)) return;
    if(target.dataset.tab==='home') return;
    if(!confirmLeaving()){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  window.addEventListener("beforeunload", (e) => {
    if(hasUnsavedChanges() || saving){e.preventDefault();e.returnValue="";}
  });
  async function persist() {
    if (saving) return;
    saving = true;
    const snapshot = structuredClone(layout);
    try {
      await save("room_layout", snapshot);
      savedLayout = snapshot;
      editing = false;
      draw();
      toast("방을 저장했습니다.");
    } finally {
      saving = false;
    }
  }
  $("#decorate").hidden = !mine;
  $("#decorate").onclick = () => {
    if (editing) attempt(() => busy($("#page-content"), persist));
    else {
      editing = true;
      draw();
    }
  };
  $("#cancel-decoration").onclick = () => {
    if (saving) return;
    layout = structuredClone(savedLayout);
    editing = false;
    draw();
  };
  $("#inventory-grid").onclick = (e) => {
    const btn = e.target.closest("[data-item]");
    if (!btn || !mine || !editing || saving) return;
    const item = owned.find((i) => i.id === btn.dataset.item),
      key = {
        wall: "wallpaper",
        floor: "floor",
        shelf: "shelf",
        frame: "frame",
        outfit: "outfit",
      }[item.shape];
    if (item.id === "basic-shelf") { layout.shelf = null; draw(); return; }
    if (key) layout[key] = layout[key] === item.id ? null : item.id;
    else {
      const i = layout.placements.findIndex((p) => p.item_id === item.id);
      if (i >= 0) layout.placements.splice(i, 1);
      else layout.placements.push({ item_id: item.id, x: 63, y: 76 });
    }
    draw();
  };
  let dragging = null;
  room.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest("[data-placement],#fixed-shelf");
    if (!btn || !editing || !mine || saving) return;
    const p = btn.id === "fixed-shelf" ? layout.shelf_transform : layout.placements[Number(btn.dataset.placement)];
    selectedFurniture = btn.id === "fixed-shelf" ? "shelf" : p.item_id;
    updateSelection();
    dragging = { btn, p, resize: !!e.target.closest(".resize-handle"), x:e.clientX, y:e.clientY, startX:p.x, startY:p.y, scale:Number(p.scale)||1, width:btn.offsetWidth || 100 };
    btn.setPointerCapture?.(e.pointerId);
    e.preventDefault(); e.stopPropagation();
  });
  room.addEventListener("pointermove", (e) => {
    if (!dragging || !editing || saving) return;
    const {btn,p,resize,x,y,startX,startY,scale,width}=dragging;
    if (resize) {
      p.scale=Math.max(.4, Math.min(2,scale+(e.clientX-x)/width));
      btn.style.transform=`translate(-50%, -85%) scale(${p.scale})`;
    } else {
      const rect=room.getBoundingClientRect();
      p.x=Math.max(7,Math.min(93,startX+(e.clientX-x)/rect.width*100));
      p.y=Math.max(12,Math.min(87,startY+(e.clientY-y)/rect.height*100));
      btn.style.left=p.x+"%"; btn.style.top=p.y+"%";
      btn.style.zIndex=depth(p,btn.classList.contains("furniture-rug"));
    }
  });
  room.addEventListener("pointerup",()=>dragging=null);
  room.addEventListener("pointercancel",()=>dragging=null);
  $("#placed-items").onkeydown = (e) => {
    const btn = e.target.closest("[data-placement]");
    if (
      !editing ||
      saving ||
      !mine ||
      !btn ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    )
      return;
    e.preventDefault();
    const p = layout.placements[Number(btn.dataset.placement)];
    p.x = Math.max(
      7,
      Math.min(
        93,
        p.x + (e.key === "ArrowLeft" ? -2 : e.key === "ArrowRight" ? 2 : 0),
      ),
    );
    p.y = Math.max(
      12,
      Math.min(
        87,
        p.y + (e.key === "ArrowUp" ? -2 : e.key === "ArrowDown" ? 2 : 0),
      ),
    );
    btn.style.left = p.x + "%";
    btn.style.top = p.y + "%";
    btn.style.zIndex = depth(p,btn.classList.contains("furniture-rug"));
  };
  async function openShelf(slot = null) {
    const target = openDialog(
      slot === null ? "공개한 완독 도서" : "전시할 책 선택",
      empty("불러오는 중입니다."),
    );
    try {
      await shelf();
      target.innerHTML = publicBooks.length
        ? `<div class="shelf-grid">${publicBooks.map((b) => `<article><a href="book.html?id=${b.id}">${cover(b)}</a>${mine && slot !== null ? `<button class="secondary-button" data-frame-book="${b.id}" ${layout.frames.includes(b.id) ? "disabled" : ""}>${layout.frames.includes(b.id) ? "전시 중" : "이 책 전시하기"}</button>` : ""}</article>`).join("")}</div>`
        : empty("아직 공개한 완독 도서가 없습니다.");
      if (mine && slot !== null && layout.frames[slot])
        target.insertAdjacentHTML(
          "beforeend",
          '<button class="text-button" id="clear-frame">전시에서 빼기</button>',
        );
      target.onclick = (e) => {
        const btn = e.target.closest("[data-frame-book],#clear-frame");
        if (!btn || !mine || slot === null || slot < 0 || slot >= 5) return;
        attempt(() =>
          busy(target, async () => {
            if(btn.dataset.frameBook && layout.frames.includes(btn.dataset.frameBook)) return;
            const before=structuredClone(layout.frames);
            layout.frames[slot] = btn.dataset.frameBook || null;
            try { await persist(); } catch(error) { layout.frames=before; throw error; }
            $("#generic-dialog").close();
          }),
        );
      };
    } catch (e) {
      target.innerHTML =
        empty(e.message) + '<button id="shelf-retry">다시 시도</button>';
      $("#shelf-retry").onclick = () => {
        $("#generic-dialog").close();
        openShelf(slot);
      };
    }
  }
  $("#fixed-shelf").onclick = () => { if (!editing) openShelf(); };
  $("#open-shelf").onclick = () => openShelf();
  $("#exhibit-books").onclick=(e)=>{const btn=e.target.closest("[data-frame]");if(btn)openShelf(mine?Number(btn.dataset.frame):null);};
  $("#add-exhibit").onclick=()=>{
    if(!mine)return;
    const emptySlot=layout.frames.findIndex(x=>!x);
    const slot=emptySlot<0?layout.frames.length:emptySlot;
    if(slot>=5)return toast("책은 최대 5권까지 전시할 수 있습니다.");
    openShelf(slot);
  };
  try {
    await shelf();
  } catch {}
  draw();
  function tab(name) {
    $$("[data-room-panel]").forEach(
      (p) => (p.hidden = p.dataset.roomPanel !== name),
    );
    $$("#room-tabs button").forEach((b) =>
      b.classList.toggle("selected", b.dataset.tab === name),
    );
  }
  $("#room-tabs").onclick = (e) => {
    if (e.target.dataset.tab) tab(e.target.dataset.tab);
  };
  tab(
    ["home", "diary", "guest", "shelf"].includes(query.get("tab"))
      ? query.get("tab")
      : "home",
  );
  let pick = data.monthly_picks.find(
      (p) => p.user_id === ownerId && p.month === day().slice(0, 7),
    );
  const pf = $("#pick-form");
  $("#pick-actions").hidden = !mine;
  function pickView() {
    const b = bookBy(pick?.book_id);
    $("#pick-content").innerHTML = b
      ? `<div class="current-book">${cover(b, true)}<div><h3>${esc(b.title)}</h3><p>${esc(pick.reason)}</p></div></div>`
      : "<p>아직 추천한 책이 없습니다.</p>";
    $("#pick-delete").hidden = !pick;
  }
  const pickDialog = $("#pick-dialog");
  $("#pick-close").onclick = () => pickDialog.close();
  $("#pick-toggle").onclick = () => {
    if (!mine) return;
    const books = data.books.filter(b => data.library_items.some(l => l.user_id === user.id && l.book_id === b.id && l.kind === "owned"));
    pf.elements.book_id.value = books.some(b=>b.id===pick?.book_id) ? pick.book_id : "";
    pf.elements.reason.value = pick?.reason || "";
    $("#pick-books").innerHTML = books.map(b=>`<button type="button" class="pick-book" data-pick-book="${esc(b.id)}" aria-pressed="${b.id===pf.elements.book_id.value}">${cover(b,true)}<span>${esc(b.title)}</span><small>${esc(b.author || "")}</small></button>`).join("") || '<p>소장한 책이 없습니다. 내 서재에 책을 먼저 등록해 주세요.</p>';
    updatePickSelection();
    pickDialog.showModal();
  };
  function updatePickSelection() {
    const b=bookBy(pf.elements.book_id.value);
    $("#pick-selection").textContent=b ? `선택한 책: ${b.title}` : "책을 선택해 주세요.";
    $("#pick-save").disabled=!b;
    $$("[data-pick-book]").forEach(btn=>btn.setAttribute("aria-pressed",btn.dataset.pickBook===pf.elements.book_id.value));
  }
  $("#pick-books").onclick=e=>{
    const btn=e.target.closest("[data-pick-book]");
    if (!btn) return;
    pf.elements.book_id.value=btn.dataset.pickBook;
    updatePickSelection();
  };
  pf.onsubmit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(pf));
    if (!mine || !f.book_id) return;
    attempt(() =>
      busy(pf, async () => {
        await save("monthly_picks", {
          id: pick?.id || id(),
          user_id: user.id,
          book_id: f.book_id,
          reason: f.reason,
          month: day().slice(0, 7),
        });
        await loadTables(["monthly_picks"]);
        pick = data.monthly_picks.find(
          (p) => p.user_id === ownerId && p.month === day().slice(0, 7),
        );
        pickDialog.close();
        pickView();
        toast("추천을 저장했습니다.");
      }),
    );
  };
  $("#pick-delete").onclick = () => {
    if (!pick || !confirm("이번 달의 책 추천을 삭제할까요?")) return;
    attempt(async () => {
      await remove("monthly_picks", pick.id);
      pick = null;
      pickDialog.close();
      pickView();
    });
  };
  pickView();
  let editingDiary = null;
  const df = $("#diary-form");
  df.hidden = !mine;
  df.elements.book_id.innerHTML = bookOptions(data.books);
  const labels = {
    private: "나만 보기",
    followers: "친구 공개",
    public: "전체 공개",
  };
  function diaries() {
    $("#diary-list").innerHTML =
      data.diary_entries
        .filter((d) => d.user_id === ownerId)
        .map(
          (d) =>
            `<article class="diary-card"><blockquote>“${esc(d.content)}”</blockquote><p>${esc(bookBy(d.book_id)?.title)}</p><small>${labels[d.visibility]}</small>${mine ? `<div class="row"><button class="text-button" data-edit-diary="${d.id}">수정 · 공개 범위</button><button class="text-button" data-feature="${d.id}" ${d.is_featured ? "disabled" : ""}>${d.is_featured ? "대표 문장" : "대표 문장으로"}</button><button class="text-button" data-delete-diary="${d.id}">삭제</button></div>` : ""}</article>`,
        )
        .join("") || empty("아직 볼 수 있는 문장이 없습니다.");
    featured();
  }
  $("#diary-cancel").onclick = () => {
    editingDiary = null;
    df.reset();
    $("#diary-cancel").hidden = true;
  };
  df.onsubmit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(df)),
      old = data.diary_entries.find((d) => d.id === editingDiary);
    attempt(() =>
      busy(df, async () => {
        await save("diary_entries", {
          id: editingDiary || id(),
          user_id: user.id,
          book_id: f.book_id,
          content: f.content,
          visibility: f.visibility,
          is_featured: old?.is_featured || false,
          created_at: old?.created_at || new Date().toISOString(),
        });
        await loadTables(["diary_entries"]);
        editingDiary = null;
        df.reset();
        $("#diary-cancel").hidden = true;
        diaries();
        toast("문장을 저장했습니다.");
      }),
    );
  };
  $("#diary-list").onclick = (e) => {
    const btn = e.target.closest("button");
    if (!btn || !mine) return;
    if (btn.dataset.editDiary) {
      const d = data.diary_entries.find((d) => d.id === btn.dataset.editDiary);
      editingDiary = d.id;
      df.elements.content.value = d.content;
      df.elements.book_id.value = d.book_id;
      df.elements.visibility.value = d.visibility;
      $("#diary-cancel").hidden = false;
      df.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    attempt(() =>
      busy(btn.parentElement, async () => {
        if (btn.dataset.feature)
          await rpc("feature_diary", { p_entry: btn.dataset.feature });
        if (btn.dataset.deleteDiary) {
          if (!confirm("이 문장을 삭제할까요?")) return;
          await remove("diary_entries", btn.dataset.deleteDiary);
        }
        await loadTables(["diary_entries"]);
        diaries();
      }),
    );
  };
  diaries();
  const gf = $("#guest-form");
  gf.hidden = !user || mine;
  gf.elements.book_id.innerHTML = bookOptions(data.books);
  function guests() {
    $("#guest-list").innerHTML =
      data.guestbook_entries
        .filter((g) => g.owner_id === ownerId)
        .map(
          (g) =>
            `<article class="guest-card"><h3>${esc(bookBy(g.book_id)?.title)}</h3><p>${esc(g.content)}</p><div class="section-head"><small>${esc(profileBy(g.user_id)?.nickname)} · ${day(g.created_at)}</small>${mine || g.user_id === user?.id ? `<button class="text-button" data-delete-guest="${g.id}">삭제</button>` : ""}</div></article>`,
        )
        .join("") || empty("등록된 방명록이 없습니다.");
  }
  gf.onsubmit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(gf));
    attempt(() =>
      busy(gf, async () => {
        await save("guestbook_entries", {
          id: id(),
          user_id: user.id,
          owner_id: ownerId,
          book_id: f.book_id,
          content: f.content,
          created_at: new Date().toISOString(),
        });
        await loadTables(["guestbook_entries"]);
        gf.reset();
        guests();
        toast("방명록을 남겼습니다.");
      }),
    );
  };
  $("#guest-list").onclick = (e) => {
    const btn = e.target.closest("[data-delete-guest]");
    if (!btn || !confirm("이 방명록을 삭제할까요?")) return;
    attempt(async () => {
      await remove("guestbook_entries", btn.dataset.deleteGuest);
      await loadTables(["guestbook_entries"]);
      guests();
    });
  };
  guests();
});
