// Name: Assets Store
// ID: twStore
// Description: Built-in store for costumes, sounds, sprites, scripts and extensions
// By: You
// Licence: MIT

(function (Scratch) {
  'use strict';
  if (!Scratch.extensions.unsandboxed) {
    throw new Error('This extension must run unsandboxed!');
  }

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const isPM = Scratch.extensions.isPenguinMod;
  const isEditor = typeof scaffolding === 'undefined';

  const EXT_VERSION = '0.2';
  let latestVersion = null;

  const isTurboWarp = (() => {
    try {
      if (isPM) return false;
      return true;
    } catch (e) { return false; }
  })();

  const API_BASE = 'https://hamburger-chat.ru/store/api';
  const JS_ICON_URL = 'https://studio.penguinmod.com/static/assets/5f4208a6b7257c456c018d57efc8a7e9.svg';
  const SPRITE_ICON_URL = 'https://raw.githubusercontent.com/bahr-projects/bahr-projects.github.io/a9bd9516b1c9b0ba7ea6c252b81915ad1cacb50f/turbostore/78e3f697df85275aa8d384ca6fc0e288.svg';
  const SPRITE3_ICON_URL = 'https://raw.githubusercontent.com/bahr-projects/bahr-projects.github.io/bf91ce6be17d56f7a87b4c8d265f8a4159f5e6db/turbostore/turbowarp_icon.svg';
  const PMS_ICON_URL = 'https://raw.githubusercontent.com/bahr-projects/bahr-projects.github.io/bf91ce6be17d56f7a87b4c8d265f8a4159f5e6db/turbostore/pm_icon.svg';
  const PALETTE_ICON_URL = 'https://bahr-projects.github.io/turbostore/icon.svg';
  const TAB_ICON_URL = 'https://raw.githubusercontent.com/bahr-projects/bahr-projects.github.io/refs/heads/main/turbostore/icon2.svg';
  const DISCORD_ICON_URL = 'https://raw.githubusercontent.com/bahr-projects/bahr-projects.github.io/2b186826069ed0e7b548814eeb357a413a86eeea/turbostore/discord.svg';
  const DISCORD_URL = 'https://discord.gg/ZkxsbUxmZ8';
  const VERSIONS_BASE = 'https://raw.githubusercontent.com/bahr-projects/bahr-projects.github.io/refs/heads/main/turbostore/versions';
  const VERSIONS_FOLDER = 'https://github.com/bahr-projects/bahr-projects.github.io/tree/main/turbostore/versions';

  const PAGE_SIZE = 15;

  let guiElements = {};

  (function injectStyles() {
    if (document.getElementById('twstore-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'twstore-injected-styles';
    style.textContent = `
      @keyframes twstore-spin { to { transform: rotate(360deg); } }
      .twstore-img { -webkit-user-drag: none; user-select: none; pointer-events: auto; }
      .twstore-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
      .twstore-scroll::-webkit-scrollbar-track { background: transparent; }
      .twstore-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.35); border-radius: 4px; }
      .twstore-scroll::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.55); }
      .twstore-desc-scroll { background: transparent !important; }
      .twstore-desc-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .twstore-desc-scroll::-webkit-scrollbar-track { background: transparent !important; border: none !important; }
      .twstore-desc-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.28); border-radius: 3px; }
      .twstore-desc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.5); }
      .twstore-desc-scroll::-webkit-scrollbar-corner { background: transparent; }
      .twstore-folder-chevron { transition: transform 0.15s ease; }
    `;
    document.head.appendChild(style);
  })();

  function getBgLuminance(el) {
    if (!el) return null;
    try {
      const bg = getComputedStyle(el).backgroundColor;
      const m = bg.match(/[\d.]+/g);
      if (!m || m.length < 3) return null;
      const alpha = m.length >= 4 ? parseFloat(m[3]) : 1;
      if (alpha < 0.1) return null;
      const [r, g, b] = m.map(Number);
      return r * 0.299 + g * 0.587 + b * 0.114;
    } catch (e) { return null; }
  }

  function isDarkTheme() {
    try {
      if (typeof ReduxStore !== 'undefined') {
        const s = ReduxStore.getState();
        const gui = s && s.scratchGui;
        const candidates = [
          gui && gui.theme && gui.theme.theme,
          gui && gui.theme && gui.theme.name,
          gui && gui.theme,
          gui && gui.settings && gui.settings.theme,
          s && s.theme
        ];
        for (const c of candidates) {
          if (typeof c === 'string') {
            const v = c.toLowerCase();
            if (v === 'dark' || v === 'high-contrast' || v === 'hc') return true;
            if (v === 'light' || v === 'high-contrast-light' || v === 'hcl') return false;
          }
          if (c && typeof c === 'object') {
            const n = c.theme || c.name;
            if (typeof n === 'string') {
              const v = n.toLowerCase();
              if (v === 'dark' || v === 'high-contrast') return true;
              if (v === 'light' || v === 'high-contrast-light') return false;
            }
          }
        }
      }
    } catch (e) {}

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !/theme/i.test(k)) continue;
        let v;
        try { v = localStorage.getItem(k); } catch (e) { continue; }
        if (typeof v !== 'string') continue;
        try {
          const parsed = JSON.parse(v);
          if (typeof parsed === 'string') v = parsed;
          else if (parsed && typeof parsed === 'object') v = parsed.theme || parsed.name || v;
        } catch (e) {}
        if (typeof v !== 'string') continue;
        const low = v.toLowerCase();
        if (low === 'dark' || low === 'high-contrast' || low === 'hc') return true;
        if (low === 'light' || low === 'high-contrast-light' || low === 'hcl') return false;
      }
    } catch (e) {}

    try {
      const htmlCs = (getComputedStyle(document.documentElement).colorScheme || '').toLowerCase();
      const bodyCs = (getComputedStyle(document.body).colorScheme || '').toLowerCase();
      const cs = (htmlCs + ' ' + bodyCs).trim();
      if (cs) {
        const hasDark = /(^|\s)dark(\s|$)/.test(cs);
        const hasLight = /(^|\s)light(\s|$)/.test(cs);
        if (hasDark && !hasLight) return true;
        if (hasLight && !hasDark) return false;
      }
    } catch (e) {}

    const selectors = [
      'div[class*="gui_tab-panel_"]',
      'div[class^="gui_tabs_"]',
      'div[class*="gui_stage-wrapper_"]',
      'div[class*="gui_target-wrapper_"]',
      'div[class*="gui_menu-bar_"]',
      'div[class*="gui_body-wrapper_"]'
    ];
    for (const sel of selectors) {
      let el = null;
      try { el = document.querySelector(sel); } catch (e) {}
      for (let depth = 0; depth < 4 && el; depth++) {
        const lum = getBgLuminance(el);
        if (lum !== null) return lum < 128;
        el = el.parentElement;
      }
    }

    const bodyLum = getBgLuminance(document.body);
    if (bodyLum !== null) return bodyLum < 128;
    const htmlLum = getBgLuminance(document.documentElement);
    if (htmlLum !== null) return htmlLum < 128;

    return true;
  }

  function getTheme() {
    const dark = isDarkTheme();
    let main = '#ff4c4c';
    try {
      if (isPM) main = '#00c3ff';
      else {
        const cs = getComputedStyle(document.body).getPropertyValue('--looks-secondary').trim();
        if (cs) main = cs;
      }
    } catch (e) {}

    if (dark) {
      return {
        dark: true, main, ring: main,
        fade: 'rgba(255,255,255,0.12)',
        text: '#ffffff',
        text2: '#d0d0d0',
        dim: '#9a9a9a',
        muted: '#6a6a6a',
        border: 'rgba(255,255,255,0.14)',
        borderStrong: 'rgba(255,255,255,0.24)',
        surface: 'rgba(255,255,255,0.05)',
        surfaceSolid: '#1c1c1c',
        surfaceAlt: 'rgba(255,255,255,0.03)',
        inputBg: 'rgba(0,0,0,0.25)',
        iconBg: 'rgba(255,255,255,0.08)',
        shadow: 'rgba(0,0,0,0.5)',
        shadowSoft: 'rgba(0,0,0,0.25)'
      };
    }

    return {
      dark: false, main, ring: main,
      fade: 'rgba(31,35,40,0.06)',
      text: '#1f2328',
      text2: '#424a53',
      dim: '#656d76',
      muted: '#8c959f',
      border: '#d0d7de',
      borderStrong: '#b3bac2',
      surface: '#ffffff',
      surfaceSolid: '#ffffff',
      surfaceAlt: '#eaeef2',
      inputBg: '#ffffff',
      iconBg: '#eaeef2',
      shadow: 'rgba(31,35,40,0.12)',
      shadowSoft: 'rgba(31,35,40,0.06)'
    };
  }

  const AUTH_KEY = 'twStore_auth_v1';
  const AUTH_TTL = 1000 * 60 * 60 * 24 * 30;

  const authState = {
    accountName: null, fullName: null, profilePicture: null,
    userId: null, locale: null, emailVerified: null, authWindow: null
  };

  function saveAuth() {
    try {
      if (!authState.userId) return;
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        accountName: authState.accountName, fullName: authState.fullName,
        profilePicture: authState.profilePicture, userId: authState.userId,
        locale: authState.locale, emailVerified: authState.emailVerified,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }

  function loadAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d.userId || Date.now() - (d.savedAt || 0) > AUTH_TTL) {
        localStorage.removeItem(AUTH_KEY);
        return false;
      }
      Object.assign(authState, d);
      return true;
    } catch (e) { return false; }
  }

  function clearAuthStorage() {
    try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
  }

  function loginWithGoogle() {
    const clientId = '382430967410-3svk456rj8ntlu3d3gd9oma09i96cpr9.apps.googleusercontent.com';
    const redirectUri = 'https://ikelene.net/google/googleLogin.php';
    const scope = 'profile email';
    const state = encodeURIComponent(JSON.stringify({ source: window.location.hostname }));
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&prompt=select_account&state=${state}`;
    authState.authWindow = window.open(authUrl, 'Google Login', 'width=500,height=600');

    window.addEventListener('message', (event) => {
      if (event.origin === 'https://ikelene.net') {
        const { accountName, fullName, profilePicture, userId, locale, emailVerified } = event.data;
        authState.accountName = accountName;
        authState.fullName = fullName;
        authState.profilePicture = profilePicture;
        authState.userId = userId;
        authState.locale = locale;
        authState.emailVerified = emailVerified;
        saveAuth();
        if (authState.authWindow) { authState.authWindow.close(); authState.authWindow = null; }
        if (guiElements.panel) openStorePanel();
      }
    });
  }

  function logout() {
    authState.accountName = null; authState.fullName = null;
    authState.profilePicture = null; authState.userId = null;
    authState.locale = null; authState.emailVerified = null;
    clearAuthStorage();
    if (guiElements.panel) openStorePanel();
  }

  function isLoggedIn() { return !!authState.accountName && !!authState.userId; }
  loadAuth();

  let storeProducts = [];
  let productsLoaded = false;
  let productsLoading = false;
  let productDetailsCache = {};
  let likedCache = {};

  async function fetchProducts() {
    try {
      productsLoading = true;
      const res = await fetch(`${API_BASE}/products?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      storeProducts = (data.products || []).map(p => ({ ...p, liked: false }));
      productsLoaded = true;
      return storeProducts;
    } catch (e) {
      console.error('[Store] Failed to fetch products:', e);
      storeProducts = [];
      productsLoaded = true;
      return [];
    } finally {
      productsLoading = false;
    }
  }

  async function fetchProductDetail(id) {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      productDetailsCache[id] = data;
      return data;
    } catch (e) {
      console.error('[Store] Failed to fetch product detail:', e);
      return null;
    }
  }

  async function fetchLatestVersion() {
    try {
      const res = await fetch(`${API_BASE}/extension/version`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.version || null;
    } catch (e) { return null; }
  }

  async function apiToggleLike(productId) {
    if (!isLoggedIn()) return null;
    try {
      const res = await fetch(`${API_BASE}/products/${productId}/like`, {
        method: 'POST', headers: { 'X-Google-Id': authState.userId }
      });
      if (res.status === 401) { clearAuthStorage(); return null; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) { console.error('[Store] Like failed:', e); return null; }
  }

  async function apiCheckLike(productId) {
    if (!isLoggedIn()) return false;
    try {
      const r = await fetch(`${API_BASE}/products/${productId}/check-like`, {
        headers: { 'X-Google-Id': authState.userId }
      });
      if (!r.ok) return false;
      const d = await r.json();
      return !!d.liked;
    } catch (e) { return false; }
  }

  async function apiIncrementDownload(productId) {
    try { await fetch(`${API_BASE}/products/${productId}/download`, { method: 'POST' }); }
    catch (e) {}
  }

  let activeTags = [];
  let searchQuery = '';
  let currentSort = 'popular';
  let currentProductId = null;
  let visibleCount = PAGE_SIZE;

  function constructTabIMG() { return TAB_ICON_URL; }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderDescription(text, theme) {
    if (!text) return '';
    let html = escapeHtml(text);
    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) =>
      `<img src="${url}" alt="${alt}" class="twstore-img" style="max-width:60%;max-height:120px;object-fit:contain;border-radius:6px;margin:6px 0;display:block;" onerror="this.style.display='none';">`);
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, url) =>
      `<a href="${url}" target="_blank" rel="noopener" style="color:${theme.main};text-decoration:underline;">${t}</a>`);
    html = html.replace(/`([^`]+)`/g, (m, code) =>
      `<code style="background:${theme.iconBg};padding:2px 6px;border-radius:4px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.92em;">${code}</code>`);
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*([^*\n]+)\*/g, '<i>$1</i>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function createDownloadIcon(color = 'currentColor', size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  }

  function createHeartIcon(filled, color = 'currentColor', size = 16) {
    if (filled) return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  }

  function createPlayIcon(color = 'currentColor', size = 24) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  }

  function createStopIcon(color = 'currentColor', size = 24) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="6" y="6" width="12" height="12"/></svg>`;
  }

  function createSpinnerSvg(color = 'currentColor', size = 24) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" style="animation: twstore-spin 0.8s linear infinite;"><circle cx="12" cy="12" r="9" opacity="0.22"/><path d="M21 12a9 9 0 0 0-9-9" stroke-linecap="round"/></svg>`;
  }

  function createJsAssetIcon(theme, size = 32) {
    const filter = theme.dark ? 'brightness(0.85)' : 'brightness(0.15)';
    return `<img src="${JS_ICON_URL}" class="twstore-img" style="width:${size}px;height:${size}px;object-fit:contain;filter:${filter};" draggable="false" crossorigin="anonymous">`;
  }

  function createSpriteAssetIcon(size = 32, format) {
    const fmt = String(format || '').toLowerCase();
    let url = SPRITE_ICON_URL;
    if (fmt === 'sprite3') url = SPRITE3_ICON_URL;
    else if (fmt === 'pms') url = PMS_ICON_URL;
    return `<img src="${url}" class="twstore-img" style="width:${size}px;height:${size}px;object-fit:contain;" draggable="false" crossorigin="anonymous" onerror="this.style.display='none';">`;
  }

  function createFolderIcon(color = 'currentColor', size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" style="flex-shrink:0;"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
  }

  function createChevronIcon(color = 'currentColor', size = 14) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>`;
  }

  function protectImage(img) {
    if (!img) return;
    img.classList.add('twstore-img');
    img.draggable = false;
    img.addEventListener('contextmenu', (e) => e.preventDefault());
    img.addEventListener('dragstart', (e) => e.preventDefault());
    return img;
  }

  async function createAssetFromBlob(blob, assetType, dataFormat) {
    const buffer = await blob.arrayBuffer();
    return runtime.storage.createAsset(assetType, dataFormat, new Uint8Array(buffer), null, true);
  }

  async function fetchBlob(url) {
    const res = await Scratch.fetch(url);
    return await res.blob();
  }

  async function addAssetToProject(asset) {
    const target = vm.editingTarget;

    if (asset.type === 'sprite') {
      const blob = await fetchBlob(asset.url);
      const buffer = await blob.arrayBuffer();
      await vm.addSprite(buffer);
      return;
    }

    if (!target || target.isStage) {
      alert('Please select a sprite to add this asset.');
      throw new Error('No sprite selected');
    }

    if (asset.type === 'costume') {
      const blob = await fetchBlob(asset.url);
      let vmAsset;
      if (asset.format === 'svg') {
        const svgText = await blob.text();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
        vmAsset = await createAssetFromBlob(svgBlob, runtime.storage.AssetType.ImageVector, runtime.storage.DataFormat.SVG);
      } else {
        const fmtMap = { png: runtime.storage.DataFormat.PNG, jpg: runtime.storage.DataFormat.JPG, jpeg: runtime.storage.DataFormat.JPG, bmp: runtime.storage.DataFormat.BMP, gif: runtime.storage.DataFormat.PNG, webp: runtime.storage.DataFormat.PNG };
        const dataFormat = fmtMap[asset.format] || runtime.storage.DataFormat.PNG;
        vmAsset = await createAssetFromBlob(blob, runtime.storage.AssetType.ImageBitmap, dataFormat);
      }
      const md5ext = `${vmAsset.assetId}.${vmAsset.dataFormat}`;
      await vm.addCostume(md5ext, { asset: vmAsset, md5ext, name: asset.name }, target.id);

    } else if (asset.type === 'sound') {
      const blob = await fetchBlob(asset.url);
      let dataFormat = runtime.storage.DataFormat.MP3;
      if (asset.format === 'wav') dataFormat = runtime.storage.DataFormat.WAV;
      const vmAsset = await createAssetFromBlob(blob, runtime.storage.AssetType.Sound, dataFormat);
      const md5ext = `${vmAsset.assetId}.${vmAsset.dataFormat}`;
      await vm.addSound({ asset: vmAsset, md5: md5ext, name: asset.name }, target.id);

    } else if (asset.type === 'extension') {
      const blob = await fetchBlob(asset.url);
      const code = await blob.text();
      const dataUrl = 'data:application/javascript;base64,' + btoa(unescape(encodeURIComponent(code)));
      if (!(await vm.securityManager.canLoadExtensionFromProject(dataUrl))) {
        alert('This extension is not allowed.');
        return;
      }
      await vm.extensionManager.loadExtensionURL(dataUrl);

    } else {
      throw new Error('Unsupported asset type: ' + asset.type);
    }
  }

  function renderProgress(slot, current, total, name, theme) {
    if (!slot) return;
    const pct = Math.round((current / Math.max(total, 1)) * 100);
    slot.innerHTML = '';

    const bar = document.createElement('div');
    bar.style.cssText = `display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: ${theme.surface}; border: 1px solid ${theme.border}; border-radius: 10px; font-family: inherit; font-size: 13px; color: ${theme.text}; box-sizing: border-box; box-shadow: 0 1px 2px ${theme.shadowSoft};`;

    const label = document.createElement('div');
    label.style.cssText = `font-weight: 600; flex-shrink: 0; min-width: 90px; color: ${theme.text};`;
    label.textContent = current >= total ? 'Done' : 'Adding assets';

    const track = document.createElement('div');
    track.style.cssText = `flex: 1; height: 4px; background: ${theme.iconBg}; border-radius: 2px; overflow: hidden; min-width: 60px;`;
    const fill = document.createElement('div');
    fill.style.cssText = `height: 100%; width: ${pct}%; background: ${theme.main}; border-radius: 2px; transition: width 0.2s ease;`;
    track.appendChild(fill);

    const count = document.createElement('div');
    count.style.cssText = `font-weight: 600; flex-shrink: 0; color: ${theme.dim}; font-variant-numeric: tabular-nums; min-width: 70px; text-align: right; font-size: 12px;`;
    count.textContent = `${current} / ${total}`;

    bar.appendChild(label); bar.appendChild(track); bar.appendChild(count);
    slot.appendChild(bar);

    if (name && current < total) {
      const nameEl = document.createElement('div');
      nameEl.style.cssText = `margin-top: 4px; padding: 0 4px; font-size: 11px; color: ${theme.muted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
      nameEl.textContent = name;
      slot.appendChild(nameEl);
    }
  }

  function clearProgress(slot) { if (slot) slot.innerHTML = ''; }

  async function addAllAssetsToProject(product, progressSlot) {
    if (!product.assets || !product.assets.length) {
      alert('No assets in this product.');
      return;
    }
    const theme = getTheme();
    const total = product.assets.length;
    apiIncrementDownload(product.id);
    if (progressSlot) renderProgress(progressSlot, 0, total, 'Preparing...', theme);

    let successCount = 0;
    for (let i = 0; i < total; i++) {
      const asset = product.assets[i];
      if (progressSlot) renderProgress(progressSlot, i, total, asset.name, theme);
      try {
        await addAssetToProject(asset);
        successCount++;
      } catch (e) {
        console.error('[Store] Failed to add asset', asset.name, e);
      }
    }
    if (progressSlot) renderProgress(progressSlot, total, total, `Added ${successCount}/${total}`, theme);
    setTimeout(() => clearProgress(progressSlot), 1200);
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  async function downloadAsset(asset) {
    try {
      const blob = await fetchBlob(asset.url);
      downloadBlob(blob, asset.name + '.' + (asset.format || 'bin'));
    } catch (e) { alert('Download failed: ' + e.message); }
  }

  function generateMD5Hash(data) {
    const bytes = new Uint8Array(data);
    let hash = '';
    for (let i = 0; i < 32; i++) {
      const byte = bytes[i % bytes.length] || 0;
      hash += ((byte * 31 + i * 17) % 256).toString(16).padStart(2, '0');
    }
    return hash;
  }

  let backpackDB = null;
  function openBackpackDB() {
    return new Promise((resolve, reject) => {
      if (backpackDB) { resolve(backpackDB); return; }
      const request = indexedDB.open('TW_Backpack', 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('backpack')) {
          db.createObjectStore('backpack', { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = (event) => { backpackDB = event.target.result; resolve(backpackDB); };
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async function saveToBackpack(data) {
    const db = await openBackpackDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('backpack', 'readwrite');
      const store = tx.objectStore('backpack');
      const req = store.put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveAssetToBackpack(asset) {
    if (asset.type === 'extension') throw new Error('Extensions cannot be saved');
    const blob = await fetchBlob(asset.url);
    const arrayBuffer = await blob.arrayBuffer();
    const md5 = generateMD5Hash(arrayBuffer);

    if (asset.type === 'costume') {
      const mimeMap = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp' };
      await saveToBackpack({
        type: 'costume', mime: mimeMap[asset.format] || 'image/png',
        name: asset.name, bodyData: arrayBuffer, bodyMD5: md5, thumbnailData: arrayBuffer
      });
    } else if (asset.type === 'sound') {
      const mimeMap = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac' };
      await saveToBackpack({
        type: 'sound', mime: mimeMap[asset.format] || 'audio/mpeg',
        name: asset.name, bodyData: arrayBuffer, bodyMD5: md5, thumbnailData: null
      });
    } else if (asset.type === 'sprite') {
      await saveToBackpack({
        type: 'sprite', mime: 'application/x-scratch3-sprite',
        name: asset.name, bodyData: arrayBuffer, bodyMD5: md5, thumbnailData: null
      });
    } else {
      throw new Error('Backpack: unsupported type');
    }
  }

  let currentAudio = null;
  let currentAudioBtn = null;

  function resetCurrentAudio() {
    if (currentAudio) {
      try { currentAudio.pause(); currentAudio.currentTime = 0; } catch (e) {}
      currentAudio = null;
    }
    if (currentAudioBtn) {
      const theme = getTheme();
      try { currentAudioBtn.innerHTML = createPlayIcon(theme.text2); } catch (e) {}
      currentAudioBtn = null;
    }
  }

  function togglePlaySound(asset, btnElement) {
    if (currentAudioBtn === btnElement && currentAudio) {
      resetCurrentAudio();
      return;
    }

    const prevAudio = currentAudio;
    const prevBtn = currentAudioBtn;
    currentAudio = null;
    currentAudioBtn = null;
    if (prevAudio) { try { prevAudio.pause(); } catch (e) {} }
    if (prevBtn) {
      const th = getTheme();
      try { prevBtn.innerHTML = createPlayIcon(th.text2); } catch (e) {}
    }

    if (!asset.url) return;
    const theme = getTheme();
    btnElement.innerHTML = createSpinnerSvg(theme.text2, 24);

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = asset.url;

    currentAudio = audio;
    currentAudioBtn = btnElement;

    let started = false;
    const onReady = () => {
      if (currentAudioBtn !== btnElement) return;
      if (!started) {
        started = true;
        btnElement.innerHTML = createStopIcon(theme.text2);
      }
    };

    audio.addEventListener('canplay', onReady);
    audio.addEventListener('playing', onReady);

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(onReady).catch((e) => {
        if (e && e.name === 'AbortError') return;
        console.error('[Store] Play failed', e);
        if (currentAudioBtn === btnElement) {
          btnElement.innerHTML = createPlayIcon(theme.text2);
          currentAudio = null;
          currentAudioBtn = null;
        }
      });
    }

    audio.onended = () => {
      if (currentAudioBtn === btnElement) {
        btnElement.innerHTML = createPlayIcon(theme.text2);
        currentAudio = null;
        currentAudioBtn = null;
      }
    };
    audio.onerror = () => {
      console.error('[Store] Audio load error');
      if (currentAudioBtn === btnElement) {
        btnElement.innerHTML = createPlayIcon(theme.text2);
        currentAudio = null;
        currentAudioBtn = null;
      }
    };
  }

  function sortProducts(products, mode) {
    switch (mode) {
      case 'featured': return products.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      case 'popular': return products.slice().sort((a, b) => (b.downloads + b.likes * 2) - (a.downloads + a.likes * 2));
      case 'newest': return products.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      case 'oldest': return products.slice().sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      default: return products;
    }
  }

  function createBanner(src, width, height, theme, radius = 10) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `width: ${width}; height: ${height}; flex-shrink: 0; border-radius: ${radius}px; overflow: hidden; background: ${theme.iconBg}; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid ${theme.border}; box-sizing: border-box;`;
    const spinner = document.createElement('div');
    spinner.innerHTML = createSpinnerSvg(theme.dim, 20);
    spinner.style.cssText = 'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;';
    wrap.appendChild(spinner);

    const img = document.createElement('img');
    img.src = src || '';
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.25s; position: relative; z-index: 1;';
    protectImage(img);
    img.onload = () => { img.style.opacity = '1'; spinner.remove(); };
    img.onerror = () => { spinner.remove(); img.style.opacity = '0'; };
    wrap.appendChild(img);
    return wrap;
  }

  function createFeaturedBadge() {
    const el = document.createElement('span');
    el.style.cssText = `display: inline-block; padding: 1px 6px; background: #FFA500; color: #fff; border-radius: 3px; font-size: 10px; font-weight: 600; letter-spacing: 0.2px; line-height: 1.5;`;
    el.textContent = 'Featured';
    return el;
  }

  const assetFolderCollapsed = new Map();
  function getCollapsedSet(productId) {
    if (!assetFolderCollapsed.has(productId)) assetFolderCollapsed.set(productId, new Set());
    return assetFolderCollapsed.get(productId);
  }

  function buildAssetTree(assets) {
    const root = { folders: new Map(), assets: [] };
    (assets || []).forEach(asset => {
      const rawName = String(asset.name || '');
      const parts = rawName.split('//').map(s => s.trim()).filter(Boolean);
      const fileName = parts.length > 1 ? parts[parts.length - 1] : rawName;
      const folderParts = parts.length > 1 ? parts.slice(0, -1) : [];
      let node = root;
      const pathParts = [];
      folderParts.forEach(part => {
        pathParts.push(part);
        if (!node.folders.has(part)) {
          node.folders.set(part, { name: part, path: pathParts.join('/'), folders: new Map(), assets: [] });
        }
        node = node.folders.get(part);
      });
      node.assets.push({ ...asset, _displayName: fileName });
    });
    return root;
  }

  function countAssetsInFolder(folder) {
    let n = folder.assets.length;
    folder.folders.forEach(f => { n += countAssetsInFolder(f); });
    return n;
  }

  function createAssetRow(asset, product, theme, displayName) {
    const assetRow = document.createElement('div');
    assetRow.style.cssText = `display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid ${theme.border}; border-radius: 10px; background: ${theme.surface};`;

    const preview = document.createElement('div');
    preview.style.cssText = `width: 80px; height: 60px; flex-shrink: 0; background: ${theme.iconBg}; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;`;

    if (asset.type === 'costume') {
      const sp = document.createElement('div');
      sp.innerHTML = createSpinnerSvg(theme.dim, 18);
      sp.style.cssText = 'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;';
      preview.appendChild(sp);
      const img = document.createElement('img');
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 0.25s;position:relative;z-index:1;';
      protectImage(img);
      img.onload = () => { img.style.opacity = '1'; sp.remove(); };
      img.onerror = () => { sp.remove(); img.style.opacity = '0'; };
      img.src = asset.url;
      preview.appendChild(img);
    } else if (asset.type === 'sound') {
      const playBtn = document.createElement('button');
      playBtn.style.cssText = `background: transparent; border: none; cursor: pointer; padding: 5px; color: ${theme.text2}; display: flex; align-items: center; justify-content: center;`;
      playBtn.innerHTML = createPlayIcon(theme.text2, 24);
      playBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlaySound(asset, playBtn); });
      preview.appendChild(playBtn);
    } else if (asset.type === 'extension') {
      preview.innerHTML = createJsAssetIcon(theme, 32);
    } else if (asset.type === 'sprite') {
      preview.innerHTML = createSpriteAssetIcon(32, asset.format);
    }

    const assetInfo = document.createElement('div');
    assetInfo.style.cssText = 'flex: 1; min-width: 0;';
    const assetName = document.createElement('div');
    assetName.textContent = displayName || asset.name;
    assetName.style.cssText = `font-weight: 700; color: ${theme.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
    const assetFormat = document.createElement('div');
    assetFormat.textContent = (asset.format || '').toUpperCase();
    assetFormat.style.cssText = `font-size: 11px; color: ${theme.muted};`;
    assetInfo.appendChild(assetName);
    assetInfo.appendChild(assetFormat);

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 5px; align-items: center; flex-shrink: 0;';

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download';
    downloadBtn.style.cssText = `padding:5px 10px; border:1px solid ${theme.border}; border-radius:6px; background:transparent; color:${theme.text}; cursor:pointer; font-weight:600; font-family:inherit; font-size: 12px;`;
    downloadBtn.addEventListener('click', () => downloadAsset(asset));

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.style.cssText = `padding:5px 10px; border:none; border-radius:6px; background:${theme.main}; color:white; cursor:pointer; font-weight:700; font-family:inherit; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;`;
    addBtn.addEventListener('click', async () => {
      const orig = addBtn.innerHTML;
      addBtn.disabled = true;
      addBtn.innerHTML = createSpinnerSvg('#fff', 12);
      try {
        await addAssetToProject(asset);
        apiIncrementDownload(product.id);
      } catch (e) { alert('Error: ' + e.message); }
      finally { addBtn.disabled = false; addBtn.innerHTML = orig; }
    });

    actions.appendChild(downloadBtn);
    actions.appendChild(addBtn);

    if (asset.type !== 'extension') {
      const backpackBtn = document.createElement('button');
      backpackBtn.style.cssText = `width: 30px; height: 30px; padding: 0; border: none; border-radius: 6px; background: ${theme.main}; cursor: pointer; display: flex; align-items: center; justify-content: center;`;
      const backpackIcon = document.createElement('img');
      backpackIcon.src = 'https://bahr-projects.github.io/turbostore/backpack.svg';
      backpackIcon.style.cssText = 'width: 18px; height: 18px;';
      protectImage(backpackIcon);
      backpackBtn.appendChild(backpackIcon);
      backpackBtn.addEventListener('click', async () => {
        const orig = backpackBtn.innerHTML;
        backpackBtn.disabled = true;
        backpackBtn.innerHTML = createSpinnerSvg('#fff', 14);
        try {
          await saveAssetToBackpack(asset);
          apiIncrementDownload(product.id);
        } catch (e) { alert('Error: ' + e.message); }
        finally { backpackBtn.disabled = false; backpackBtn.innerHTML = orig; }
      });
      actions.appendChild(backpackBtn);
    }

    assetRow.appendChild(preview);
    assetRow.appendChild(assetInfo);
    assetRow.appendChild(actions);
    return assetRow;
  }

  function renderAssetTree(container, node, product, theme, collapsedSet) {
    const folderNames = Array.from(node.folders.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    folderNames.forEach(name => {
      const folder = node.folders.get(name);
      const folderEl = document.createElement('div');
      folderEl.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

      const header = document.createElement('div');
      header.style.cssText = `display: flex; align-items: center; gap: 8px; padding: 7px 10px; border: 1px solid ${theme.border}; border-radius: 8px; background: ${theme.surface}; cursor: pointer; user-select: none;`;

      const chevronWrap = document.createElement('span');
      chevronWrap.className = 'twstore-folder-chevron';
      chevronWrap.style.cssText = 'display: flex; align-items: center;';
      chevronWrap.innerHTML = createChevronIcon(theme.dim, 14);
      header.appendChild(chevronWrap);

      const folderIconWrap = document.createElement('span');
      folderIconWrap.style.cssText = 'display: flex; align-items: center;';
      folderIconWrap.innerHTML = createFolderIcon(theme.main, 16);
      header.appendChild(folderIconWrap);

      const nameEl = document.createElement('span');
      nameEl.textContent = folder.name;
      nameEl.style.cssText = `font-weight: 700; color: ${theme.text}; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
      header.appendChild(nameEl);

      const countEl = document.createElement('span');
      countEl.textContent = `(${countAssetsInFolder(folder)})`;
      countEl.style.cssText = `font-size: 11px; color: ${theme.muted}; margin-left: auto; flex-shrink: 0;`;
      header.appendChild(countEl);

      const children = document.createElement('div');
      children.style.cssText = 'display: flex; flex-direction: column; gap: 8px; padding-left: 14px;';

      const isCollapsed = collapsedSet.has(folder.path);
      if (isCollapsed) {
        children.style.display = 'none';
        chevronWrap.style.transform = 'rotate(-90deg)';
      }

      header.addEventListener('click', () => {
        const nowCollapsed = !collapsedSet.has(folder.path);
        if (nowCollapsed) collapsedSet.add(folder.path);
        else collapsedSet.delete(folder.path);
        children.style.display = nowCollapsed ? 'none' : 'flex';
        chevronWrap.style.transform = nowCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
      });

      renderAssetTree(children, folder, product, theme, collapsedSet);

      folderEl.appendChild(header);
      folderEl.appendChild(children);
      container.appendChild(folderEl);
    });

    const sortedAssets = node.assets.slice().sort((a, b) =>
      String(a._displayName || a.name || '').localeCompare(String(b._displayName || b.name || ''), undefined, { sensitivity: 'base' })
    );
    sortedAssets.forEach(asset => {
      container.appendChild(createAssetRow(asset, product, theme, asset._displayName));
    });
  }

  async function showProductDetail(productId) {
    const container = guiElements.panel;
    if (!container) return;
    const theme = getTheme();
    container.innerHTML = `<div style="text-align:center;padding:40px;color:${theme.dim};">${createSpinnerSvg(theme.dim, 32)}</div>`;
    currentProductId = productId;

    let product = productDetailsCache[productId];
    if (!product) product = await fetchProductDetail(productId);
    if (!product) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:${theme.dim};">Failed to load product.</div>`;
      return;
    }

    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'twstore-scroll';
    wrap.style.cssText = 'flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 20px;';
    container.appendChild(wrap);

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.style.cssText = `padding: 6px 14px; border: 1px solid ${theme.border}; border-radius: 8px; background: ${theme.surface}; color: ${theme.text}; cursor: pointer; font-weight: 600; font-size: 13px; margin: 10px 15px; font-family: inherit;`;
    backBtn.addEventListener('click', () => { resetCurrentAudio(); openStorePanel(); });
    wrap.appendChild(backBtn);

    const mainRow = document.createElement('div');
    mainRow.style.cssText = 'display: flex; gap: 20px; margin: 10px 15px; flex-wrap: wrap;';

    const bannerWrap = document.createElement('div');
    bannerWrap.style.cssText = 'flex: 1 1 260px; min-width: 200px; max-width: 340px;';
    const banner = createBanner(product.banner, '100%', '0', theme, 14);
    banner.style.height = 'auto';
    banner.style.aspectRatio = '2 / 1';
    bannerWrap.appendChild(banner);

    const info = document.createElement('div');
    info.style.cssText = 'flex: 1 1 260px; min-width: 0; display: flex; flex-direction: column;';

    const nameEl = document.createElement('h2');
    nameEl.textContent = product.name;
    nameEl.style.cssText = `margin: 0 0 5px 0; font-size: 20px; color: ${theme.text};`;
    info.appendChild(nameEl);

    const authorEl = document.createElement('div');
    if (product.authorUrl) {
      const link = document.createElement('a');
      link.href = product.authorUrl; link.target = '_blank';
      link.textContent = 'by ' + product.author;
      link.style.cssText = `color: ${theme.main}; text-decoration: underline;`;
      authorEl.appendChild(link);
    } else {
      authorEl.textContent = 'by ' + product.author;
      authorEl.style.color = theme.text2;
    }
    authorEl.style.cssText += 'margin-bottom: 5px; font-size: 14px;';
    info.appendChild(authorEl);

    const dates = document.createElement('div');
    dates.style.cssText = `font-size: 12px; color: ${theme.dim}; margin-bottom: 10px;`;
    dates.textContent = `Created: ${product.createdAt || ''} · Updated: ${product.updatedAt || ''}`;
    info.appendChild(dates);

    if (product.featured) {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom: 8px;';
      row.appendChild(createFeaturedBadge());
      info.appendChild(row);
    }

    const stats = document.createElement('div');
    stats.style.cssText = 'display: flex; gap: 20px; align-items: center; margin-bottom: 10px;';

    const downloads = document.createElement('span');
    downloads.innerHTML = createDownloadIcon(theme.text2) + ' ' + product.downloads;
    downloads.style.cssText = `display: flex; align-items: center; gap: 5px; font-size: 15px; font-weight: 700; color: ${theme.text2};`;
    stats.appendChild(downloads);

    let liked = likedCache[product.id]?.liked ?? false;
    if (likedCache[product.id] === undefined && isLoggedIn()) {
      liked = await apiCheckLike(product.id);
      likedCache[product.id] = { liked, likes: product.likes };
    }

    const likeBtn = document.createElement('span');
    const updateLikeBtn = () => {
      likeBtn.innerHTML = createHeartIcon(liked, liked ? theme.main : theme.text2) + ' ' + product.likes;
      likeBtn.style.color = liked ? theme.main : theme.text2;
    };
    updateLikeBtn();
    likeBtn.style.cssText = 'display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 15px; font-weight: 700; user-select: none;';
    likeBtn.addEventListener('click', async () => {
      if (!isLoggedIn()) { alert('Please log in to like this product.'); return; }
      const result = await apiToggleLike(product.id);
      if (result) {
        liked = result.liked; product.likes = result.likes;
        likedCache[product.id] = { liked, likes: result.likes };
        updateLikeBtn();
      }
    });
    stats.appendChild(likeBtn);
    info.appendChild(stats);

    const addAllBtn = document.createElement('button');
    addAllBtn.textContent = 'Add All';
    addAllBtn.style.cssText = `padding: 10px 18px; border: none; border-radius: 8px; background: ${theme.main}; color: white; cursor: pointer; font-weight: 700; font-size: 14px; margin-top: 5px; align-self: flex-start; font-family: inherit;`;
    info.appendChild(addAllBtn);

    mainRow.appendChild(bannerWrap);
    mainRow.appendChild(info);
    wrap.appendChild(mainRow);

    const progressSlot = document.createElement('div');
    progressSlot.style.cssText = 'margin: 6px 15px 8px;';
    wrap.appendChild(progressSlot);

    addAllBtn.addEventListener('click', async () => {
      const orig = addAllBtn.textContent;
      addAllBtn.disabled = true;
      addAllBtn.innerHTML = createSpinnerSvg('#fff', 14) + ' ' + orig;
      try { await addAllAssetsToProject(product, progressSlot); }
      finally { addAllBtn.disabled = false; addAllBtn.textContent = orig; }
    });

    const assetsContainer = document.createElement('div');
    assetsContainer.style.cssText = 'margin: 0 15px 12px;';

    const assetsTitleRow = document.createElement('div');
    assetsTitleRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';

    const assetsTitle = document.createElement('div');
    assetsTitle.textContent = 'Assets';
    assetsTitle.style.cssText = `font-weight: 700; color: ${theme.text}; flex-shrink: 0;`;
    assetsTitleRow.appendChild(assetsTitle);

    const assetSearchInput = document.createElement('input');
    assetSearchInput.type = 'text';
    assetSearchInput.placeholder = 'Search assets...';
    assetSearchInput.style.cssText = `flex: 1; min-width: 0; padding: 5px 10px; border: 1px solid ${theme.border}; border-radius: 8px; background: ${theme.inputBg}; color: ${theme.text}; font-size: 12px; font-family: inherit; outline: none; box-sizing: border-box;`;
    assetSearchInput.addEventListener('focus', () => { assetSearchInput.style.borderColor = theme.main; });
    assetSearchInput.addEventListener('blur', () => { assetSearchInput.style.borderColor = theme.border; });
    assetsTitleRow.appendChild(assetSearchInput);

    assetsContainer.appendChild(assetsTitleRow);

    const assetsList = document.createElement('div');
    assetsList.className = 'twstore-scroll';
    assetsList.style.cssText = `max-height: 240px; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: 8px;`;
    assetsContainer.appendChild(assetsList);

    const collapsedSet = getCollapsedSet(product.id);
    let assetSearch = '';

    function refreshAssets() {
      assetsList.innerHTML = '';
      const q = assetSearch.trim().toLowerCase();
      const allAssets = product.assets || [];
      const filtered = q
        ? allAssets.filter(a => String(a.name || '').toLowerCase().includes(q))
        : allAssets;

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = q ? 'No matching assets.' : 'No assets.';
        empty.style.cssText = `text-align: center; color: ${theme.dim}; padding: 20px; font-size: 13px;`;
        assetsList.appendChild(empty);
        return;
      }

      const tree = buildAssetTree(filtered);
      renderAssetTree(assetsList, tree, product, theme, collapsedSet);
    }

    assetSearchInput.addEventListener('input', () => {
      assetSearch = assetSearchInput.value;
      refreshAssets();
    });

    refreshAssets();

    wrap.appendChild(assetsContainer);

    const descContainer = document.createElement('div');
    descContainer.style.cssText = 'margin: 0 15px 12px;';
    const descTitle = document.createElement('div');
    descTitle.textContent = 'Description';
    descTitle.style.cssText = `font-weight: 700; margin-bottom: 5px; color: ${theme.text};`;
    descContainer.appendChild(descTitle);

    const desc = document.createElement('div');
    desc.className = 'twstore-desc-scroll';
    desc.innerHTML = renderDescription(product.description || '', theme);
    desc.style.cssText = `white-space: pre-wrap; color: ${theme.text2}; line-height: 1.5; max-height: 140px; overflow-y: auto; padding-right: 4px; background: transparent;`;
    descContainer.appendChild(desc);
    wrap.appendChild(descContainer);

    if ((product.tags || []).length) {
      const tagsContainer = document.createElement('div');
      tagsContainer.style.cssText = 'margin: 0 15px 10px;';
      const tagsTitle = document.createElement('div');
      tagsTitle.textContent = 'Tags';
      tagsTitle.style.cssText = `font-weight: 700; margin-bottom: 5px; color: ${theme.text}; font-size: 13px;`;
      tagsContainer.appendChild(tagsTitle);
      const tagsList = document.createElement('div');
      tagsList.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;';
      product.tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.style.cssText = `display:inline-flex; align-items:center; padding:2px 8px; border:1px solid ${theme.border}; border-radius:10px; font-size:11px; color:${theme.text2}; background:${theme.surface};`;
        tagEl.textContent = tag;
        tagsList.appendChild(tagEl);
      });
      tagsContainer.appendChild(tagsList);
      wrap.appendChild(tagsContainer);
    }
  }

  function showAccountView() {
    const container = guiElements.panel;
    if (!container) return;
    resetCurrentAudio();
    const theme = getTheme();
    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'twstore-scroll';
    wrap.style.cssText = 'flex: 1; overflow-y: auto;';
    container.appendChild(wrap);

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.style.cssText = `padding: 6px 14px; border: 1px solid ${theme.border}; border-radius: 8px; background: ${theme.surface}; color: ${theme.text}; cursor: pointer; font-weight: 600; margin: 15px; font-family: inherit; font-size: 13px;`;
    backBtn.addEventListener('click', () => openStorePanel());
    wrap.appendChild(backBtn);

    const acc = document.createElement('div');
    acc.style.cssText = 'margin: 20px 15px; display: flex; flex-direction: column; gap: 15px;';

    if (isLoggedIn()) {
      const header = document.createElement('div');
      header.style.cssText = 'display: flex; align-items: center; gap: 15px;';
      const avatar = document.createElement('img');
      avatar.src = authState.profilePicture;
      avatar.style.cssText = `width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid ${theme.main};`;
      protectImage(avatar);
      header.appendChild(avatar);
      const name = document.createElement('h2');
      name.textContent = authState.fullName || authState.accountName;
      name.style.cssText = `margin:0;color:${theme.text};`;
      header.appendChild(name);
      acc.appendChild(header);

      const email = document.createElement('div');
      email.textContent = authState.accountName;
      email.style.cssText = `color:${theme.dim};`;
      acc.appendChild(email);

      const buttons = [
        { label: 'Publish your own', action: () => window.open('https://hamburger-chat.ru/store/upload.html', '_blank') },
        { label: 'Support', action: () => window.open('https://t.me/bahr6424', '_blank') },
        { label: 'Log out', action: () => { logout(); }, danger: true }
      ];

      buttons.forEach(btnInfo => {
        const btn = document.createElement('button');
        btn.textContent = btnInfo.label;
        btn.style.cssText = `padding: 10px 16px; border: 1px solid ${btnInfo.danger ? 'rgba(220,50,50,0.4)' : theme.border}; border-radius: 8px; background: ${btnInfo.danger ? 'rgba(220,50,50,0.1)' : theme.surface}; color: ${btnInfo.danger ? '#e04c4c' : theme.text}; cursor: pointer; font-weight: 600; text-align: left; font-family: inherit; font-size: 14px;`;
        btn.addEventListener('click', btnInfo.action);
        acc.appendChild(btn);
      });
    } else {
      const loginBtn = document.createElement('button');
      loginBtn.textContent = 'Log in with Google';
      loginBtn.style.cssText = `padding: 12px 24px; border: none; border-radius: 8px; background: ${theme.main}; color: white; cursor: pointer; font-weight: 700; font-size: 15px; font-family: inherit;`;
      loginBtn.addEventListener('click', () => loginWithGoogle());
      acc.appendChild(loginBtn);
    }

    wrap.appendChild(acc);
  }

  function genProductCard(product, theme) {
    const card = document.createElement('div');
    const borderColor = product.featured ? '#FFA500' : theme.border;
    const bgColor = product.featured
      ? (theme.dark ? 'rgba(255,165,0,0.06)' : 'rgba(255,165,0,0.08)')
      : theme.surfaceSolid;
    card.style.cssText = `width: 100%; padding: 8px; margin: 0.5% 0; border: 2px solid ${borderColor}; border-radius: 15px; cursor: pointer; transition: box-shadow 180ms ease, border-color 180ms; display: flex; align-items: center; gap: 12px; box-sizing: border-box; background: ${bgColor};`;

    const bannerWrap = document.createElement('div');
    bannerWrap.style.cssText = 'width: 160px; height: 80px; flex-shrink: 0;';
    bannerWrap.appendChild(createBanner(product.banner, '160px', '80px', theme, 10));
    card.appendChild(bannerWrap);

    const info = document.createElement('div');
    info.style.cssText = 'flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;';

    const name = document.createElement('div');
    name.textContent = product.name;
    name.style.cssText = `font-weight:700; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:${theme.text};`;
    info.appendChild(name);

    const author = document.createElement('div');
    if (product.authorUrl) {
      const link = document.createElement('a');
      link.href = product.authorUrl; link.target = '_blank';
      link.textContent = 'by ' + product.author;
      link.style.cssText = `color:${theme.main};text-decoration:underline;`;
      author.appendChild(link);
    } else {
      author.textContent = 'by ' + product.author;
      author.style.color = theme.text2;
    }
    author.style.cssText += 'font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
    info.appendChild(author);

    const stats = document.createElement('div');
    stats.style.cssText = 'display:flex; gap:10px; align-items:center; margin-top:2px;';
    const downloads = document.createElement('span');
    downloads.innerHTML = createDownloadIcon(theme.dim, 14) + ' ' + product.downloads;
    downloads.style.cssText = `display:flex; align-items:center; gap:3px; font-size:12px; color:${theme.dim};`;
    const liked = likedCache[product.id]?.liked ?? product.liked;
    const likes = document.createElement('span');
    likes.innerHTML = createHeartIcon(liked, liked ? theme.main : theme.dim, 14) + ' ' + product.likes;
    likes.style.cssText = `display:flex; align-items:center; gap:3px; font-size:12px; color:${liked ? theme.main : theme.dim};`;
    stats.appendChild(downloads); stats.appendChild(likes);
    info.appendChild(stats);

    if ((product.tags || []).length) {
      const tagsPreview = document.createElement('div');
      tagsPreview.style.cssText = 'display:flex; gap:3px; margin-top:2px; flex-wrap: wrap;';
      product.tags.slice(0, 2).forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.style.cssText = `display:inline-flex; align-items:center; padding:2px 8px; border:1px solid ${theme.border}; border-radius:10px; font-size:10px; color:${theme.text2}; background:${theme.surfaceAlt};`;
        tagEl.textContent = tag;
        tagsPreview.appendChild(tagEl);
      });
      info.appendChild(tagsPreview);
    }

    card.appendChild(info);

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.style.cssText = `padding: 6px 14px; border: none; border-radius: 6px; background: ${theme.main}; color: white; cursor: pointer; font-weight: 700; flex-shrink: 0; font-family: inherit; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;`;
    addBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const orig = addBtn.textContent;
      addBtn.disabled = true;
      addBtn.innerHTML = createSpinnerSvg('#fff', 12);
      try {
        const full = productDetailsCache[product.id] || await fetchProductDetail(product.id);
        if (full) await addAllAssetsToProject(full);
      } finally { addBtn.disabled = false; addBtn.textContent = orig; }
    });
    card.appendChild(addBtn);

    card.addEventListener('mouseenter', () => {
      if (!product.featured) {
        card.style.boxShadow = `0 0 0 3px ${theme.main}80, 0 4px 14px ${theme.shadow}`;
        card.style.borderColor = theme.main;
      } else {
        card.style.boxShadow = `0 0 0 3px ${theme.main}80`;
      }
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '';
      card.style.borderColor = borderColor;
    });
    card.addEventListener('click', () => { resetCurrentAudio(); showProductDetail(product.id); });

    return card;
  }

  function openStorePanel() {
    if (guiElements.panel) { guiElements.panel.remove(); delete guiElements.panel; }
    resetCurrentAudio();

    const theme = getTheme();

    const container = document.createElement('div');
    container.classList.add('store-manager');
    container.style.cssText = `height: 95%; margin: 0 15px 15px 15px; display: flex; flex-direction: column; overflow: hidden; padding-top: 10px;`;

    container.addEventListener('contextmenu', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });
    container.addEventListener('dragstart', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });

    const topBar = document.createElement('div');
    topBar.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; align-items: center;';

    const searchArea = document.createElement('div');
    searchArea.style.cssText = 'flex: 1; min-width: 200px;';

    const tagInputWrapper = document.createElement('div');
    tagInputWrapper.style.cssText = `display: flex; flex-wrap: wrap; align-items: center; gap: 5px; padding: 4px 8px; border: 1px solid ${theme.border}; border-radius: 8px; background: ${theme.surfaceSolid};`;

    const chipsContainer = document.createElement('div');
    chipsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px; align-items: center;';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Search or add tags...';
    textInput.style.cssText = `flex: 1; min-width: 120px; border: none; outline: none; background: transparent; color: ${theme.text}; font-size: 14px; padding: 4px; font-family: inherit;`;
    textInput.value = searchQuery;

    const filterSelect = document.createElement('select');
    filterSelect.style.cssText = `padding: 5px 10px; border: 1px solid ${theme.border}; border-radius: 8px; background: ${theme.surfaceSolid}; color: ${theme.text}; cursor: pointer; font-size: 12px; color-scheme: ${theme.dark ? 'dark' : 'light'}; font-family: inherit;`;
    [
      { value: 'featured', label: 'Featured' },
      { value: 'popular', label: 'Most Popular' },
      { value: 'newest', label: 'Newest' },
      { value: 'oldest', label: 'Oldest' }
    ].forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value; option.textContent = opt.label;
      filterSelect.appendChild(option);
    });
    filterSelect.value = currentSort;
    filterSelect.addEventListener('change', () => { currentSort = filterSelect.value; visibleCount = PAGE_SIZE; renderProductList(); });

    const authButton = document.createElement('button');
    authButton.style.cssText = `padding: 5px; border: none; border-radius: 50%; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center;`;
    if (isLoggedIn()) {
      authButton.innerHTML = `<img src="${authState.profilePicture}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" draggable="false">`;
      protectImage(authButton.querySelector('img'));
    } else {
      authButton.textContent = 'Log in';
      authButton.style.cssText += ` border: 1px solid ${theme.border}; border-radius: 8px; padding: 6px 14px; font-weight: 700; color: ${theme.text}; background: ${theme.surfaceSolid}; font-family: inherit; font-size: 13px;`;
    }
    authButton.addEventListener('click', () => { if (isLoggedIn()) showAccountView(); else loginWithGoogle(); });

    topBar.appendChild(searchArea);
    topBar.appendChild(filterSelect);
    topBar.appendChild(authButton);

    const tagsRow = document.createElement('div');
    tagsRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center; flex-wrap: wrap;';
    const tagsGroup = document.createElement('div');
    tagsGroup.style.cssText = 'display: flex; flex-wrap: wrap; gap: 5px; flex: 1; min-width: 0;';

    ['costume', 'sound', 'sprite', 'extension', 'music'].forEach(tag => {
      const btn = document.createElement('button');
      const isActive = activeTags.includes(tag);
      btn.style.cssText = `padding: 5px 12px; border: 1px solid ${isActive ? theme.main : theme.border}; border-radius: 8px; background: ${isActive ? theme.main : theme.surfaceSolid}; color: ${isActive ? '#fff' : theme.text2}; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; transition: all 0.15s;`;
      btn.textContent = tag;
      btn.addEventListener('click', () => {
        if (activeTags.includes(tag)) activeTags = activeTags.filter(t => t !== tag);
        else activeTags.push(tag);
        visibleCount = PAGE_SIZE;
        updateChips();
        openStorePanel();
      });
      tagsGroup.appendChild(btn);
    });
    tagsRow.appendChild(tagsGroup);

    const rightGroup = document.createElement('div');
    rightGroup.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-shrink: 0;';

    const showUpdate = !latestVersion || latestVersion !== EXT_VERSION;
    if (showUpdate) {
      const updateBtn = document.createElement('button');
      updateBtn.textContent = latestVersion ? `v${latestVersion} available` : 'Update available';
      updateBtn.style.cssText = `padding: 5px 12px; border: 1px solid ${theme.main}; border-radius: 8px; background: transparent; color: ${theme.main}; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; white-space: nowrap;`;
      updateBtn.addEventListener('mouseenter', () => { updateBtn.style.background = theme.main; updateBtn.style.color = '#fff'; });
      updateBtn.addEventListener('mouseleave', () => { updateBtn.style.background = 'transparent'; updateBtn.style.color = theme.main; });
      updateBtn.addEventListener('click', () => {
        const url = latestVersion ? `${VERSIONS_BASE}/v${latestVersion}.js` : VERSIONS_FOLDER;
        window.open(url, '_blank');
      });
      rightGroup.appendChild(updateBtn);
    }

    const discordBtn = document.createElement('button');
    discordBtn.style.cssText = `width: 32px; height: 32px; border: 1px solid ${theme.border}; border-radius: 8px; background: ${theme.surfaceSolid}; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;`;
    discordBtn.innerHTML = `<img src="${DISCORD_ICON_URL}" style="width:18px;height:18px;object-fit:contain;" draggable="false">`;
    protectImage(discordBtn.querySelector('img'));
    discordBtn.addEventListener('mouseenter', () => { discordBtn.style.borderColor = theme.main; });
    discordBtn.addEventListener('mouseleave', () => { discordBtn.style.borderColor = theme.border; });
    discordBtn.addEventListener('click', () => window.open(DISCORD_URL, '_blank'));
    rightGroup.appendChild(discordBtn);

    tagsRow.appendChild(rightGroup);

    const listContainer = document.createElement('div');
    listContainer.className = 'twstore-scroll';
    listContainer.style.cssText = `flex: 1; min-height: 0; max-height: calc(100vh - 280px); overflow-y: auto; overflow-x: hidden; border: 1px solid ${theme.border}; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; background: ${theme.surfaceAlt};`;

    function updateChips() {
      chipsContainer.innerHTML = '';
      activeTags.forEach(tag => {
        const chip = document.createElement('span');
        chip.style.cssText = `display:inline-flex;align-items:center;gap:5px;padding:3px 10px;background:${theme.main};color:white;border-radius:12px;font-size:12px;font-weight:600;`;
        const label = document.createElement('span'); label.textContent = tag;
        const removeBtn = document.createElement('span');
        removeBtn.textContent = '×';
        removeBtn.style.cssText = 'cursor:pointer;font-weight:bold;font-size:14px;line-height:1;';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          activeTags = activeTags.filter(t => t !== tag);
          visibleCount = PAGE_SIZE;
          updateChips();
          openStorePanel();
        });
        chip.appendChild(label); chip.appendChild(removeBtn);
        chipsContainer.appendChild(chip);
      });
    }

    textInput.addEventListener('input', () => { searchQuery = textInput.value; visibleCount = PAGE_SIZE; renderProductList(); });
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const tag = textInput.value.trim().toLowerCase();
        if (tag && !activeTags.includes(tag)) {
          activeTags.push(tag); textInput.value = ''; searchQuery = '';
          visibleCount = PAGE_SIZE;
          openStorePanel();
        }
      }
    });

    tagInputWrapper.appendChild(chipsContainer);
    tagInputWrapper.appendChild(textInput);
    searchArea.appendChild(tagInputWrapper);

    function renderProductList() {
      listContainer.innerHTML = '';
      if (!productsLoaded || productsLoading) {
        const loadingMsg = document.createElement('div');
        loadingMsg.innerHTML = createSpinnerSvg(theme.dim, 24);
        loadingMsg.style.cssText = `width:100%;text-align:center;padding:40px;`;
        listContainer.appendChild(loadingMsg);
        return;
      }
      const filtered = storeProducts.filter(product => {
        if (activeTags.length > 0 && !activeTags.every(tag => (product.tags || []).includes(tag))) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const haystack = [product.name, product.author, product.description, ...(product.tags || [])].join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      });
      const sorted = sortProducts(filtered, currentSort);

      if (sorted.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.textContent = 'No products found.';
        emptyMsg.style.cssText = `width:100%;text-align:center;color:${theme.dim};padding:40px;`;
        listContainer.appendChild(emptyMsg);
        return;
      }

      const toShow = sorted.slice(0, visibleCount);
      toShow.forEach(product => listContainer.appendChild(genProductCard(product, theme)));

      if (sorted.length > visibleCount) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.textContent = 'Load more';
        loadMoreBtn.style.cssText = `margin: 12px auto 4px; padding: 10px 24px; border: 1px solid ${theme.border}; border-radius: 8px; background: ${theme.surfaceSolid}; color: ${theme.text}; cursor: pointer; font-weight: 600; font-size: 13px; font-family: inherit; display: block;`;
        loadMoreBtn.addEventListener('mouseenter', () => { loadMoreBtn.style.background = theme.main; loadMoreBtn.style.color = '#fff'; loadMoreBtn.style.borderColor = theme.main; });
        loadMoreBtn.addEventListener('mouseleave', () => { loadMoreBtn.style.background = theme.surfaceSolid; loadMoreBtn.style.color = theme.text; loadMoreBtn.style.borderColor = theme.border; });
        loadMoreBtn.addEventListener('click', () => { visibleCount += PAGE_SIZE; renderProductList(); });
        listContainer.appendChild(loadMoreBtn);
      }
    }

    container.appendChild(topBar);
    container.appendChild(tagsRow);
    container.appendChild(listContainer);

    if (!productsLoaded) fetchProducts().then(() => renderProductList());
    renderProductList();
    updateChips();

    const guiSpace = document.querySelector('div[class^="gui_tabs_"]')?.firstChild;
    if (guiSpace) {
      guiSpace.insertAdjacentElement('afterend', container);
      guiElements.panel = container;
    }
  }

  function attachTab() {
    const tabs = document.querySelectorAll('li[class*="react-tabs_react-tabs__tab"]');
    if (!tabs.length) return;
    const lastTab = tabs[tabs.length - 1];
    const cloneTab = lastTab.cloneNode(true);
    lastTab.insertAdjacentElement('afterend', cloneTab);
    const childs = isPM ? cloneTab.firstChild.children : cloneTab.children;
    childs[0].src = constructTabIMG();
    childs[0].style.width = '14px';
    childs[0].style.height = '14px';
    childs[1].textContent = 'Store';
    guiElements.cloneTab = { cloneTab, img: childs[0] };
    cloneTab.setAttribute('style', 'display: flex; justify-content: center; align-items: center;');
    cloneTab.addEventListener('click', (e) => {
      if (typeof ReduxStore !== 'undefined') {
        ReduxStore.dispatch({ type: 'scratch-gui/navigation/ACTIVATE_TAB', activeTabIndex: -2 });
      }
      e.stopPropagation();
    });
  }

  function openStoreTab() {
    const guiSpace = document.querySelector('div[class^="gui_tabs_"]')?.firstChild;
    if (!guiSpace) return;
    openStorePanel();
  }

  let __lastDarkTheme = null;
  function startThemeWatcher() {
    __lastDarkTheme = isDarkTheme();
    setInterval(() => {
      if (!guiElements.panel) { __lastDarkTheme = isDarkTheme(); return; }
      const cur = isDarkTheme();
      if (cur !== __lastDarkTheme) {
        __lastDarkTheme = cur;
        try {
          if (currentProductId) showProductDetail(currentProductId);
          else openStorePanel();
        } catch (e) { openStorePanel(); }
      }
    }, 500);
  }

  function startListenerWorker() {
    const checkInEditor = () => !ReduxStore.getState().scratchGui.mode.isPlayerOnly;
    let inEditor = checkInEditor();
    if (inEditor) attachTab();
    ReduxStore.subscribe(() => {
      const currentlyInEditor = checkInEditor();
      if (inEditor !== currentlyInEditor) {
        inEditor = currentlyInEditor;
        if (inEditor) vm.once('workspaceUpdate', () => attachTab());
      }
      if (currentlyInEditor) {
        if (!guiElements.cloneTab) return;
        const thisTab = ReduxStore.getState().scratchGui.editorTab.activeTabIndex;
        const tabImg = guiElements.cloneTab.img;
        tabImg.src = constructTabIMG();
        if (thisTab === -2) {
          guiElements.cloneTab.cloneTab.style.height = 'calc(100% - 15%)';
          tabImg.style.filter = 'saturate(1)';
          if (!guiElements.panel) openStoreTab();
        } else {
          guiElements.cloneTab.cloneTab.style.height = 'calc(100% - 20%)';
          tabImg.style.filter = '';
          if (guiElements.panel) { resetCurrentAudio(); guiElements.panel.remove(); delete guiElements.panel; }
        }
      }
    });
  }

  if (isEditor && typeof ReduxStore !== 'undefined') {
    startListenerWorker();
    startThemeWatcher();
  } else if (isEditor) {
    const checkStore = setInterval(() => {
      if (typeof ReduxStore !== 'undefined') { clearInterval(checkStore); startListenerWorker(); startThemeWatcher(); }
    }, 100);
  }

  fetchProducts();
  fetchLatestVersion().then(v => { latestVersion = v; });

  class StoreExtension {
    getInfo() {
      return {
        id: 'twStore',
        name: 'Assets Store',
        color1: '#FF6680',
        color2: '#FF4C66',
        blockIconURI: PALETTE_ICON_URL,
        menuIconURI: PALETTE_ICON_URL,
        blocks: [
          { blockType: Scratch.BlockType.LABEL, text: 'This extension is not a tool' },
          { blockType: Scratch.BlockType.LABEL, text: 'for working with sprites. It is' },
          { blockType: Scratch.BlockType.LABEL, text: 'recommended to remove it from the' },
          { blockType: Scratch.BlockType.LABEL, text: 'project upon export.' }
        ]
      };
    }
  }
  Scratch.extensions.register(new StoreExtension());

  if (!isTurboWarp) {
    setTimeout(() => {
      try {
        const em = vm.extensionManager;
        if (em && em._loadedExtensions) {
          em._loadedExtensions.delete('twStore');
          if (typeof em.refreshBlocks === 'function') em.refreshBlocks();
          vm.emit('workspaceUpdate');
        }
      } catch (e) {}
    }, 5000);
  }
})(Scratch);
