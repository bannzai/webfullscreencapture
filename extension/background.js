importScripts("capture-plan.js");

// chrome.tabs.captureVisibleTab は 1 秒あたり 2 回までの割り当てがあり、超えると例外になる
const CAPTURE_INTERVAL_MS = 600;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "capture") {
        return false;
    }
    captureFullPage(message.tabId)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) => sendResponse({ ok: false, error: describeError(error) }));
    return true;
});

function describeError(error) {
    return (error && error.message) || String(error);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// popup が閉じていると受け手がいないため、送信失敗は無視する
function notifyProgress(tabId, done, total) {
    chrome.runtime.sendMessage({ type: "progress", tabId, done, total }).catch(() => {});
}

function runInTab(tabId, func, args = []) {
    return chrome.scripting
        .executeScript({ target: { tabId }, func, args })
        .then((results) => results[0] && results[0].result);
}

// ---- ページ内で実行する関数 (シリアライズされて注入されるため、外側の変数を参照しない) ----

// ページ寸法と、撮影中に非表示にする固定要素 (fixed / 先頭ビューポートに見えている sticky) を記録する
function prepareInPage() {
    const doc = document.documentElement;
    const scrollHeight = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
    const viewportHeight = window.innerHeight;
    const overlays = [];
    for (const element of document.querySelectorAll("body *")) {
        const position = getComputedStyle(element).position;
        if (position !== "fixed" && position !== "sticky") {
            continue;
        }
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            continue;
        }
        if (position === "sticky" && rect.top + window.scrollY >= viewportHeight) {
            continue;
        }
        overlays.push(element);
    }
    // macOS のオーバーレイスクロールバーはスクロール中に表示されて撮影に写り込むため、撮影中だけ非表示にする
    const scrollbarStyle = document.createElement("style");
    scrollbarStyle.textContent =
        "html { scrollbar-width: none !important; } html::-webkit-scrollbar { display: none !important; }";
    window.__webFullScreenCapture = {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        scrollBehavior: doc.style.scrollBehavior,
        scrollbarStyle,
        overlays: overlays.map((element) => ({ element, visibility: element.style.visibility })),
    };
    doc.style.scrollBehavior = "auto";
    document.head.appendChild(scrollbarStyle);
    return {
        scrollHeight,
        viewportHeight,
        // clientWidth はスクロールバーを含まない幅。撮影画像のスクロールバー部分を切り落とすのに使う
        contentWidth: doc.clientWidth,
        devicePixelRatio: window.devicePixelRatio || 1,
        title: document.title,
    };
}

// 指定位置へスクロールし、描画が落ち着くのを待ってから実際のスクロール位置を返す
function scrollInPage(y, hideOverlays) {
    const state = window.__webFullScreenCapture;
    if (state) {
        for (const { element } of state.overlays) {
            element.style.visibility = hideOverlays ? "hidden" : element.style.visibility;
        }
    }
    window.scrollTo(0, y);
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve({ scrollY: window.scrollY }));
        });
    });
}

function restoreInPage() {
    const state = window.__webFullScreenCapture;
    if (!state) {
        return;
    }
    for (const { element, visibility } of state.overlays) {
        element.style.visibility = visibility;
    }
    state.scrollbarStyle.remove();
    window.scrollTo(state.scrollX, state.scrollY);
    document.documentElement.style.scrollBehavior = state.scrollBehavior;
    delete window.__webFullScreenCapture;
}

// ---- service worker 側 ----

async function captureFullPage(tabId) {
    const tab = await chrome.tabs.get(tabId);
    // captureVisibleTab はウィンドウで表示中のタブを写すため、対象タブを前面にしてから撮る
    await chrome.tabs.update(tabId, { active: true });
    const metrics = await runInTab(tabId, prepareInPage);
    try {
        const offsets = planScrollOffsets(metrics.scrollHeight, metrics.viewportHeight);
        const dpr = metrics.devicePixelRatio;
        const scale = canvasScale(metrics.contentWidth * dpr, metrics.scrollHeight * dpr);
        const canvas = new OffscreenCanvas(
            Math.round(metrics.contentWidth * dpr * scale),
            Math.round(metrics.scrollHeight * dpr * scale),
        );
        const context = canvas.getContext("2d");

        let lastCaptureAt = 0;
        for (let index = 0; index < offsets.length; index++) {
            const { scrollY } = await runInTab(tabId, scrollInPage, [offsets[index], index > 0]);
            await sleep(Math.max(0, lastCaptureAt + CAPTURE_INTERVAL_MS - Date.now()));
            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
            lastCaptureAt = Date.now();
            const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
            const sourceWidth = Math.min(bitmap.width, Math.round(metrics.contentWidth * dpr));
            context.drawImage(
                bitmap,
                0, 0, sourceWidth, bitmap.height,
                0, Math.round(scrollY * dpr * scale), Math.round(sourceWidth * scale), Math.round(bitmap.height * scale),
            );
            bitmap.close();
            notifyProgress(tabId, index + 1, offsets.length);
        }

        const blob = await canvas.convertToBlob({ type: "image/png" });
        const filename = buildFilename(metrics.title);
        await chrome.downloads.download({ url: await blobToDataUrl(blob), filename, saveAs: false });
        return { filename, frames: offsets.length, width: canvas.width, height: canvas.height };
    } finally {
        await runInTab(tabId, restoreInPage).catch(() => {});
    }
}

// service worker では URL.createObjectURL が使えないため、downloads には data URL で渡す
function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}
