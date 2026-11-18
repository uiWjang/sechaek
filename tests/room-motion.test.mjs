import test from "node:test";
import assert from "node:assert/strict";
import { scenes, inPolygon, clampToFloor, advance } from "../js/room-motion.js";
test("모든 테마의 시작점은 걸을 수 있는 바닥에 있다", () => {
  for (const scene of Object.values(scenes))
    assert.ok(inPolygon({ x: 0.5, y: 0.76 }, scene.floor));
});
test("바닥 밖 목표는 각 테마의 가장 가까운 경계로 제한된다", () => {
  for (const scene of Object.values(scenes)) {
    const p = clampToFloor({ x: 0, y: 0 }, scene.floor);
    assert.ok(p.x > 0 && p.y > 0);
    const middle = {
      x: scene.floor.reduce((a, b) => a + b[0], 0) / 4,
      y: scene.floor.reduce((a, b) => a + b[1], 0) / 4,
    };
    assert.ok(
      inPolygon(
        {
          x: p.x * 0.999 + middle.x * 0.001,
          y: p.y * 0.999 + middle.y * 0.001,
        },
        scene.floor,
      ),
    );
  }
});
test("아바타는 목표를 향해 이동하고 초과하지 않는다", () => {
  let p = { x: 0.5, y: 0.76 };
  const target = { x: 0.65, y: 0.78 };
  for (let i = 0; i < 200; i++) {
    const d = Math.hypot(target.x - p.x, target.y - p.y);
    p = advance(p, target, 1 / 60);
    assert.ok(Math.hypot(target.x - p.x, target.y - p.y) <= d + 1e-9);
  }
  assert.deepEqual(p, target);
});
test("프레임 지연이 생겨도 아바타가 순간이동하지 않는다", () => {
  const p = advance({ x: 0, y: 0 }, { x: 1, y: 0 }, 10);
  assert.ok(p.x <= 0.0081);
  assert.equal(p.y, 0);
});
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
test("이동 컨트롤러: 클릭 이동·WASD 입력·테마 구매 승인 연결·꾸미기 중 이동 제한", async () => {
  const html = await readFile(new URL("../room.html", import.meta.url), "utf8");
  const dom = new JSDOM(html, {
      url: "http://127.0.0.1:5174/room.html",
      runScripts: "outside-only",
    }),
    w = dom.window;
  try {
    const root = w.document.querySelector("#miniroom"),
      av = w.document.querySelector("#room-avatar");
    w.document.querySelector("#page-content").hidden = false;
    let now = 0,
      seq = 0,
      editing = false;
    const queue = new Map();
    w.requestAnimationFrame = (fn) => {
      queue.set(++seq, fn);
      return seq;
    };
    w.cancelAnimationFrame = (id) => queue.delete(id);
    const step = () => {
      now += 16;
      const callbacks = [...queue.values()];
      queue.clear();
      callbacks.forEach((fn) => fn(now));
    };
    Object.defineProperty(w.document, "hidden", { value: false });
    w.Image = class {
      set src(v) {
        this._src = v;
        queueMicrotask(() => this.onload());
      }
      get src() {
        return this._src;
      }
    };
    root.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
    });
    const source = (
      await readFile(new URL("../js/room-motion.js", import.meta.url), "utf8")
    ).replace(/export /g, "");
    const mount = w.Function(source + ";return mountRoomMotion;")();
    let requested;
    const controller = mount({
      room: root,
      avatar: av,
      ownerId: "fixture",
      isEditing: () => editing,
      initialScene: "library",
      onSceneRequest: (key) => {
        requested = key;
      },
    });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(root.dataset.scene, "library");
    root.dispatchEvent(
      new w.MouseEvent("pointerdown", {
        clientX: 650,
        clientY: 780,
        bubbles: true,
      }),
    );
    root.dispatchEvent(
      new w.MouseEvent("click", { clientX: 650, clientY: 780, bubbles: true }),
    );
    for (let i = 0; i < 200; i++) step();
    assert.ok(Math.abs(Number(av.dataset.x) - 0.65) < 0.002);
    root.dispatchEvent(
      new w.KeyboardEvent("keydown", { key: "A", bubbles: true }),
    );
    step();
    step();
    w.dispatchEvent(new w.KeyboardEvent("keyup", { key: "A" }));
    for (let i = 0; i < 40; i++) step();
    assert.ok(Number(av.dataset.x) < 0.65);
    editing = true;
    const before = av.dataset.x;
    root.dispatchEvent(
      new w.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    for (let i = 0; i < 20; i++) step();
    assert.equal(av.dataset.x, before);
    w.document.querySelector('[data-scene="camp"]').click();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(requested, "camp");
    assert.equal(
      root.dataset.scene,
      "library",
      "picker must not bypass ownership handler",
    );
    await controller.setScene("camp");
    assert.equal(root.dataset.scene, "camp");
    assert.equal(w.localStorage.getItem("sechaek-room-scene:fixture"), null);
  } finally {
    w.close();
  }
});
