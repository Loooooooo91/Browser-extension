(function () {
    if (window.__highlight_inited__) return;
    window.__highlight_inited__ = true;

    let keywordList = [];
    const MARK_ATTR = "__red_highlight_mark";
    let observer = null;
    let highlightTimer = null;
    let isHighlighting = false; 

    function initObserver() {
        if (observer) observer.disconnect();
        observer = new MutationObserver(() => {
            clearTimeout(highlightTimer);

            highlightTimer = setTimeout(() => {

                if (!isHighlighting) refreshHighlight();
            }, 500);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function refreshHighlight() {
        if (isHighlighting) return; 
        isHighlighting = true;

        try {
            observer?.disconnect();
            clearAllHighlight();
            if (keywordList.length > 0) {
                scanAndHighlight(document.body, keywordList);
            }
        } finally {
            initObserver();
            isHighlighting = false;
        }
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type !== "highlight") return;
        keywordList = msg.keywords || [];
        clearTimeout(highlightTimer);
        refreshHighlight();
        return true;
    });

    (async function init() {
        const cache = await chrome.storage.local.get("highlight_keywords_cache");
        const raw = cache["highlight_keywords_cache"] || "";
        keywordList = raw.split(/\s+/).filter(s => s.trim());

        refreshHighlight();
    })();


    function clearAllHighlight() {
        const spans = document.querySelectorAll(`span[${MARK_ATTR}]`);
        spans.forEach(span => {
            if (!span.parentNode) return;

            span.replaceWith(document.createTextNode(span.textContent));
        });
    }

    function scanAndHighlight(root, keywords) {
        if (!root || !keywords.length) return;
        const childNodes = Array.from(root.childNodes);
        const regStr = keywords.map(w => escapeReg(w)).join("|");
        const reg = new RegExp(`(${regStr})`, "g");

        for (const node of childNodes) {
            const skipTags = ["SCRIPT", "STYLE", "INPUT", "TEXTAREA", "SELECT"];
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (skipTags.includes(node.tagName) || node.hasAttribute(MARK_ATTR)) continue;
                scanAndHighlight(node, keywords);
            } else if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;

                if (!reg.test(text)) continue;
                reg.lastIndex = 0; 

                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;

                while ((match = reg.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                    }
                    const span = document.createElement("span");
                    span.setAttribute(MARK_ATTR, "1");
                    span.style.cssText = "background: #ff0000 !important; color: #ffffff !important; padding: 0 2px;";
                    span.textContent = match[1];
                    fragment.appendChild(span);
                    lastIndex = reg.lastIndex;
                }

                if (lastIndex > 0) {
                    if (lastIndex < text.length) {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                    }
                    node.parentNode.replaceChild(fragment, node);
                }
            }
        }
    }

    function escapeReg(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
})();
