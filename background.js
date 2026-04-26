// background.js - Service Worker (FULL UNLOCKED)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('accounts', (data) => {
    if (!data.accounts) chrome.storage.local.set({ accounts: {} });
  });
});

async function getFacebookCookies() {
  const fb = await chrome.cookies.getAll({ domain: 'facebook.com' });
  const msg = await chrome.cookies.getAll({ domain: 'messenger.com' });
  return [...fb, ...msg];
}

async function saveCookiesToAccount(accountName) {
  const { accounts = {} } = await chrome.storage.local.get('accounts');
  const cookies = await getFacebookCookies();
  accounts[accountName] = { ... (accounts[accountName] || {}), cookies, savedAt: Date.now() };
  await chrome.storage.local.set({ accounts });
  return { status: 'saved' };
}

async function applyAccountCookies(accountName) {
  const { accounts = {} } = await chrome.storage.local.get('accounts');
  const entry = accounts[accountName];
  if (!entry || !entry.cookies) return;
  
  const existingFb = await chrome.cookies.getAll({ domain: 'facebook.com' });
  const existingMsg = await chrome.cookies.getAll({ domain: 'messenger.com' });
  const existing = [...existingFb, ...existingMsg];
  
  await Promise.all(existing.map(c => {
    const urlDomain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
    const cookieUrl = `${c.secure ? 'https://' : 'http://'}${urlDomain}${c.path}`;
    return chrome.cookies.remove({ url: cookieUrl, name: c.name, storeId: c.storeId }).catch(() => {});
  }));

  await Promise.all(entry.cookies.map(c => {
    const urlDomain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
    const cookieUrl = `${c.secure ? 'https://' : 'http://'}${urlDomain}${c.path}`;
    const params = { url: cookieUrl, name: c.name, value: c.value, path: c.path, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite };
    if (!c.hostOnly) params.domain = c.domain;
    if (c.expirationDate) params.expirationDate = c.expirationDate;
    return chrome.cookies.set(params).catch(() => {});
  }));

  if (chrome.browsingData) {
    await new Promise(r => {
      chrome.browsingData.remove({ origins: ["https://www.facebook.com", "https://messenger.com"] }, { localStorage: true, serviceWorkers: true }, r);
    });
  }

  const fbTabs = await chrome.tabs.query({url: "*://*.facebook.com/*"});
  if (fbTabs.length > 0) fbTabs.forEach(t => chrome.tabs.reload(t.id));
  else chrome.tabs.create({url: "https://www.facebook.com/"});
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handle = async () => {
    if (msg.type === 'switchAccount') {
      await applyAccountCookies(msg.accountName);
      sendResponse({status: 'ok'});
    } else if (msg.type === 'exportCurrent') {
      const res = await saveCookiesToAccount(msg.accountName);
      sendResponse(res);
    } else if (msg.type === 'clearCookies') {
      const fb = await chrome.cookies.getAll({ domain: 'facebook.com' });
      const msgC = await chrome.cookies.getAll({ domain: 'messenger.com' });
      await Promise.all([...fb, ...msgC].map(c => {
        const urlDomain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
        const cookieUrl = `${c.secure ? 'https://' : 'http://'}${urlDomain}${c.path}`;
        return chrome.cookies.remove({ url: cookieUrl, name: c.name }).catch(() => {});
      }));
      if (chrome.browsingData) {
        await new Promise(r => chrome.browsingData.remove({ origins: ["https://www.facebook.com", "https://messenger.com"] }, { localStorage: true, serviceWorkers: true }, r));
      }
      const fbTabs = await chrome.tabs.query({url: "*://*.facebook.com/*"});
      if (fbTabs.length > 0) fbTabs.forEach(t => chrome.tabs.reload(t.id));
      else chrome.tabs.create({url: "https://www.facebook.com/"});
      sendResponse({status: 'ok'});
    }
  };
  handle();
  return true;
});
