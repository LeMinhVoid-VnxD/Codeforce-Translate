'use strict';

const CENSOR_NAME = '_LeMinhVoid_VnxD';
const CENSORED    = '_[********]_[****]';

let censorCount = 0;
let badgeTimer = null;
let badgeEl = null;

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const CENSOR_RE = new RegExp(esc(CENSOR_NAME), 'g');

function censorText(text) {
  return text.split(CENSOR_NAME).join(CENSORED);
}

function censorNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (!node.textContent.includes(CENSOR_NAME)) return;
    censorCount += (node.textContent.match(CENSOR_RE) || []).length;
    node.textContent = censorText(node.textContent);
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

function showBadge() {
  if (badgeEl) badgeEl.remove();
  if (!document.body) return;
  badgeEl = document.createElement('div');
  badgeEl.textContent = '\u2714 \u0110\xE3 che: ' + censorCount;
  Object.assign(badgeEl.style, {
    position: 'fixed', bottom: '16px', right: '16px',
    zIndex: 2147483647, background: '#3b5998', color: '#fff',
    padding: '8px 16px', borderRadius: '20px',
    font: '600 13px/1.4 Arial,sans-serif',
    boxShadow: '0 2px 8px rgba(0,0,0,.25)',
    cursor: 'pointer', userSelect: 'none',
  });
  badgeEl.addEventListener('click', dismissBadge);
  document.body.appendChild(badgeEl);
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(dismissBadge, 5000);
}

function dismissBadge() {
  if (badgeEl) { badgeEl.remove(); badgeEl = null; }
  clearTimeout(badgeTimer);
}

function sendCount() {
  try { chrome.runtime.sendMessage({ action: 'censorCount', count: censorCount }); } catch (e) {}
}

function run() {
  chrome.storage.local.get('censorEnabled', (res) => {
    if (res.censorEnabled === false) return;

    const root = document.documentElement || document.body || document;
    censorNode(root);

    if (document.title.includes(CENSOR_NAME)) {
      censorCount += (document.title.match(CENSOR_RE) || []).length;
      document.title = censorText(document.title);
    }

    if (censorCount > 0) { sendCount(); showBadge(); }

    const obs = new MutationObserver((mutations) => {
      let added = 0;
      for (const m of mutations) {
        for (const n of m.addedNodes) censorNode(n);
        if (m.type === 'characterData' && m.target.textContent.includes(CENSOR_NAME)) {
          added += (m.target.textContent.match(CENSOR_RE) || []).length;
          m.target.textContent = censorText(m.target.textContent);
        }
      }
      if (added > 0) { censorCount += added; sendCount(); showBadge(); }
    });
    obs.observe(root, { childList: true, subtree: true, characterData: true });
  });
}

run();
