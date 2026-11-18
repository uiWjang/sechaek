import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { makeServer } from "../server.mjs";
const root = new URL("../", import.meta.url);
async function fixture(page, extra = {}) {
  const html = await readFile(new URL(page + ".html", root), "utf8");
  const dom = new JSDOM(html, {
      url: "http://127.0.0.1:5174/" + page + ".html?id=lib1",
      runScripts: "outside-only",
    }),
    w = dom.window;
  let source = await readFile(new URL("js/common.js", root), "utf8");
  const names = [
    ...source.matchAll(/export\s+(?:async\s+)?(?:const|let|function)\s+(\w+)/g),
  ].map((m) => m[1]);
  source = source
    .replace(/^import[^;]+;/gm, "")
    .replace(/export /g, "")
    .replace(/const db = createClient\([\s\S]*?\n\);/, "const db = {};");
  const common = w.Function(
    "const createClient=()=>({});const config={};\n" +
      source +
      "\nreturn {" +
      names.join(",") +
      ",$,$$};",
  )();
  w.structuredClone = structuredClone;
  const calls = [],
    errors = [],
    pending = [];
  const data = {
    books: [
      {
        id: "book1",
        title: "테스트 책",
        author: "작가",
        pages: 200,
        genres: [],
      },
    ],
    library_items: [],
    notes: [],
    reviews: [],
    profiles: [],
    reading_logs: [],
    store_prices: [],
    bookmark_ledger: [],
    shop_items: [],
    room_items: [],
    room_layout: [],
    follows: [],
    diary_entries: [],
    monthly_picks: [],
    guestbook_entries: [],
    ...extra.data,
  };
  const h = {
    ...common,
    data,
    user: { id: "user1" },
    query: new URLSearchParams("?id=lib1"),
    getBook: async () => data.books[0],
    bookBy: (id) => data.books.find((b) => b.id === id),
    profileBy: (id) => data.profiles.find((p) => p.id === id),
    db: {
      rpc: async (n) => ({
        data: n === "public_shelf" ? [] : { today: 0, total: 0 },
        error: null,
      }),
    },
    requireUser: () => true,
    loadTables: async () => {},
    toast: () => {},
    save: async (t, r) => {
      calls.push({ t, r });
      data[t].push(r);
    },
    rpc: async (n, args) => {
      calls.push({ n, args });
    },
    remove: async () => {},
    init: async () => {
      w.document.querySelector("#page-content").hidden = false;
      w.document
        .querySelectorAll("[data-stores]")
        .forEach((el) => (el.innerHTML = "<option>교보문고</option>"));
      w.document
        .querySelectorAll("[data-rating]")
        .forEach(
          (el) =>
            (el.innerHTML =
              '<option value="0">0</option><option value="5">5</option>'),
        );
      w.document
        .querySelectorAll("[data-visibility]")
        .forEach(
          (el) =>
            (el.innerHTML =
              '<option value="private">나만 보기</option><option value="public">전체 공개</option>'),
        );
    },
    ...extra,
  };
  h.data = data;
  h.attempt = (fn) => {
    const p = Promise.resolve()
      .then(fn)
      .catch((e) => errors.push(e));
    pending.push(p);
    return p;
  };
  w.__h = h;
  let code = await readFile(new URL("js/" + page + ".js", root), "utf8");
  code = code
    .replace(
      /import\s*\{([^}]+)\}\s*from\s*['"]\.\/common.js['"];?/g,
      (_, names) => "const {" + names + "}=window.__h;",
    )
    .replace(
      /import\s*\{\s*art\s*\}\s*from\s*['"]\.\/art.js['"];?/g,
      'const art=()=>"<svg></svg>";',
    );
  code = code.replace(
    /import \{ mountRoomMotion \} from "\.\/room-motion.js";/,
    `const mountRoomMotion = options => {
       const setScene=key=>options.room.dataset.scene=key;
       setScene(options.initialScene);
       document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>options.onSceneRequest(b.dataset.scene));
       return {stop(){},setScene};
     };`,
  );
  w.eval(code);
  const settle = async () => {
    while (pending.length) await Promise.all(pending.splice(0));
  };
  await settle();
  if (errors.length) throw errors[0];
  return {
    w,
    h,
    calls,
    errors,
    settle,
    close: () => w.close(),
    submit: async (id) => {
      w.document
        .querySelector(id)
        .dispatchEvent(
          new w.Event("submit", { bubbles: true, cancelable: true }),
        );
      await settle();
    },
  };
}
test("소장 등록은 비활성화 전 폼 값을 보존하고 찜과 분리한다", async () => {
  const f = await fixture("book");
  try {
    const form = f.w.document.querySelector("#register-form");
    form.elements.price.value = "18000";
    form.elements.purchased_at.value = "2026-11-10";
    await f.submit("#register-form");
    assert.equal(f.errors.length, 0);
    assert.equal(f.calls[0].r.price, 18000);
    assert.equal(f.calls[0].r.kind, "owned");
    assert.equal(form.querySelector("#register-submit").disabled, true);
    form.querySelector('[data-kind="wishlist"]').click();
    await f.submit("#register-form");
    assert.equal(f.calls[1].r.kind, "wishlist");
    assert.equal(f.calls[1].r.price, null);
  } finally {
    f.close();
  }
});
test("페이지 그룹 다음은 1에서 9, 이전은 9에서 1로 이동한다", async () => {
  const pages = [];
  const f = await fixture("search", {
    catalog: async (body) => {
      pages.push(body.page);
      return {
        total: 300,
        books: [{ id: "book1", title: "테스트", genres: [] }],
      };
    },
  });
  try {
    f.w.document.querySelector('[data-page="9"]').click();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(pages.at(-1), 9);
    assert.match(
      f.w.document.querySelector("#search-count").textContent,
      /9페이지/,
    );
    f.w.document.querySelector('[data-page="1"]').click();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(pages.at(-1), 1);
    assert.equal(f.errors.length, 0);
  } finally {
    f.close();
  }
});
test("노트 문장 숫자 정리와 비공개 저장, 기록 RPC 인자", async () => {
  const f = await fixture("notebook", {
    data: {
      library_items: [
        {
          id: "lib1",
          user_id: "user1",
          book_id: "book1",
          kind: "owned",
          status: "reading",
          read_pages: 90,
          genres: [],
        },
      ],
    },
  });
  try {
    f.w.document.querySelector("#add-quote").click();
    const input = f.w.document.querySelector('[data-field="page"]');
    input.value = "009a0";
    input.dispatchEvent(new f.w.Event("input", { bubbles: true }));
    await f.submit("#note-form");
    assert.equal(f.calls[0].t, "notes");
    assert.equal(f.calls[0].r.quotes[0].page, "90");
    assert.equal("visibility" in f.calls[0].r, false);
    const form = f.w.document.querySelector("#log-form");
    form.elements.pages.value = "12";
    form.elements.content.value = "독서 기록";
    await f.submit("#log-form");
    assert.equal(f.calls[1].n, "add_reading_log");
    assert.equal(f.calls[1].args.p_pages, 12);
    assert.equal(f.errors.length, 0);
  } finally {
    f.close();
  }
});
test("타 사용자 노트 URL은 표시하지 않는다", async () => {
  const f = await fixture("notebook", {
    data: {
      library_items: [{ id: "lib1", user_id: "other", book_id: "book1" }],
    },
  });
  try {
    assert.match(
      f.w.document.querySelector("#page-content").textContent,
      /접근할 수 없습니다/,
    );
    assert.equal(f.calls.length, 0);
  } finally {
    f.close();
  }
});
test("서버는 HTML만 허용하고 참고 SQL 및 다른 Origin 요청을 차단한다", async () => {
  const server = makeServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    assert.equal((await fetch(base + "/index.html")).status, 200);
    assert.equal(
      (await fetch(base + "/reference/react-original-hashes.json")).status,
      404,
    );
    assert.equal(
      (
        await fetch(base + "/api/catalog", {
          method: "POST",
          headers: { Origin: "https://example.com" },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/catalog", {
          method: "POST",
          body: '{"action":"delete"}',
        })
      ).status,
      400,
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
test("상점은 보유 아이템을 제외한 세트에 20% 할인을 적용한다", async () => {
  const f = await fixture("shop", {
    balance: () => 1000,
    data: {
      shop_items: [
        { id: "a", theme: "추리", name: "조명", price: 40 },
        { id: "b", theme: "추리", name: "화분", price: 60 },
        { id: "oldfloor", theme: "추리", shape: "floor", name: "마루", price: 30 },
        { id: "oldoutfit", theme: "추리", shape: "outfit", name: "옷", price: 80 },
      ],
      room_items: [{ user_id: "user1", item_id: "a" }],
    },
  });
  try {
    assert.equal(
      f.w.document.querySelector("#set-price").textContent,
      "48 책갈피",
    );
    assert.equal(f.w.document.querySelector('[data-buy="a"]').disabled, true);
    assert.equal(f.w.document.querySelector('[data-buy="oldfloor"]'), null);
    assert.equal(f.w.document.querySelector('[data-buy="oldoutfit"]'), null);
    f.w.document.querySelector("#buy-set").click();
    await f.settle();
    assert.equal(f.calls[0].n, "buy_items");
    assert.equal(f.calls[0].args.p_theme, "추리");
    assert.equal(f.errors.length, 0);
  } finally {
    f.close();
  }
});
test("저장 실패 후 버튼을 다시 사용할 수 있고 오류를 표시한다", async () => {
  const f = await fixture("book", {
    save: async () => {
      throw Error("테스트 저장 오류");
    },
  });
  try {
    await f.submit("#register-form");
    assert.equal(f.errors[0].message, "테스트 저장 오류");
    assert.equal(
      f.w.document.querySelector("#register-submit").disabled,
      false,
    );
    assert.equal(
      f.w.document.querySelector("#register-form").dataset.busy,
      undefined,
    );
  } finally {
    f.close();
  }
});
test("장르 통계는 소장 도서만 집계하고 금액 없는 책·복수 장르·미분류를 처리한다", async () => {
  const f = await fixture("statistics", {
    data: {
      books: [
        { id: "a", title: "A", genres: ["철학"] },
        { id: "b", title: "B", genres: ["고전"] },
        { id: "c", title: "C", genres: [] },
      ],
      library_items: [
        {
          id: "1",
          book_id: "a",
          user_id: "user1",
          kind: "owned",
          genres: ["SF(공상과학)", "고전", "고전"],
          price: null,
          purchased_at: "2025-01-01",
        },
        {
          id: "2",
          book_id: "b",
          user_id: "user1",
          kind: "owned",
          genres: [],
          price: null,
        },
        { id: "3", book_id: "c", user_id: "user1", kind: "owned", genres: [] },
        {
          id: "4",
          book_id: "a",
          user_id: "user1",
          kind: "wishlist",
          genres: ["철학"],
        },
        {
          id: "5",
          book_id: "a",
          user_id: "other",
          kind: "owned",
          genres: ["철학"],
        },
      ],
    },
  });
  try {
    assert.equal(f.errors.length, 0);
    assert.match(
      f.w.document.querySelector("#genre-summary").textContent,
      /3권/,
    );
    assert.equal(f.w.document.querySelectorAll(".genre-pie path").length, 3);
    const slices = [...f.w.document.querySelectorAll(".genre-slice")];
    assert.equal(new Set(slices.map((el) => el.getAttribute("fill"))).size, 3);
    const tip = f.w.document.querySelector("#genre-tooltip");
    slices[0].dispatchEvent(new f.w.Event("pointerenter"));
    assert.equal(tip.hidden, false);
    assert.match(tip.textContent, /고전: 2권, 50.0%/);
    slices[0].dispatchEvent(new f.w.Event("pointerleave"));
    assert.equal(tip.hidden, true);
    slices[0].dispatchEvent(new f.w.Event("focus"));
    assert.equal(tip.hidden, false);
    slices[0].dispatchEvent(
      new f.w.KeyboardEvent("keydown", { key: "Escape" }),
    );
    assert.equal(tip.hidden, true);

    const rows = [...f.w.document.querySelectorAll(".genre-stat-row")].map(
      (el) => el.textContent,
    );
    assert.ok(
      rows.some((t) => t.includes("고전") && t.includes("2권 · 50.0%")),
    );
    assert.ok(
      rows.some((t) => t.includes("미분류") && t.includes("1권 · 25.0%")),
    );
    assert.ok(!rows.some((t) => t.includes("철학")));
    f.w.document.querySelector("#stats-year").value = "2025";
    const period = f.w.document.querySelector("#genre-period");
    period.value = "year";
    period.dispatchEvent(new f.w.Event("change"));
    assert.match(
      f.w.document.querySelector("#genre-summary").textContent,
      /1권/,
    );
    f.w.document.querySelector("#stats-year").value = "2024";
    f.w.document
      .querySelector("#stats-year")
      .dispatchEvent(new f.w.Event("change"));
    assert.match(
      f.w.document.querySelector("#genre-chart").textContent,
      /구매한 책이 없습니다/,
    );
  } finally {
    f.close();
  }
});

function roomData() {
  return {
    profiles: [{ id: "user1", nickname: "독자" }],
    shop_items: [
      {
        id: "wall1",
        shape: "wall",
        theme: "로맨스",
        name: "햇살 서재",
        price: 20,
      },
      { id: "sofa1", shape: "sofa", theme: "로맨스", name: "소파", price: 70 },
      {
        id: "chair1",
        shape: "chair",
        theme: "판타지",
        name: "의자",
        price: 40,
      },
    ],
    room_items: [
      { user_id: "user1", item_id: "wall1" },
      { user_id: "user1", item_id: "sofa1" },
    ],
    room_layout: [
      {
        id: "layout1",
        user_id: "user1",
        wallpaper: null,
        floor: null,
        shelf: null,
        frame: null,
        outfit: null,
        frames: [null, null, null],
        placements: [],
      },
    ],
  };
}
test("미니룸: 보유 테마·가구만 적용, 취소 복원, 구매 소파 배치 저장", async () => {
  const f = await fixture("room", {
    query: new URLSearchParams("?id=user1"),
    data: roomData(),
  });
  try {
    const d = f.w.document,
      room = d.querySelector("#miniroom");
    assert.equal(room.dataset.scene, "basic");
    assert.equal(
      d.querySelector("[data-scene=camp]").classList.contains("locked"),
      true,
    );
    d.querySelector("[data-scene=library]").click();
    assert.equal(room.dataset.scene, "basic", "꾸미기 시작 전 테마 변경 금지");
    d.querySelector("#decorate").click();
    assert.equal(
      d.querySelector("[data-item=chair1]"),
      null,
      "미보유 의자는 배치 목록에 없어야 한다",
    );
    d.querySelector("[data-scene=library]").click();
    d.querySelector("[data-item=sofa1]").click();
    assert.equal(room.dataset.scene, "library");
    assert.equal(d.querySelectorAll(".furniture-sofa").length, 1);
    d.querySelector("#cancel-decoration").click();
    assert.equal(room.dataset.scene, "basic");
    assert.equal(d.querySelectorAll(".furniture-sofa").length, 0);
    d.querySelector("#decorate").click();
    d.querySelector("[data-scene=library]").click();
    d.querySelector("[data-item=sofa1]").click();
    d.querySelector(".furniture-sofa").dispatchEvent(
      new f.w.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    );
    d.querySelector("#decorate").click();
    await f.settle();
    const saved = f.calls.find((c) => c.t === "room_layout").r;
    assert.equal(saved.wallpaper, "wall1");
    assert.deepEqual(JSON.parse(JSON.stringify(saved.placements)), [
      { item_id: "sofa1", x: 61, y: 76 },
    ]);
    assert.equal(d.querySelector("#inventory").hidden, true);
  } finally {
    f.close();
  }
});
test("미니룸: 방문자는 테마를 변경하지 못하고 저장 실패 후 다시 시도할 수 있다", async () => {
  const visitor = await fixture("room", {
    user: { id: "visitor" },
    query: new URLSearchParams("?id=user1"),
    data: roomData(),
  });
  try {
    assert.equal(visitor.w.document.querySelector("#decorate").hidden, true);
    visitor.w.document.querySelector("[data-scene=library]").click();
    assert.equal(
      visitor.w.document.querySelector("#miniroom").dataset.scene,
      "basic",
    );
  } finally {
    visitor.close();
  }
  let fail = true;
  const f = await fixture("room", {
    query: new URLSearchParams("?id=user1"),
    data: roomData(),
    save: async () => {
      if (fail) throw Error("저장 오류");
    },
  });
  try {
    const d = f.w.document;
    d.querySelector("#decorate").click();
    d.querySelector("[data-item=sofa1]").click();
    d.querySelector("#decorate").click();
    await f.settle();
    assert.equal(f.errors.length, 1);
    assert.equal(d.querySelector("#inventory").hidden, false);
    assert.equal(d.querySelector("#decorate").disabled, false);
    fail = false;
    d.querySelector("#decorate").click();
    await f.settle();
    assert.equal(d.querySelector("#inventory").hidden, true);
  } finally {
    f.close();
  }
});
test('꾸미기: 책장 이동·크기 저장, 취소 복원, 기본 시계·러그 제외', async () => {
 const rd=roomData();
 for(const shape of ['clock','rug']) { rd.shop_items.push({id:shape,shape,theme:'기본',name:shape});rd.room_items.push({user_id:'user1',item_id:shape}); }
 const f=await fixture('room',{query:new URLSearchParams('?id=user1'),data:rd});
 try {
  const d=f.w.document, room=d.querySelector('#miniroom');
  room.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:600});
  d.querySelector('#decorate').click();
  assert.equal(room.nextElementSibling.id,'inventory');
  assert.equal(d.querySelector('#room-theme-toggle').open,false);
  assert.equal(d.querySelector('[data-item=clock]'),null);
  assert.equal(d.querySelector('[data-item=rug]'),null);
  if (process.env.ROOM_PREVIEW) {
    const {art}=await import('../js/art.js');
    d.querySelector('#fixed-shelf').innerHTML=art('shelf')+'<span class="resize-handle">↘</span>';
    for(const btn of d.querySelectorAll('[data-item]')) {const item=rd.shop_items.find(i=>i.id===btn.dataset.item)||{shape:"shelf",theme:"기본",name:"기본 책장"};btn.innerHTML=art(item.shape,item.theme)+item.name;}
    d.querySelectorAll('script').forEach(el=>el.remove());
    d.querySelector('#page-content').hidden=false;
    await (await import('node:fs/promises')).writeFile(new URL('room-preview.html',root),f.w.document.documentElement.outerHTML);
  }
  const shelf=d.querySelector('#fixed-shelf');
  shelf.click(); assert.equal(d.querySelector('#generic-dialog').open,false);
  const pointer=(el,type,x,y)=>el.dispatchEvent(new f.w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y}));
  pointer(shelf,'pointerdown',100,100);pointer(room,'pointermove',200,160);pointer(room,'pointerup',200,160);
  assert.equal(shelf.style.left,'34%');assert.equal(shelf.style.top,'86%');
  pointer(shelf.querySelector('.resize-handle'),'pointerdown',100,100);pointer(room,'pointermove',150,100);pointer(room,'pointerup',150,100);
  assert.ok(shelf.style.transform.includes('scale(1.5)'));
  d.querySelector('#decorate').click();await f.settle();
  const saved=f.calls.find(c=>c.t==='room_layout').r;
  assert.equal(saved.shelf_transform.scale,1.5);assert.equal(saved.shelf_transform.x,34);
  d.querySelector('#decorate').click();
  pointer(shelf,'pointerdown',100,100);pointer(room,'pointermove',150,100);pointer(room,'pointerup',150,100);
  d.querySelector('#cancel-decoration').click();assert.equal(shelf.style.left,'34%');
 } finally {f.close();}
});


