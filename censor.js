'use strict';

const CENSOR_NAME = '_LeMinhVoid_VnxD';
const CENSORED    = '_[********]_[****]';

function censorText(text) {
  return text.split(CENSOR_NAME).join(CENSORED);
}

function censorNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent.includes(CENSOR_NAME)) {
      node.textContent = censorText(node.textContent);
    }
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
    if (node.shadowRoot) censorNode(node.shadowRoot);
    let child = node.firstChild;
    while (child) {
      const next = child.nextSibling;
      censorNode(child);
      child = next;
    }
  }
}

function run() {
  chrome.storage.local.get('censorEnabled', (res) => {
    if (res.censorEnabled === false) return;

    const root = document.documentElement || document.body || document;
    censorNode(root);

    if (document.title.includes(CENSOR_NAME)) {
      const t = document.title;
      document.title = censorText(t);
    }

    new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes) censorNode(n);
        if (m.type === 'characterData' && m.target.textContent.includes(CENSOR_NAME)) {
          m.target.textContent = censorText(m.target.textContent);
        }
      }
    }).observe(root, { childList: true, subtree: true, characterData: true });
  });
}

run();
