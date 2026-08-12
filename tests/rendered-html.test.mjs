import assert from "node:assert/strict";
import test from "node:test";

import worker from "../dist/server/index.js";

const context = { waitUntil() {}, passThroughOnException() {} };

async function render(pathname) {
  const response = await worker.fetch(new Request(`https://example.com${pathname}`), {}, context);
  return { response, html: await response.text() };
}

test("免费人生卡片入口继续可用", async () => {
  const { response, html } = await render("/");
  assert.equal(response.status, 200);
  assert.match(html, /人生有迹/);
  assert.match(html, /免费卡片/);
});

test("成长地图入口可以正常渲染", async () => {
  const { response, html } = await render("/growth-map");
  assert.equal(response.status, 200);
  assert.match(html, /人生有迹/);
  assert.match(html, /成长地图/);
});
