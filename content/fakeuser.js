'use strict';

const RANK_CLASS = {
  'legendary grandmaster': 'user-legendary',
  'international grandmaster': 'user-red',
  'grandmaster': 'user-red',
  'international master': 'user-orange',
  'master': 'user-orange',
  'candidate master': 'user-violet',
  'expert': 'user-blue',
  'specialist': 'user-cyan',
  'pupil': 'user-green',
  'newbie': 'user-gray',
};

let target = null;
let realHandle = '';
let obs = null;
let badgeEl = null;
let badgeTimer = null;
let mutating = false;

function getRankClass(user) {
  return RANK_CLASS[(user.rank || '').toLowerCase()] || 'user-gray';
}

function ratingColor(rating) {
  if (!rating) return 'gray';
  if (rating >= 2400) return 'red';
  if (rating >= 2200) return 'orange';
  if (rating >= 1900) return '#a0a';
  if (rating >= 1600) return 'blue';
  if (rating >= 1400) return '#03a89e';
  if (rating >= 1200) return 'green';
  return 'gray';
}

function detectRealHandle() {
  const links = document.querySelectorAll('.lang-chooser a[href*="/profile/"]');
  for (const a of links) {
    const t = a.textContent.trim();
    if (t && /^[a-zA-Z0-9_]+$/.test(t)) return t;
  }
  return '';
}

function setLinkToFake(a) {
  if (!target || !realHandle) return;
  if (a.textContent.trim() !== realHandle) return;
  const cls = getRankClass(target);
  a.textContent = target.handle;
  a.href = '/profile/' + target.handle;
  a.className = a.className.replace(/user-\w+/g, '').trim() + ' ' + cls;
  if ((target.rank || '').toLowerCase().includes('legendary')) {
    a.innerHTML = '<span class="legendary-user-first-letter">'
      + target.handle[0] + '</span>' + target.handle.slice(1);
  }
}

function replaceTopbar() {
  if (!target || !realHandle) return;
  const links = document.querySelectorAll('.lang-chooser a[href*="/profile/"]');
  for (const a of links) setLinkToFake(a);
  const spans = document.querySelectorAll('.lang-chooser span[style*="color"]');
  for (const s of spans) {
    if (/^\d+$/.test(s.textContent.trim())) {
      s.textContent = String(target.rating || '');
      s.style.color = ratingColor(target.rating);
    }
  }
}

function replaceProfileLinks() {
  if (!target || !realHandle) return;
  const all = document.querySelectorAll('a[href*="/profile/"]');
  for (const a of all) setLinkToFake(a);
}

function walkTextNodes(root, cb) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      let el = n.parentElement;
      while (el) {
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
        el = el.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  }, false);
  let n;
  while ((n = walker.nextNode())) cb(n);
}

function replaceTextInPage() {
  if (!target || !realHandle) return;
  walkTextNodes(document.body || document.documentElement, (n) => {
    if (n.textContent.includes(realHandle)) {
      n.textContent = n.textContent.split(realHandle).join(target.handle);
    }
  });
  if (document.title.includes(realHandle)) {
    document.title = document.title.split(realHandle).join(target.handle);
  }
}

function fixProfileURL() {
  if (!target) return;
  const path = location.pathname;
  if (realHandle && path.includes('/profile/' + realHandle)) {
    history.replaceState(null, '', '/profile/' + target.handle);
  }
}

function showBadge() {
  if (badgeEl) badgeEl.remove();
  if (!document.body) return;
  badgeEl = document.createElement('div');
  badgeEl.textContent = '\uD83D\uDC40 Fake: ' + target.handle;
  Object.assign(badgeEl.style, {
    position: 'fixed', bottom: '16px', right: '16px',
    zIndex: 2147483647, background: '#2c3e50', color: '#fff',
    padding: '8px 16px', borderRadius: '20px',
    font: '600 12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif',
    boxShadow: '0 2px 10px rgba(0,0,0,.2)',
    cursor: 'pointer', userSelect: 'none',
  });
  badgeEl.addEventListener('click', () => { badgeEl.remove(); badgeEl = null; });
  document.body.appendChild(badgeEl);
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => {
    if (badgeEl) { badgeEl.remove(); badgeEl = null; }
  }, 6000);
}

function applyAll() {
  if (mutating) return;
  mutating = true;
  try {
    replaceTopbar();
    replaceProfileLinks();
    replaceTextInPage();
    fixProfileURL();
    if (!badgeEl) showBadge();
    try { chrome.runtime.sendMessage({ action: 'fakeUserActive', handle: target.handle }); } catch (e) {}
  } finally {
    mutating = false;
  }
}

async function activate(handle, userData) {
  if (!handle) { deactivate(); return; }
  if (userData) {
    target = userData;
  } else {
    try {
      const r = await fetch('https://codeforces.com/api/user.info?handles=' + encodeURIComponent(handle));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      if (d.status !== 'OK' || !d.result || !d.result[0]) throw new Error('Not found');
      target = d.result[0];
    } catch (e) {
      console.error('[FakeUser]', e.message);
      return;
    }
  }
  realHandle = detectRealHandle();
  if (!realHandle) return;
  applyAll();
  if (obs) obs.disconnect();
  obs = new MutationObserver(() => applyAll());
  obs.observe(document.documentElement || document.body, {
    childList: true, subtree: true, characterData: true,
  });
}

function deactivate() {
  if (obs) { obs.disconnect(); obs = null; }
  target = null;
  realHandle = '';
  if (badgeEl) { badgeEl.remove(); badgeEl = null; }
  try { chrome.runtime.sendMessage({ action: 'fakeUserActive', handle: null }); } catch (e) {}
}

chrome.runtime.onMessage.addListener((msg, _, send) => {
  if (msg.action === 'setFakeUser') {
    if (msg.handle) {
      activate(msg.handle, msg.userData || null).then(() => send({ ok: true })).catch((e) => send({ ok: false }));
    } else {
      deactivate();
      send({ ok: true });
    }
    return true;
  }
  if (msg.action === 'getFakeUserStatus') {
    send({ active: !!target, handle: target ? target.handle : null });
  }
});

chrome.storage.local.get('fakeUser', (res) => {
  const f = res.fakeUser || {};
  if (f.enabled !== false && f.handle && f.data) {
    activate(f.handle, f.data);
  }
});
