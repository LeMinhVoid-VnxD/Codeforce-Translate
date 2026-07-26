'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('lang');
  const btn = document.getElementById('save');
  const status = document.getElementById('status');
  const censorChk = document.getElementById('censor');

  const fakeInput = document.getElementById('fakeHandle');
  const fakeApply = document.getElementById('fakeApply');
  const fakeEnabled = document.getElementById('fakeEnabled');
  const fakeStatus = document.getElementById('fakeStatus');

  chrome.storage.local.get(['targetLang', 'censorEnabled', 'fakeUser'], (res) => {
    if (res.targetLang) sel.value = res.targetLang;
    censorChk.checked = res.censorEnabled !== false;
    if (res.fakeUser) {
      fakeInput.value = res.fakeUser.handle || '';
      fakeEnabled.checked = res.fakeUser.enabled !== false;
      fakeStatus.textContent = res.fakeUser.handle
        ? 'Fake: ' + res.fakeUser.handle
        : '';
    }
  });

  fakeApply.addEventListener('click', () => {
    const handle = fakeInput.value.trim();
    const enabled = fakeEnabled.checked;

    if (handle) {
      fakeStatus.textContent = 'Fetching...';
      chrome.storage.local.set({ fakeUser: { handle, enabled, data: null } }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || !tabs[0]) return;
          chrome.tabs.sendMessage(tabs[0].id, { action: 'setFakeUser', handle: enabled ? handle : '' })
            .then(() => {
              fakeStatus.textContent = 'Fake: ' + handle + ' (active)';
            })
            .catch(() => {
              fakeStatus.textContent = 'Fake: ' + handle + ' (reload page)';
            });
        });
      });
    } else {
      chrome.storage.local.set({ fakeUser: { handle: '', enabled: false, data: null } }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || !tabs[0]) return;
          chrome.tabs.sendMessage(tabs[0].id, { action: 'setFakeUser', handle: '' })
            .catch(() => {});
        });
        fakeStatus.textContent = 'Fake user disabled';
      });
    }
  });

  fakeEnabled.addEventListener('change', () => {
    const handle = fakeInput.value.trim();
    if (handle) {
      fakeApply.click();
    } else {
      chrome.storage.local.set({ fakeUser: { handle: '', enabled: fakeEnabled.checked, data: null } });
    }
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
            status.textContent = '\u2705 Saved & applied';
          })
          .catch(() => {
            status.textContent = censor
              ? '\u2705 Saved (reload pages to apply censor)'
              : '\u2705 Saved (reload page or navigate to a problem)';
          });
      });
    });
  });
});
