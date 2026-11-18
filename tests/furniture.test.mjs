import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { art } from '../js/art.js';
test('네 테마는 빈 방과 서로 다른 아홉 가구 셀을 제공한다', async () => {
  for (const [theme, scene] of Object.entries({로맨스:'library',판타지:'attic',추리:'train',SF:'camp'})) {
    const positions = new Set();
    for (const shape of ['sofa','chair','desk','rug','plant','lamp','clock','frame','shelf']) {
      const html = art(shape, theme);
      assert.ok(html.includes(`${scene}-atlas.png`));
      positions.add(html.match(/background-position:([^;]+)/)[1]);
    }
    assert.equal(positions.size, 9);
    assert.ok(art('wall',theme).includes(`${scene}-empty.png`));
    await access(new URL(`../assets/furniture/${scene}-atlas.png`,import.meta.url));
    await access(new URL(`../assets/rooms/${scene}-empty.png`,import.meta.url));
  }
});
