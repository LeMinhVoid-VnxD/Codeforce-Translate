'use strict';

function updateBadge() {
  chrome.storage.local.get('censorEnabled', (res) => {
    const on = res.censorEnabled !== false;
    chrome.action.setBadgeText({ text: on ? 'C' : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#3b5998' });
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if ('censorEnabled' in changes) updateBadge();
});

chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
updateBadge();

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'censorCount') {
    const text = msg.count > 0 ? '' + msg.count : 'C';
    chrome.action.setBadgeText({ text, tabId: sender.tab.id });
  }
});
