// popup/popup.js - FULL UNLOCKED VERSION
const accountListEl = document.getElementById('accountList');
const exportBtn = document.getElementById('exportBtn');
const safeLogoutBtn = document.getElementById('safeLogoutBtn');
const donateBtn = document.getElementById('donateBtn');
const donateDialog = document.getElementById('donateDialog');
const langToggle = document.getElementById('langToggle');

let isPremium = true; // Luôn là bản PRO
let currentLang = 'vn';

const translations = {
  vn: {
    title: "FB Account Switcher",
    pro: "",
    help: "📖 Hướng dẫn",
    saveBtn: "💾 Lưu tài khoản hiện tại",
    logoutBtn: "➕ Đăng xuất an toàn (Thêm Account)",
    donateBtn: "💖 Donate ủng hộ tác giả",
    donateTitle: "💖 Donate Cafe",
    donateDesc: "Cảm ơn bạn đã ủng hộ tác giả duy trì dự án này!",
    noAcc: "Chưa có tài khoản nào",
    btnSwitch: "Chuyển",
    btnDelete: "Xóa",
    promptName: "Nhập tên tài khoản để lưu tài khoản hiện tại:",
    alertSaveSuccess: 'Đã lưu tài khoản "{name}" thành công!',
    alertLogoutConfirm: 'LƯU Ý: Extension sẽ xóa sạch Cookie để bạn về màn hình đăng nhập.\n\nTiếp tục?',
    confirmDelete: "Bạn có chắc muốn xóa tài khoản {name}?"
  },
  en: {
    title: "FB Account Switcher",
    pro: "",
    help: "📖 Guide",
    saveBtn: "💾 Save current account",
    logoutBtn: "➕ Safe Logout (Add New Account)",
    donateBtn: "💖 Donate to Support",
    donateTitle: "💖 Donate Cafe",
    donateDesc: "Thank you for supporting the developer!",
    noAcc: "No accounts saved yet",
    btnSwitch: "Switch",
    btnDelete: "Delete",
    promptName: "Enter account name to save:",
    alertSaveSuccess: 'Account "{name}" saved successfully!',
    alertLogoutConfirm: 'NOTE: Extension will clear cookies to return to login screen.\n\nContinue?',
    confirmDelete: "Are you sure you want to delete {name}?"
  }
};

function updateUI() {
  const t = translations[currentLang];
  document.getElementById('mainTitle').innerHTML = t.title;
  document.getElementById('helpBtn').textContent = t.help;
  document.getElementById('exportBtn').textContent = t.saveBtn;
  document.getElementById('safeLogoutBtn').textContent = t.logoutBtn;
  donateBtn.textContent = t.donateBtn;

  // Dialog Donate
  document.querySelector('#donateDialog h3').textContent = t.donateTitle;
  document.querySelector('#donateDialog p').textContent = t.donateDesc;
  document.querySelector('#donateDialog button[type="submit"]').textContent = currentLang === 'vn' ? 'Đóng' : 'Close';

  const limitNote = document.getElementById('freeLimitNote');
  if (limitNote) limitNote.style.display = 'none';

  const premiumBtn = document.getElementById('premiumBtn');
  if (premiumBtn) premiumBtn.style.display = 'none';

  loadAccountsAndRender();
}

langToggle.addEventListener('click', async () => {
  currentLang = currentLang === 'vn' ? 'en' : 'vn';
  await chrome.storage.local.set({ lang: currentLang });
  updateUI();
});

function renderAccounts(accounts, currentUid) {
  const t = translations[currentLang];
  accountListEl.innerHTML = '';
  const names = Object.keys(accounts);

  if (names.length === 0) {
    accountListEl.innerHTML = `<li style="justify-content:center; color:#606770; font-size:13px;">${t.noAcc}</li>`;
    return;
  }

  names.forEach(name => {
    const li = document.createElement('li');
    let isCurrent = false;
    if (currentUid && accounts[name].cookies) {
      const cUserCookie = accounts[name].cookies.find(c => c.name === 'c_user');
      if (cUserCookie && cUserCookie.value === currentUid) isCurrent = true;
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'acc-name';
    if (isCurrent) {
      nameSpan.innerHTML = `${name} <span style="font-size:10px; color:#fff; background:#31a24c; padding:2px 4px; border-radius:4px; margin-left:5px; font-weight:bold; vertical-align:middle;">Current</span>`;
    } else {
      nameSpan.textContent = name;
    }

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    const switchBtn = document.createElement('button');
    switchBtn.className = 'btn-switch';
    switchBtn.textContent = t.btnSwitch;
    switchBtn.onclick = () => {
      chrome.runtime.sendMessage({ type: 'switchAccount', accountName: name });
      window.close();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = t.btnDelete;
    deleteBtn.onclick = async () => {
      if (!confirm(t.confirmDelete.replace('{name}', name))) return;
      delete accounts[name];
      await chrome.storage.local.set({ accounts });
      loadAccountsAndRender();
    };

    btnGroup.appendChild(switchBtn);
    btnGroup.appendChild(deleteBtn);

    li.appendChild(nameSpan);
    li.appendChild(btnGroup);
    accountListEl.appendChild(li);
  });
}

async function loadAccountsAndRender() {
  const data = await chrome.storage.local.get(['accounts', 'lang']);
  currentLang = data.lang || 'vn';
  let accounts = data.accounts || {};

  chrome.cookies.get({ url: 'https://www.facebook.com', name: 'c_user' }, (cookie) => {
    renderAccounts(accounts, cookie ? cookie.value : null);
  });
}

exportBtn.addEventListener('click', async () => {
  const name = prompt(translations[currentLang].promptName);
  if (!name) return;

  chrome.runtime.sendMessage({ type: 'exportCurrent', accountName: name }, response => {
    if (response?.status === 'saved') {
      alert(translations[currentLang].alertSaveSuccess.replace('{name}', name));
      loadAccountsAndRender();
    }
  });
});

safeLogoutBtn.addEventListener('click', () => {
  if (confirm(translations[currentLang].alertLogoutConfirm)) {
    chrome.runtime.sendMessage({ type: 'clearCookies' });
    window.close();
  }
});

donateBtn.addEventListener('click', () => {
  donateDialog.showModal();
});

document.getElementById('helpBtn').addEventListener('click', () => {
  chrome.windows.create({
    url: chrome.runtime.getURL("popup/instructions.html"),
    type: "popup",
    width: 420,
    height: 580,
    focused: true
  });
});

chrome.storage.local.get(['lang'], (data) => {
  if (data.lang) currentLang = data.lang;
  updateUI();
});
