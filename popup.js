'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('lang');
  const btn = document.getElementById('save');
  const status = document.getElementById('status');

  chrome.storage.local.get('targetLang', (res) => {
    if (res.targetLang) sel.value = res.targetLang;
  });

  btn.addEventListener('click', () => {
    const lang = sel.value;

    chrome.storage.local.set({ targetLang: lang }, () => {
      status.textContent = '\u2705 Saved';

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, { action: 'setLang', lang })
          .then(() => {
            status.textContent = '\u2705 Saved & applied to current tab';
          })
          .catch(() => {
            status.textContent =
              '\u2705 Saved (reload page or navigate to a problem)';
          });
      });
    });
  });
});
