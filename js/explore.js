import {
  init,
  $,
  data,
  user,
  avatar,
  esc,
  empty,
  save,
  remove,
  id,
  loadTables,
  attempt,
} from "./common.js";
attempt(async () => {
  await init();
  function render() {
    const q = $("#people-query").value;
    $("#people").innerHTML =
      data.profiles
        .filter((p) => p.nickname.includes(q))
        .map((p) => {
          const f = data.follows.find(
            (f) => f.follower_id === user?.id && f.following_id === p.id,
          );
          return `<article class="panel person">${avatar(p)}<h2>${esc(p.nickname)}</h2><p>${esc(p.intro || "등록된 자기소개가 없습니다.")}</p><a class="button" href="room.html?id=${p.id}">미니홈피 방문 ↗</a>${user && p.id !== user.id ? `<button class="secondary-button" data-follow="${p.id}">${f ? "팔로잉 · 해제" : "팔로우"}</button>` : ""}</article>`;
        })
        .join("") || empty("일치하는 독자가 없습니다.");
  }
  $("#people-query").oninput = render;
  $("#people").onclick = (e) => {
    const b = e.target.closest("[data-follow]");
    if (!b) return;
    attempt(async () => {
      b.disabled = true;
      try {
        const f = data.follows.find(
          (f) =>
            f.follower_id === user.id && f.following_id === b.dataset.follow,
        );
        if (f) await remove("follows", f.id);
        else
          await save("follows", {
            id: id(),
            follower_id: user.id,
            following_id: b.dataset.follow,
          });
        await loadTables(["follows"]);
        render();
      } finally {
        b.disabled = false;
      }
    });
  };
  render();
});
