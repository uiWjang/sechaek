import {
  init,
  $,
  data,
  user,
  requireUser,
  bookBy,
  esc,
  empty,
  day,
  money,
  attempt,
} from "./common.js";
attempt(async () => {
  await init();
  if (!requireUser()) return;
  $("#stats-year").value = day().slice(0, 4);
  function renderGenres() {
    const year = $("#stats-year").value;
    const yearly = $("#genre-period").value === "year";
    const owned = data.library_items.filter(
      (l) =>
        l.user_id === user.id &&
        l.kind === "owned" &&
        (!yearly || l.purchased_at?.startsWith(year)),
    );
    const counts = new Map();
    for (const item of owned) {
      const clean = (values) => [
        ...new Set(
          (Array.isArray(values) ? values : [])
            .filter((v) => typeof v === "string")
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      ];
      let tags = clean(item.genres);
      if (!tags.length) tags = clean(bookBy(item.book_id)?.genres);
      if (!tags.length) tags = ["미분류"];
      tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    }
    $("#genre-summary").textContent =
      `${yearly ? year + "년 구매 도서" : "전체 소장 도서"} ${owned.length}권 기준`;
    if (!owned.length) {
      $("#genre-chart").innerHTML = empty(
        yearly
          ? "선택한 연도에 구매한 책이 없습니다."
          : "소장한 책이 없습니다. 책을 등록하면 장르 통계가 표시됩니다.",
      );
      return;
    }
    const rows = [...counts].sort((a, b) =>
      a[0] === "미분류"
        ? 1
        : b[0] === "미분류"
          ? -1
          : b[1] - a[1] || a[0].localeCompare(b[0], "ko"),
    );
    // Multiple genres count once per tag; shares use total genre assignments.
    const total = rows.reduce((sum, [, count]) => sum + count, 0);
    const colors = [
      "#789179",
      "#819bb0",
      "#bb8891",
      "#c1a164",
      "#9585aa",
      "#70a5a0",
      "#bc8b6c",
      "#9da56d",
      "#7987ad",
      "#ad819f",
      "#729eaf",
      "#a29889",
    ];
    const colorAt = (index) =>
      colors[index] || `hsl(${(index * 137.508) % 360} 25% 58%)`;
    const anchors = [];
    let angle = -Math.PI / 2;
    const slices = rows
      .map(([genre, count], index) => {
        const portion = count / total;
        const end = angle + portion * Math.PI * 2;
        const x1 = 160 + 132 * Math.cos(angle),
          y1 = 160 + 132 * Math.sin(angle);
        const x2 = 160 + 132 * Math.cos(end),
          y2 = 160 + 132 * Math.sin(end);
        const label = `${genre}: ${count}권, ${(portion * 100).toFixed(1)}%`;
        const fill = colorAt(index);
        const mid = (angle + end) / 2;
        anchors.push({
          x: (160 + 108 * Math.cos(mid)) / 3.2,
          y: (160 + 108 * Math.sin(mid)) / 3.2,
          label,
        });
        const attributes = `class="genre-slice" data-slice="${index}" tabindex="0" role="img" aria-label="${esc(label)}" aria-describedby="genre-tooltip"`;
        const shape =
          rows.length === 1
            ? `<circle ${attributes} cx="160" cy="160" r="132" fill="${fill}"/>`
            : `<path ${attributes} d="M160 160 L${x1} ${y1} A132 132 0 ${portion > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z" fill="${fill}" stroke="#fbf9f5" stroke-width="2"/>`;
        angle = end;
        return shape;
      })
      .join("");
    const legend = rows
      .map(
        ([genre, count], index) =>
          `<div class="genre-stat-row"><span class="genre-stat-name"><i class="genre-swatch" style="background:${colorAt(index)}" aria-hidden="true"></i>${esc(genre)}</span><span class="genre-stat-value">${count}권 · ${((count / total) * 100).toFixed(1)}%</span></div>`,
      )
      .join("");
    $("#genre-chart").innerHTML =
      `<div class="genre-pie-wrap"><svg class="genre-pie" viewBox="0 0 320 320" role="group" aria-label="소장 도서 장르별 원형 그래프">${slices}<circle cx="160" cy="160" r="83" fill="#fbf9f5"/><text x="160" y="153" text-anchor="middle" class="genre-pie-total">${owned.length}권</text><text x="160" y="181" text-anchor="middle" class="genre-pie-caption">소장한 책</text></svg><div id="genre-tooltip" class="genre-tooltip" role="tooltip" hidden></div></div><div class="genre-legend">${legend}</div>`;
    const tooltip = $("#genre-tooltip");
    const hide = () => {
      tooltip.hidden = true;
    };
    $("#genre-chart")
      .querySelectorAll("[data-slice]")
      .forEach((slice) => {
        const show = () => {
          const a = anchors[Number(slice.dataset.slice)];
          tooltip.textContent = a.label;
          tooltip.style.left = Math.max(28, Math.min(72, a.x)) + "%";
          tooltip.style.top = a.y + "%";
          tooltip.hidden = false;
        };
        slice.addEventListener("pointerenter", show);
        slice.addEventListener("pointerleave", hide);
        slice.addEventListener("focus", show);
        slice.addEventListener("blur", hide);
        slice.addEventListener("click", show);
        slice.addEventListener("keydown", (e) => {
          if (e.key === "Escape") hide();
        });
      });
  }
  $("#genre-period").onchange = renderGenres;
  function render() {
    renderGenres();
    const year = $("#stats-year").value,
      items = data.library_items.filter(
        (l) =>
          l.user_id === user.id &&
          l.kind === "owned" &&
          l.price != null &&
          l.purchased_at?.startsWith(year),
      );
    if (!items.length) {
      $("#stats-summary").innerHTML = empty("이 해의 구매 내역이 없습니다.");
      $("#stats-chart").innerHTML = "";
      $("#stats-table").innerHTML = "";
      return;
    }
    const values = Array.from({ length: 12 }, (_, i) =>
        items
          .filter((l) => Number(l.purchased_at.slice(5, 7)) === i + 1)
          .reduce((n, l) => n + l.price, 0),
      ),
      max = Math.max(...values, 1);
    const counts = {};
    items.forEach((l) => {
      if (l.store) counts[l.store] = (counts[l.store] || 0) + 1;
    });
    const most = Math.max(0, ...Object.values(counts));
    $("#stats-summary").innerHTML =
      `<div><span>총 구매금액</span><h2>${money(items.reduce((n, l) => n + l.price, 0))}</h2></div><div><span>소장한 책</span><h2>${items.length}권</h2></div><div><span>가장 자주 찾은 서점</span><h2>${esc(
        Object.keys(counts)
          .filter((k) => counts[k] === most)
          .join(" · ") || "미입력",
      )}</h2></div>`;
    $("#stats-chart").innerHTML =
      `<svg class="spending-chart" viewBox="0 0 900 360" role="group" aria-label="월별 구매금액 막대 차트"><line x1="60" y1="290" x2="890" y2="290" stroke="#3b2f25"/>${values
        .map((v, i) => {
          const h = (v / max) * 225,
            x = 70 + i * 68;
          return `<g class="spending-month" tabindex="0" role="img" aria-label="${i + 1}월 ${money(v)}" aria-describedby="spending-tooltip" data-month="${i}" style="--bar-delay:${i * 35}ms"><rect class="spending-hit" x="${x - 10}" y="40" width="60" height="285" fill="transparent"/><rect class="spending-bar" x="${x}" y="${290 - h}" width="40" height="${h}" fill="#d5c1a8" stroke="${v === max ? "#5f7c59" : "#d5c1a8"}" stroke-width="2"/><text x="${x + 20}" y="320" text-anchor="middle" font-size="15">${i + 1}월</text><text x="${x + 20}" y="${280 - h}" text-anchor="middle" font-size="11">${v.toLocaleString()}</text></g>`;
        })
        .join("")}</svg><div id="spending-tooltip" class="genre-tooltip spending-tooltip" role="tooltip" hidden></div>`;
    const tip = $('#spending-tooltip');
    const hideTip = () => { tip.hidden = true; };
    $('#stats-chart').querySelectorAll('[data-month]').forEach(bar => {
      const showTip = () => {
        const i = Number(bar.dataset.month);
        tip.textContent = `${i + 1}월 · ${money(values[i])}`;
        tip.style.left = Math.max(14, Math.min(86, (90 + i * 68) / 9)) + '%';
        tip.style.top = Math.max(15, (280 - values[i] / max * 225) / 3.6) + '%';
        tip.hidden = false;
      };
      bar.addEventListener('pointerenter',showTip);
      bar.addEventListener('pointerleave',hideTip);
      bar.addEventListener('focus',showTip);
      bar.addEventListener('blur',hideTip);
      bar.addEventListener('click',showTip);
      bar.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip();});
    });
    $("#stats-table").innerHTML =
      "<table><caption>구매 내역</caption><thead><tr><th>도서</th><th>구매일</th><th>서점</th><th>결제금액</th></tr></thead><tbody>" +
      items
        .map(
          (l) =>
            `<tr><td>${esc(bookBy(l.book_id)?.title)}</td><td>${l.purchased_at}</td><td>${esc(l.store)}</td><td>${money(l.price)}</td></tr>`,
        )
        .join("") +
      "</tbody></table>";
  }
  $("#stats-year").onchange = render;
  render();
});
