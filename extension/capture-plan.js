// Chrome が 1 枚の canvas に許す最大辺長 (px)。超えると描画が黙って失敗するため縮小して収める
const MAX_CANVAS_DIMENSION = 16384;

// ページ全体を撮るためのスクロール位置 (CSS px) の列。
// ビューポート高さ刻みで進み、最後はページ末尾がビューポート下端に揃う位置で終える
// (末尾のフレームは 1 つ前と重なってよい。描画側は実際の scrollY の位置に重ね描きする)
function planScrollOffsets(scrollHeight, viewportHeight) {
    if (!(viewportHeight > 0) || !(scrollHeight > 0)) {
        return [0];
    }
    const offsets = [];
    for (let y = 0; y + viewportHeight < scrollHeight; y += viewportHeight) {
        offsets.push(y);
    }
    offsets.push(Math.max(0, scrollHeight - viewportHeight));
    return offsets;
}

// 出力画像 (device px) が canvas の上限に収まる縮小率。収まるなら 1
function canvasScale(widthPx, heightPx, maxDimension = MAX_CANVAS_DIMENSION) {
    if (!(widthPx > 0) || !(heightPx > 0)) {
        return 1;
    }
    return Math.min(1, maxDimension / widthPx, maxDimension / heightPx);
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

// 保存ファイル名。ページタイトルからファイル名に使えない文字を除き、ローカル時刻を付けて衝突を避ける
function buildFilename(title, date = new Date()) {
    const base = String(title || "")
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80) || "screenshot";
    const stamp =
        `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
        `-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
    return `${base}_${stamp}.png`;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { MAX_CANVAS_DIMENSION, planScrollOffsets, canvasScale, buildFilename };
}
