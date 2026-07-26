'use strict';

const CF_API = 'https://codeforces.com/api/user.info?handles=';
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

function getRankClass(user) {
  return RANK_CLASS[(user.rank || '').toLowerCase()] || 'user-gray';
}

function ratingColor(rating) {
  if (!rating) return 'gray';
  if (rating >= 3000) return 'red';
  if (rating >= 2400) return 'red';
  if (rating >= 2200) return 'orange';
  if (rating >= 1900) return '#a0a';
  if (rating >= 1600) return 'blue';
  if (rating >= 1400) return '#03a89e';
  if (rating >= 1200) return 'green';
  return 'gray';
}

function replaceTopbarHandle() {
  if (!target || !realHandle) return;
  const links = document.querySelectorAll('.lang-chooser a[href*="/profile/"]');
  for (const a of links) {
    if (a.textContent.trim() !== realHandle) continue;
    const rankCls = getRankClass(target);
    a.textContent = target.handle;
    a.href = '/profile/' + target.handle;
    a.className = a.className.replace(/user-\w+/g, '').trim() + ' ' + rankCls;
    if ((target.rank || '').toLowerCase().includes('legendary')) {
      a.innerHTML = '<span class="legendary-user-first-letter">' + target.handle[0] + '</span>' + target.handle.slice(1);
    }
    const parent = a.parentNode;
    const spans = parent.querySelectorAll('span[style*="color"]');
    for (const s of spans) {
      if (/^\d+$/.test(s.textContent.trim())) {
        s.textContent = String(target.rating || '');
        s.style.color = ratingColor(target.rating);
      }
    }
  }
}

function replaceAnyHandleLink(a) {
  if (!target || !realHandle) return false;
  if (a.textContent.trim() !== realHandle) return false;
  const rankCls = getRankClass(target);
  a.textContent = target.handle;
  if (a.href && a.pathname) a.href = '/profile/' + target.handle;
  a.className = a.className.replace(/user-\w+/g, '').trim() + ' ' + rankCls;
  if ((target.rank || '').toLowerCase().includes('legendary')) {
    a.innerHTML = '<span class="legendary-user-first-letter">' + target.handle[0] + '</span>' + target.handle.slice(1);
  }
  return true;
}

function walkTextNodes(root, cb) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
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

function applyAll() {
  replaceTopbarHandle();
  const allLinks = document.querySelectorAll('a[href*="/profile/"]');
  for (const a of allLinks) replaceAnyHandleLink(a);
  replaceTextInPage();
}

async function fetchUser(handle) {
  const r = await fetch(CF_API + encodeURIComponent(handle));
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json();
  if (d.status !== 'OK' || !d.result || !d.result[0]) throw new Error('User not found');
  return d.result[0];
}

function detectRealHandle() {
  const links = document.querySelectorAll('.lang-chooser a[href*="/profile/"]');
  if (links.length) return links[0].textContent.trim();
  const all = document.querySelectorAll('a[href*="/profile/"]');
  for (const a of all) {
    const t = a.textContent.trim();
    if (t && !t.includes(' ') && /^[a-zA-Z0-9_]+$/.test(t)) return t;
  }
  return '';
}

async function activate(handle) {
  try {
    target = await fetchUser(handle);
  } catch (e) {
    console.error('[CF FakeUser]', e.message);
    return;
  }
  realHandle = detectRealHandle();
  if (!realHandle) return;
  applyAll();
  if (obs) obs.disconnect();
  obs = new MutationObserver(() => {
    applyAll();
  });
  const root = document.documentElement || document.body;
  obs.observe(root, { childList: true, subtree: true, characterData: true });
}

function deactivate() {
  if (obs) { obs.disconnect(); obs = null; }
  target = null;
  realHandle = '';
}

chrome.runtime.onMessage.addListener((msg, _, send) => {
  if (msg.action === 'setFakeUser') {
    if (msg.handle) {
      activate(msg.handle).then(() => send({ ok: true })).catch((e) => send({ ok: false, error: e.message }));
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
  if (res.fakeUser && res.fakeUser.enabled !== false && res.fakeUser.handle) {
    activate(res.fakeUser.handle);
  }
});
