// 방과 상점에서 사용하는 SVG 소품. 색과 도형을 직접 수정할 수 있습니다.
export function art(shape, theme) {
  const scene = {
    로맨스: "library",
    판타지: "attic",
    추리: "train",
    SF: "camp",
  }[theme];
  if (shape === "wall" && scene)
    return `<img class="item-sprite theme-sprite" src="assets/rooms/${scene}-empty.png" alt="" loading="lazy" draggable="false">`;
  const cells = {
    sofa: 0,
    chair: 1,
    desk: 2,
    rug: 3,
    plant: 4,
    lamp: 5,
    clock: 6,
    frame: 7,
    shelf: 8,
  };
  if (scene && shape in cells) {
    const cell = cells[shape];
    return `<span class="item-sprite furniture-atlas" aria-hidden="true" style="background-image:url('assets/furniture/${scene}-atlas.png');background-position:${(cell % 3) * 50}% ${Math.floor(cell / 3) * 50}%"></span>`;
  }
  if (["sofa", "chair", "plant", "lamp", "shelf"].includes(shape))
    return `<img class="item-sprite" src="assets/furniture/${shape}.png" alt="" loading="lazy" draggable="false">`;

  const paths = {
    plant:
      '<path d="M34 63h32l-7 29H41z" fill="#d5c1a8"/><path d="M50 65V24"/><path d="M49 48C18 49 19 22 25 22c21 1 27 15 24 26Zm3-13c0-22 13-28 22-24 6 14-2 27-22 24Z" fill="#5f7c59"/>',
    lamp: '<path d="m31 16-15 35h68L69 16Z" fill="#d5c1a8"/><path d="M50 52v38M29 92h42M64 53v17"/>',
    rug: '<ellipse cx="50" cy="62" rx="46" ry="23" fill="#d5c1a8"/><ellipse cx="50" cy="62" rx="35" ry="15" stroke="#5f7c59"/>',
    clock:
      '<circle cx="50" cy="50" r="34" fill="#d5c1a8"/><circle cx="50" cy="50" r="27" fill="#fbf9f5"/><path d="M50 29v23l17 8M50 20v3M20 50h3M77 50h3M50 77v3"/>',
    outfit:
      '<path d="m32 17-22 22 14 14 8-8v44h36V45l8 8 14-14-22-22-18 9Z" fill="#5f7c59"/><path d="m33 18 17 17 17-17M50 35v53" stroke="#d5c1a8"/>',
    frame:
      '<path d="M14 12h72v77H14z" fill="#d5c1a8"/><path d="M23 21h54v59H23z" fill="#fbf9f5"/><path d="m29 67 17-25 10 14 12-9 7 20" stroke="#5f7c59"/>',
    shelf:
      '<path d="M14 9h72v83H14z" fill="#d5c1a8"/><path d="M18 48h64M18 83h64M25 18v27m10-28v28m10-22v22m19-27v27M27 59v21m10-24v24m22-20v20m10-25v25" stroke="#5f7c59" stroke-width="7"/>',
    wall: '<path d="M14 12h72v77H14z" fill="#f3f0eb"/><path d="M25 15v70M40 15v70M55 15v70M70 15v70" stroke="#d5c1a8"/>',
    floor:
      '<path d="M8 39 50 15l42 24v35L50 95 8 74Z" fill="#d5c1a8"/><path d="m8 39 42 24 42-24M50 63v32m-27-47 42-24m-1 47 27-16M23 48v33"/>',
  };
  return `<svg viewBox="0 0 100 100" aria-hidden="true" class="item-art" fill="none" stroke="#3b2f25" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${paths[shape] || paths.floor}</svg>`;
}
export function person(outfit = false) {
  return `<svg viewBox="0 0 90 145" role="img" aria-label="책을 든 아바타"><ellipse cx="45" cy="136" rx="31" ry="6" fill="#3b2f25" opacity=".12"/><path d="M31 106v24m29-24v24" stroke="#3b2f25" stroke-width="11"/><path d="m23 68-4 43h52l-4-43Z" fill="${outfit ? "#5f7c59" : "#d5c1a8"}" stroke="#3b2f25" stroke-width="2"/><circle cx="45" cy="43" r="25" fill="#f3f0eb" stroke="#3b2f25" stroke-width="2"/><path d="M20 43c-5-35 54-42 51 1-16-2-22-15-23-15-8 13-17 16-28 14Z" fill="#3b2f25"/><path d="M37 47v2m16-2v2m-14 9q6 5 12 0" stroke="#3b2f25" stroke-width="2"/><path d="m25 79 20 6 20-6v25l-20 6-20-6Z" fill="#5f7c59" stroke="#3b2f25" stroke-width="2"/><path d="M45 85v25" stroke="#fbf9f5"/></svg>`;
}
