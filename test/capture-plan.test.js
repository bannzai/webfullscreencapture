const { test } = require("node:test");
const assert = require("node:assert");
const {
    MAX_CANVAS_DIMENSION,
    planScrollOffsets,
    canvasScale,
    buildFilename,
} = require("../extension/capture-plan.js");

test("ビューポート高さ刻みで進み、末尾はページ末尾に揃える", () => {
    assert.deepStrictEqual(planScrollOffsets(1000, 400), [0, 400, 600]);
});

test("ページ高さがビューポートの整数倍なら重複するフレームを作らない", () => {
    assert.deepStrictEqual(planScrollOffsets(800, 400), [0, 400]);
});

test("ページがビューポートに収まるなら 1 フレームだけ", () => {
    assert.deepStrictEqual(planScrollOffsets(400, 400), [0]);
    assert.deepStrictEqual(planScrollOffsets(300, 400), [0]);
});

test("寸法が不正でも最低 1 フレームを返す", () => {
    assert.deepStrictEqual(planScrollOffsets(0, 400), [0]);
    assert.deepStrictEqual(planScrollOffsets(1000, 0), [0]);
    assert.deepStrictEqual(planScrollOffsets(NaN, 400), [0]);
});

test("canvas の上限に収まる画像は縮小しない", () => {
    assert.strictEqual(canvasScale(2560, 10000), 1);
    assert.strictEqual(canvasScale(MAX_CANVAS_DIMENSION, MAX_CANVAS_DIMENSION), 1);
});

test("上限を超える辺に合わせて縮小する", () => {
    assert.strictEqual(canvasScale(2560, MAX_CANVAS_DIMENSION * 2), 0.5);
    assert.strictEqual(canvasScale(MAX_CANVAS_DIMENSION * 4, 100), 0.25);
    assert.strictEqual(canvasScale(0, 100), 1);
});

test("ファイル名はタイトルの禁止文字を除き、ローカル時刻を付ける", () => {
    const date = new Date(2026, 8, 5, 21, 30, 7);
    assert.strictEqual(buildFilename("Example: a/b*c?", date), "Example a b c_20260905-213007.png");
});

test("タイトルが空ならフォールバック名を使い、長いタイトルは切り詰める", () => {
    const date = new Date(2026, 0, 1, 0, 0, 0);
    assert.strictEqual(buildFilename("", date), "screenshot_20260101-000000.png");
    assert.strictEqual(buildFilename("a".repeat(200), date).length, "a".repeat(80).length + "_20260101-000000.png".length);
});
