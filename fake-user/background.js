'use strict';

function updateBadge() {
  chrome.storage.local.get('fakeUser', (res) => {
    const f = res.fakeUser || {};
    const on = f.enabled !== false && !!f.handle;
    chrome.action.setBadgeText({ text: on ? 'F' : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#2c3e50' });
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if ('fakeUser' in changes) updateBadge();
});

chrome.runtime.onInstalled.addListener(updateBadge);
updateBadge();

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'fakeUserActive') {
    chrome.action.setBadgeText({ text: msg.handle ? 'F' : '', tabId: sender.tab.id });
  }
});
