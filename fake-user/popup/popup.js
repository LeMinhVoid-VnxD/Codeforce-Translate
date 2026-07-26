'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const handleInput = document.getElementById('handleInput');
  const setBtn     = document.getElementById('setBtn');
  const enabled    = document.getElementById('enabledToggle');
  const statusMsg  = document.getElementById('statusMsg');
  const statusDot  = document.getElementById('statusDot');
  const userCard   = document.getElementById('userCard');
  const userAvatar = document.getElementById('userAvatar');
  const userHandle = document.getElementById('userHandle');
  const userRating = document.getElementById('userRating');

  let activeHandle = null;

  function setStatus(text, type) {
    statusMsg.innerHTML = text;
    statusDot.className = 'badge-dot' + (type ? ' ' + type : '');
  }

  function showUserCard(handle, rating, rank) {
    userCard.style.display = 'flex';
    userAvatar.textContent = handle[0].toUpperCase();
    userHandle.textContent = handle;
    const r = rating ? 'Rating: ' + rating : '';
    const k = rank ? ' \u00B7 ' + rank : '';
    userRating.textContent = r + k;
    activeHandle = handle;
  }

  function hideUserCard() {
    userCard.style.display = 'none';
    activeHandle = null;
  }

  function loadState() {
    chrome.storage.local.get(['fakeUser'], (res) => {
      const f = res.fakeUser || {};
      handleInput.value = f.handle || '';
      enabled.checked = f.enabled !== false;

      if (f.handle && f.enabled !== false) {
        setStatus('Fetching...', '');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || !tabs[0]) { setStatus('No active tab', ''); return; }
          chrome.tabs.sendMessage(tabs[0].id, { action: 'getFakeUserStatus' })
            .then((r) => {
              if (r && r.active) {
                setStatus(
                  '<span class="label">Faking</span> <span class="value">' + r.handle + '</span>',
                  'active'
                );
                showUserCard(r.handle, f.data ? f.data.rating : null, f.data ? f.data.rank : null);
              } else {
                setStatus('<span class="label">Set but inactive</span>', '');
                hideUserCard();
              }
            })
            .catch(() => {
              setStatus('<span class="label">Reload page to activate</span>', '');
              showUserCard(f.handle, f.data ? f.data.rating : null, f.data ? f.data.rank : null);
            });
        });
      } else if (f.handle) {
        setStatus('<span class="label">Disabled</span>', '');
        hideUserCard();
      } else {
        setStatus('<span class="label">No target set</span>', '');
        hideUserCard();
      }
    });
  }

  loadState();

  setBtn.addEventListener('click', () => {
    const handle = handleInput.value.trim();
    if (!handle) {
      setStatus('Enter a handle', 'error');
      return;
    }

    setBtn.disabled = true;
    setStatus('Fetching <span class="value">' + handle + '</span>...', '');

    fetch('https://codeforces.com/api/user.info?handles=' + encodeURIComponent(handle))
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((d) => {
        if (d.status !== 'OK' || !d.result || !d.result[0]) throw new Error('User not found');
        const user = d.result[0];

        chrome.storage.local.set({
          fakeUser: {
            handle: user.handle,
            enabled: enabled.checked,
            data: { rating: user.rating, maxRating: user.maxRating, rank: user.rank, maxRank: user.maxRank },
          }
        }, () => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'setFakeUser',
                handle: enabled.checked ? user.handle : '',
                userData: user,
              }).catch(() => {});
            }
          });
          setStatus(
            '<span class="label">Faking</span> <span class="value">' + user.handle + '</span>',
            'active'
          );
          showUserCard(user.handle, user.rating, user.rank);
        });
      })
      .catch((e) => {
        setStatus('<span class="value" style="color:#e74c3c;">Error: ' + e.message + '</span>', 'error');
      })
      .finally(() => { setBtn.disabled = false; });
  });

  enabled.addEventListener('change', () => {
    chrome.storage.local.get('fakeUser', (res) => {
      const f = res.fakeUser || {};
      f.enabled = enabled.checked;
      chrome.storage.local.set({ fakeUser: f }, () => {
        const handle = handleInput.value.trim();
        if (handle) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'setFakeUser',
                handle: enabled.checked ? handle : '',
              }).catch(() => {});
            }
          });
        }
        if (enabled.checked && f.data) {
          setStatus('<span class="label">Faking</span> <span class="value">' + f.handle + '</span>', 'active');
        } else {
          setStatus('<span class="label">Disabled</span>', '');
        }
      });
    });
  });
});