test('가구 레이어는 이동 후 유지되고 저장되며 아이템 바는 꾸미기에서만 토글된다',async()=>{
 const f=await fixture('room',{query:new URLSearchParams('?id=user1'),data:roomData()});
 try {
 const d=f.w.document,room=d.querySelector('#miniroom');
 assert.equal(d.querySelector('#inventory-toggle').hidden,true);
 assert.equal(d.querySelector('[data-walk]'),null);
 d.querySelector('#decorate').click();
 d.querySelector('#inventory-toggle').click(); assert.equal(d.querySelector('#inventory-grid').hidden,true);
 assert.equal(d.querySelector('#inventory').hidden,false);
 d.querySelector('#inventory-toggle').click(); assert.equal(d.querySelector('#inventory-grid').hidden,false);
 d.querySelector('[data-item=sofa1]').click();
 const select=el=>el.dispatchEvent(new f.w.MouseEvent('pointerdown',{bubbles:true,clientX:10,clientY:10}));
 select(d.querySelector('.furniture-sofa'));
 d.querySelector('[data-layer=back]').click();
 assert.ok(Number(d.querySelector('.furniture-sofa').style.zIndex)<Number(d.querySelector('#fixed-shelf').style.zIndex));
 d.querySelector('[data-layer=front]').click();
 const z=d.querySelector('.furniture-sofa').style.zIndex;
 assert.ok(Number(z)>Number(d.querySelector('#fixed-shelf').style.zIndex));
 d.querySelector('.furniture-sofa').dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
 assert.equal(d.querySelector('.furniture-sofa').style.zIndex,z);
 d.querySelector('#decorate').click();await f.settle();
 const saved=f.calls.find(c=>c.t==='room_layout').r;
 assert.equal(saved.placements[0].z,Number(z));
 assert.equal(d.querySelector('#inventory-toggle').hidden,true);
 assert.equal(d.querySelector('#layer-controls').hidden,true);
 }finally{f.close();}
});

