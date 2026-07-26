'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('lang');
  const btn = document.getElementById('save');
  const status = document.getElementById('status');
  const censorChk = document.getElementById('censor');

  chrome.storage.local.get(['targetLang', 'censorEnabled'], (res) => {
    if (res.targetLang) sel.value = res.targetLang;
    censorChk.checked = res.censorEnabled !== false;
  });

  btn.addEventListener('click', () => {
    const lang = sel.value;
    const censor = censorChk.checked;

    chrome.storage.local.set({ targetLang: lang, censorEnabled: censor }, () => {
      status.textContent = censor
        ? '\u2705 Saved (reload pages to apply censor)'
        : '\u2705 Saved';

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, { action: 'setLang', lang })
          .then(() => {
            status.textContent = '\u2705 Saved & applied to current tab';
          })
          .catch(() => {
            if (censor) {
              status.textContent =
                '\u2705 Saved (reload pages to apply censor)';
            } else {
              status.textContent =
                '\u2705 Saved (reload page or navigate to a problem)';
            }
          });
      });
    });
  });
});
