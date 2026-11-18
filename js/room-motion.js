// Pixel room backgrounds + a local, frame-rate-independent walking controller.
// Positions are normalized to image width/height; DB furniture coordinates are untouched.
export const scenes = {
  basic: {
    name: "기본 서재",
    floor: [
      [0.4, 0.63],
      [0.84, 0.77],
      [0.5, 0.92],
      [0.18, 0.77],
    ],
    shelf: [0.12, 0.41, 0.27, 0.28],
    desk: [0.82, 0.83, 0.12, 0.06],
  },
  library: {
    name: "햇살 서재",
    floor: [
      [0.4, 0.63],
      [0.84, 0.77],
      [0.5, 0.92],
      [0.18, 0.77],
    ],
    shelf: [0.06, 0.28, 0.31, 0.39],
    desk: [0.38, 0.39, 0.22, 0.17],
  },
  attic: {
    name: "숲속 다락방",
    floor: [
      [0.46, 0.57],
      [0.79, 0.73],
      [0.5, 0.92],
      [0.17, 0.76],
    ],
    shelf: [0.06, 0.33, 0.2, 0.32],
    desk: [0.28, 0.39, 0.18, 0.16],
  },
  train: {
    name: "책 읽는 기차",
    floor: [
      [0.38, 0.61],
      [0.85, 0.76],
      [0.5, 0.91],
      [0.15, 0.75],
    ],
    shelf: [0.08, 0.35, 0.19, 0.29],
    desk: [0.43, 0.44, 0.44, 0.18],
  },
  camp: {
    name: "물가의 캠핑",
    floor: [
      [0.48, 0.52],
      [0.77, 0.65],
      [0.53, 0.79],
      [0.25, 0.66],
    ],
    shelf: [0.18, 0.39, 0.19, 0.17],
    desk: [0.65, 0.44, 0.17, 0.16],
  },
};
export function inPolygon(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i],
      [xj, yj] = polygon[j];
    if (
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}
export function clampToFloor(p, polygon) {
  if (inPolygon(p, polygon)) return { ...p };
  let best = null,
    distance = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length],
      dx = b[0] - a[0],
      dy = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (dx * dx + dy * dy),
      ),
    );
    const q = { x: a[0] + t * dx, y: a[1] + t * dy },
      d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < distance) {
      best = q;
      distance = d;
    }
  }
  return best;
}
export function advance(position, target, seconds, speed = 0.16) {
  const dx = target.x - position.x,
    dy = target.y - position.y,
    d = Math.hypot(dx, dy),
    step = speed * Math.min(0.05, Math.max(0, seconds));
  return d <= step
    ? { ...target }
    : { x: position.x + (dx / d) * step, y: position.y + (dy / d) * step };
}
export function mountRoomMotion({
  room,
  avatar,
  ownerId,
  isEditing,
  initialScene = "basic",
  onSceneRequest,
}) {
  const image = room.querySelector(".pixel-room-background"),
    marker = room.querySelector(".walk-target");
  const status = document.querySelector("#room-motion-status"),
    buttons = [...document.querySelectorAll("[data-scene]")];
  let scene = "library",
    position = { x: 0.5, y: 0.77 },
    target = { ...position },
    keys = new Set(),
    raf = 0,
    last = 0,
    request = 0;
  let pointerStart = null;
  const directions = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    a: [-1, 0],
    d: [1, 0],
    w: [0, -1],
    s: [0, 1],
  };
  function paint() {
    avatar.style.left = position.x * 100 + "%";
    avatar.style.top = position.y * 100 + "%";
    avatar.dataset.x = position.x.toFixed(4);
    avatar.dataset.y = position.y.toFixed(4);
    avatar.style.zIndex = String(Math.round(position.y * 100));
  }
  function stop() {
    keys.clear();
    target = { ...position };
    avatar.classList.remove("walking");
    marker.hidden = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function tick(now) {
    raf = 0;
    if (document.hidden || isEditing() || room.closest("[hidden]")) {
      stop();
      return;
    }
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    if (keys.size) {
      let dx = 0,
        dy = 0;
      keys.forEach((k) => {
        dx += directions[k]?.[0] || 0;
        dy += directions[k]?.[1] || 0;
      });
      const n = Math.hypot(dx, dy);
      if (n)
        target = clampToFloor(
          {
            x: position.x + (dx / n) * 0.035,
            y: position.y + (dy / n) * 0.035,
          },
          scenes[scene].floor,
        );
      else target = { ...position };
    }
    const next = advance(position, target, dt),
      moving = Math.hypot(next.x - position.x, next.y - position.y) > 0.00001;
    if (moving) {
      if (Math.abs(next.x - position.x) > 0.00001)
        avatar.style.setProperty("--facing", next.x < position.x ? "-1" : "1");
      position = next;
      paint();
    }
    avatar.classList.toggle("walking", moving);
    if (
      Math.hypot(position.x - target.x, position.y - target.y) > 0.001 ||
      keys.size
    )
      raf = requestAnimationFrame(tick);
    else {
      avatar.classList.remove("walking");
      marker.hidden = true;
      last = 0;
      status.textContent = "바닥 클릭·터치 또는 WASD 키로 이동하세요.";
    }
  }
  function start() {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function placeHotspot(id, box) {
    const el = document.getElementById(id);
    [el.style.left, el.style.top, el.style.width, el.style.height] = box.map(
      (v) => v * 100 + "%",
    );
  }
  async function selectScene(key) {
    if (!scenes[key]) return;
    const token = ++request;
    stop();
    status.textContent = "방 그림을 불러오는 중입니다.";
    buttons.forEach((b) =>
      b.setAttribute("aria-busy", String(b.dataset.scene === key)),
    );
    try {
      const preload = new Image();
      await new Promise((resolve, reject) => {
        preload.onload = resolve;
        preload.onerror = reject;
        preload.src =
          key === "basic"
            ? "assets/rooms/basic.png"
            : "assets/rooms/" + key + "-empty.png";
      });
      if (token !== request) return;
      image.src = preload.src;
      image.alt = scenes[key].name + " 픽셀 아트 배경";
      scene = key;
      room.dataset.scene = key;
      position = clampToFloor({ x: 0.5, y: 0.76 }, scenes[key].floor);
      target = { ...position };
      paint();
      placeHotspot(
        "fixed-shelf",
        key === "camp" ? [0.64, 0.35, 0.26, 0.27] : [0.12, 0.41, 0.27, 0.28],
      );
      placeHotspot("room-desk", [0.82, 0.83, 0.12, 0.06]);
      buttons.forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.scene === key)),
      );
      status.textContent = "바닥 클릭·터치 또는 WASD 키로 이동하세요.";
    } catch {
      if (token === request)
        status.textContent =
          "테마 그림을 불러오지 못했습니다. 다시 선택해 주세요.";
    } finally {
      if (token === request)
        buttons.forEach((b) => b.removeAttribute("aria-busy"));
    }
  }
  buttons.forEach((b) =>
    b.addEventListener("click", () => onSceneRequest?.(b.dataset.scene)),
  );
  room.addEventListener("pointerdown", (e) => {
    pointerStart = { x: e.clientX, y: e.clientY };
  });
  room.addEventListener("click", (e) => {
    if (
      isEditing() ||
      e.target.closest("button,a,input,select,textarea") ||
      !pointerStart ||
      Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 12
    )
      return;
    const rect = room.getBoundingClientRect(),
      p = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    if (!inPolygon(p, scenes[scene].floor)) {
      status.textContent = "가구 앞의 빈 바닥을 눌러 주세요.";
      return;
    }
    room.focus({ preventScroll: true });
    keys.clear();
    target = p;
    marker.style.left = p.x * 100 + "%";
    marker.style.top = p.y * 100 + "%";
    marker.hidden = false;
    status.textContent = "이동 중";
    start();
  });
  function beginDirection(key) {
    const [dx, dy] = directions[key];
    target = clampToFloor(
      { x: position.x + dx * 0.025, y: position.y + dy * 0.025 },
      scenes[scene].floor,
    );
    keys.add(key);
    start();
  }
  room.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.target !== room || !directions[key] || isEditing()) return;
    e.preventDefault();
    beginDirection(key);
  });
  window.addEventListener("keyup", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (keys.has(key)) {
      keys.delete(key);
    }
  });
  room.addEventListener("blur", stop);
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  document.querySelectorAll("[data-walk]").forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      if (isEditing()) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      beginDirection(b.dataset.walk);
    });
    b.addEventListener("pointerup", () => keys.delete(b.dataset.walk));
    b.addEventListener("lostpointercapture", () => keys.delete(b.dataset.walk));
    b.addEventListener("pointercancel", stop);
    b.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !isEditing()) {
        e.preventDefault();
        beginDirection(b.dataset.walk);
      }
    });
    b.addEventListener("keyup", () => keys.delete(b.dataset.walk));
    b.addEventListener("blur", stop);
  });
  document.querySelector("#avatar-reset")?.addEventListener("click", () => {
    stop();
    position = { x: 0.5, y: 0.76 };
    target = { ...position };
    paint();
    room.focus({ preventScroll: true });
    status.textContent = "아바타를 가운데로 옮겼습니다.";
  });
  window.addEventListener("pagehide", stop);
  paint();
  selectScene(scenes[initialScene] ? initialScene : "basic");
  return { stop, setScene: selectScene };
}