test('미저장 방 변경 시 탭 이동 취소·나가기와 새로고침 경고',async()=>{
 const f=await fixture('room',{query:new URLSearchParams('?id=user1'),data:roomData()});
 try {
 const d=f.w.document;let prompts=0;
 f.w.confirm=()=>{prompts++;return false;};
 assert.equal(d.querySelector('#show-room-items'),null);
 assert.equal(d.querySelector('#room-desk'),null);
 assert.equal(d.querySelector('#room-help'),null);
 assert.ok(d.querySelector('#inventory').contains(d.querySelector('#inventory-toggle')));
 d.querySelector('#decorate').click();
 d.querySelector('[data-item=sofa1]').click();
 d.querySelector('#room-tabs [data-tab=diary]').click();
 assert.equal(prompts,1);assert.equal(d.querySelector('#inventory').hidden,false);
 const event=new f.w.Event('beforeunload',{cancelable:true});f.w.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
 f.w.confirm=()=>true;
 d.querySelector('#room-tabs [data-tab=diary]').click();
 assert.equal(d.querySelector('#inventory').hidden,true);
 const clean=new f.w.Event('beforeunload',{cancelable:true});f.w.dispatchEvent(clean);assert.equal(clean.defaultPrevented,false);
 }finally{f.close();}
});

