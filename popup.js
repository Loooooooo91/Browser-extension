const textarea = document.getElementById('kw');
const STORAGE_KEY = "highlight_keywords_cache";


window.addEventListener('DOMContentLoaded', async () => {
  const cache = await chrome.storage.local.get(STORAGE_KEY);
  if (cache[STORAGE_KEY]) textarea.value = cache[STORAGE_KEY];
  sendHighlightMsg();
});


textarea.addEventListener('input', sendHighlightMsg);

async function sendHighlightMsg() {
  const rawText = textarea.value.trim();
  chrome.storage.local.set({ [STORAGE_KEY]: rawText });
  const keywordArr = rawText.split(/\s+/).filter(item => item.length > 0);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;


  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "highlight",
      keywords: keywordArr
    });
  } catch (e) {

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content.js"]
      });
      await chrome.tabs.sendMessage(tab.id, {
        type: "highlight",
        keywords: keywordArr
      });
    } catch (err) {

      console.log("Script injection is not supported on the current page：", err.message);
    }
  }
}