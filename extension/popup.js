const captureButton = document.getElementById("capture");
const statusElement = document.getElementById("status");

function showStatus(text, kind = "") {
    statusElement.textContent = text;
    statusElement.className = kind;
}

// chrome:// や拡張ページ、Chrome ウェブストアには content script を注入できず撮影できない
function isCapturableUrl(url) {
    return /^(https?|file):/.test(url || "") && !/^https:\/\/chromewebstore\.google\.com\//.test(url);
}

chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "progress") {
        showStatus(`撮影中 ${message.done} / ${message.total}`);
    }
});

captureButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // url は activeTab が付与されたタブでだけ読める。読めない場合は撮影を試み、background 側のエラーをそのまま表示する
    if (!tab || (tab.url && !isCapturableUrl(tab.url))) {
        showStatus("このページは撮影できません (http / https / file のページで使ってください)", "error");
        return;
    }
    captureButton.disabled = true;
    showStatus("準備中");
    try {
        const result = await chrome.runtime.sendMessage({ type: "capture", tabId: tab.id });
        if (result && result.ok) {
            showStatus(`保存しました: ${result.filename} (${result.width}×${result.height}px)`, "done");
        } else {
            showStatus(`失敗しました: ${(result && result.error) || "不明なエラー"}`, "error");
        }
    } catch (error) {
        showStatus(`失敗しました: ${error.message}`, "error");
    } finally {
        captureButton.disabled = false;
    }
});