test('아이템 종류 필터·기본 조명/액자 제외·도크 높이 조절',async()=>{
 const rd=roomData();
 for(const [id,shape,theme] of [['lamp0','lamp','기본'],['frame0','frame','추리'],['lamp1','lamp','추리']]) {rd.shop_items.push({id,shape,theme,name:id});rd.room_items.push({user_id:'user1',item_id:id});}
 const f=await fixture('room',{query:new URLSearchParams('?id=user1'),data:rd});
 try {const d=f.w.document;d.querySelector('#decorate').click();
 assert.ok(d.querySelector('[data-item=basic-shelf]'));
 assert.equal(d.querySelector('[data-item=lamp0]'),null);assert.equal(d.querySelector('[data-item=frame0]'),null);
 d.querySelector('[data-kind=lamp]').click();assert.ok(d.querySelector('[data-item=lamp1]'));assert.equal(d.querySelector('[data-item=sofa1]'),null);
 d.querySelector('[data-kind=chair]').click();assert.match(d.querySelector('#inventory-grid').textContent,/없습니다/);
 d.querySelector('[data-kind=all]').click();assert.ok(d.querySelector('[data-item=sofa1]'));
 const bar=d.querySelector('#inventory-resize');bar.dispatchEvent(new f.w.MouseEvent('pointerdown',{clientY:200}));bar.dispatchEvent(new f.w.MouseEvent('pointermove',{clientY:100}));bar.dispatchEvent(new f.w.MouseEvent('pointerup'));
 assert.equal(d.querySelector('#inventory').style.height,'380px');
 assert.equal(d.querySelector('#inventory').style.marginTop,'-100px');
 d.querySelector('#inventory-toggle').click();assert.equal(d.querySelector('#inventory-filters').hidden,true);
 d.querySelector('#inventory-toggle').click();assert.equal(d.querySelector('#inventory').style.height,'380px');
 }finally{f.close();}
});
test('책장은 전시 버튼 없이 조회만, +로 다섯 권까지 전시',async()=>{
 const rd=roomData();const books=Array.from({length:6},(_,i)=>({id:'ex'+i,title:'전시 책 '+i,author:'작가'}));rd.books=books;
 const f=await fixture('room',{query:new URLSearchParams('?id=user1'),data:rd,db:{rpc:async n=>({data:n==='public_shelf'?books:{today:0,total:0},error:null})}});
 try {const d=f.w.document;d.querySelector('#generic-dialog').showModal=()=>{};d.querySelector('#generic-dialog').close=()=>{};
 d.querySelector('#fixed-shelf').click();await f.settle();await new Promise(r=>setImmediate(r));assert.equal(d.querySelector('[data-frame-book]'),null);
 for(let i=0;i<5;i++) {d.querySelector('#add-exhibit').click();await f.settle();await new Promise(r=>setImmediate(r));d.querySelector('[data-frame-book="ex'+i+'"]').click();await f.settle();await new Promise(r=>setImmediate(r));}
 assert.equal(d.querySelectorAll('[data-frame]').length,5);assert.equal(d.querySelector('#add-exhibit').disabled,true);assert.equal(d.querySelector('#exhibit-count').textContent,'5/5');
 d.querySelector('[data-frame="0"]').click();await f.settle();await new Promise(r=>setImmediate(r));d.querySelector('#clear-frame').click();await f.settle();await new Promise(r=>setImmediate(r));
 assert.equal(d.querySelectorAll('[data-frame]').length,4);assert.equal(d.querySelector('#add-exhibit').disabled,false);
 assert.equal(f.errors.length,0);
 }finally{f.close();}
});
