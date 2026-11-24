/* Junkyard Joyride - small DOM helpers: icons, toasts, modals */
(function (JJ) {
  'use strict';

  const S = (body, vb) => '<svg viewBox="' + (vb || '0 0 24 24') + '" aria-hidden="true">' + body + '</svg>';
  const STROKE = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  const ICONS = {
    play: S('<path d="M7 4.6v14.8L19.4 12z" fill="currentColor" stroke="#2a1d14" stroke-width="1.6" stroke-linejoin="round"/>'),
    back: S('<path d="M15 4.5 7.5 12l7.5 7.5" ' + STROKE + ' stroke-width="3.6"/>'),
    next: S('<path d="M9 4.5 16.5 12 9 19.5" ' + STROKE + ' stroke-width="3.6"/>'),
    pause: S('<rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/>'),
    restart: S('<path d="M19 12a7 7 0 1 1-2.1-5" ' + STROKE + '/><path d="M18.8 3.5v4.4h-4.4" ' + STROKE + '/>'),
    wrench: S('<path d="M14.7 6.3a4 4 0 0 0-5.1 5.1l-5 5a1.8 1.8 0 0 0 2.5 2.5l5-5a4 4 0 0 0 5.1-5.1l-2.4 2.4-2.4-.6-.6-2.4z" fill="currentColor"/>'),
    gear: S('<path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zm8.2 4.6-.1-2.4-2.2-.6a6.4 6.4 0 0 0-.6-1.4l1.1-2-1.7-1.7-2 1.1a6.4 6.4 0 0 0-1.4-.6L12.8 3.4h-2.4l-.6 2.2a6.4 6.4 0 0 0-1.4.6l-2-1.1-1.7 1.7 1.1 2a6.4 6.4 0 0 0-.6 1.4l-2.2.6v2.4l2.2.6c.1.5.3 1 .6 1.4l-1.1 2 1.7 1.7 2-1.1c.4.3.9.5 1.4.6l.6 2.2h2.4l.6-2.2c.5-.1 1-.3 1.4-.6l2 1.1 1.7-1.7-1.1-2c.3-.4.5-.9.6-1.4z" fill="currentColor"/>'),
    shield: S('<path d="M12 2.8 4.5 5.6v5.6c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10V5.6z" fill="currentColor"/><path d="M8.6 12l2.4 2.4 4.6-4.8" fill="none" stroke="#2a1d14" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
    eye: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>'),
    undo: S('<path d="M8.5 8.5H15a5 5 0 0 1 0 10h-4" ' + STROKE + '/><path d="M11.5 4.5l-4 4 4 4" ' + STROKE + '/>'),
    trash: S('<path d="M4.5 6.5h15M9.5 6.5V4.2h5v2.3M6.5 6.5l1 13h9l1-13" ' + STROKE + ' stroke-width="2.6"/><path d="M10 10v6M14 10v6" ' + STROKE + ' stroke-width="2.2"/>'),
    eraser: S('<path d="M14.2 4.6 20 10.4a1.6 1.6 0 0 1 0 2.2l-7.3 7.3H8.4l-4.2-4.2a1.6 1.6 0 0 1 0-2.2l7.8-7.8a1.6 1.6 0 0 1 2.2-1.1z" fill="currentColor"/><path d="M8.6 9 15 15.4M8.4 19.9H20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'),
    star: S('<path d="M12 2.6l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8z" fill="currentColor" stroke="#2a1d14" stroke-width="1.5" stroke-linejoin="round"/>'),
    lock: S('<rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/>'),
    close: S('<path d="M6 6l12 12M18 6 6 18" ' + STROKE + '/>'),
    home: S('<path d="M3.5 11.5 12 4l8.5 7.5M6 10v10h4.5v-5h3v5H18V10" ' + STROKE + ' stroke-width="2.6"/>'),
    grid: S('<rect x="4" y="4" width="6.5" height="6.5" rx="1.5" fill="currentColor"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" fill="currentColor"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" fill="currentColor"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" fill="currentColor"/>'),
    check: S('<path d="M5 12.5l4.2 4.2L19 7" ' + STROKE + ' stroke-width="3.4"/>'),
    sound: S('<path d="M4 9.5h4l5-4v13l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12" ' + STROKE + ' stroke-width="2.2"/>'),
    plus: S('<path d="M12 5v14M5 12h14" ' + STROKE + '/>'),
    copy: S('<rect x="8" y="8" width="11" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
    download: S('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" ' + STROKE + ' stroke-width="2.6"/>'),
    upload: S('<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14" ' + STROKE + ' stroke-width="2.6"/>'),
    edit: S('<path d="M4.5 19.5l1-4.5L15.8 4.7a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L9 18.5z" fill="currentColor"/>'),
    logout: S('<path d="M14 4.5H6.5v15H14M10.5 12H20M16.5 8.5 20 12l-3.5 3.5" ' + STROKE + ' stroke-width="2.6"/>'),
    chart: S('<path d="M4 20V4M4 20h16" ' + STROKE + ' stroke-width="2.4"/><rect x="7" y="11" width="3" height="7" rx="1" fill="currentColor"/><rect x="12" y="7" width="3" height="11" rx="1" fill="currentColor"/><rect x="17" y="13" width="3" height="5" rx="1" fill="currentColor"/>'),
    bolt: S('<path d="M13.5 2.5 5 13.5h6l-1.5 8 8.5-11h-6z" fill="currentColor"/>'),
    map: S('<path d="M3.5 6.5 9 4l6 2.5 5.5-2.5v13.5L15 20l-6-2.5L3.5 20z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 4v13.5M15 6.5V20" stroke="currentColor" stroke-width="2.2"/>')
  };

  const UI = {};
  UI.ICONS = ICONS;
  UI.icon = (n) => ICONS[n] || '';
  UI.hydrate = function (root) {
    (root || document).querySelectorAll('[data-icon]').forEach((el) => {
      if (!el.dataset.filled) { el.innerHTML = ICONS[el.dataset.icon] || ''; el.dataset.filled = '1'; }
    });
  };
  UI.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  UI.toast = function (msg, kind, ms) {
    const box = document.getElementById('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms || 2200);
  };

  let modalClose = null;
  UI.modal = function (html, opts) {
    opts = opts || {};
    const back = document.getElementById('modal');
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    back.hidden = false;
    UI.hydrate(back);
    const m = back.firstChild;
    modalClose = opts.onClose || null;
    back.onpointerdown = (e) => { if (e.target === back && opts.dismiss !== false) UI.closeModal(); };
    const first = m.querySelector('[autofocus], .btn');
    if (first) setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) { /* */ } }, 30);
    return m;
  };
  UI.closeModal = function () {
    const back = document.getElementById('modal');
    if (back.hidden) return;
    back.hidden = true;
    back.innerHTML = '';
    const cb = modalClose; modalClose = null;
    if (cb) cb();
  };
  UI.modalOpen = () => !document.getElementById('modal').hidden;

  UI.confirm = function (title, text, yes, onYes, danger) {
    const m = UI.modal(
      '<h2>' + UI.esc(title) + '</h2><div class="body"><p>' + UI.esc(text) + '</p></div>' +
      '<div class="actions"><button class="btn btn-steel" data-a="no" type="button">Cancel</button>' +
      '<button class="btn ' + (danger ? 'btn-red' : 'btn-green') + '" data-a="yes" type="button">' + UI.esc(yes || 'OK') + '</button></div>'
    );
    m.querySelector('[data-a=no]').onclick = () => { JJ.Audio.play('click'); UI.closeModal(); };
    m.querySelector('[data-a=yes]').onclick = () => { JJ.Audio.play('click'); UI.closeModal(); onYes(); };
  };

  // draws Rocco's face into a small canvas (for hints and such)
  UI.drawFace = function (canvas, expr) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    const s = canvas.width / 0.9;
    ctx.translate(canvas.width / 2 - s * 0.06, canvas.height / 2 + s * 0.36);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    JJ.Art.draw.seat(ctx, { expr: expr || 'happy', t: 0 });
    ctx.restore();
  };

  JJ.UI = UI;
})((globalThis.JJ = globalThis.JJ || {}));
