// Extra page behaviour, loaded by site.js on every page. Everything here is local: no network, no storage except a
// sessionStorage flag so the intro plays once per visit, and every animation is skipped under prefers-reduced-motion.
(function () {
  'use strict';

  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hoverCapable = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
  const path = location.pathname.replace(/\/index\.html$/, '/');
  const typing = el => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

  // ── Toast ────────────────────────────────────────────────────────────────────────────────────────────────
  let toastTimer = 0;
  function toast(msg) {
    let t = document.querySelector('.tz-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'tz-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ── Scroll progress: a thin bar along the top that fills green -> gold -> red as you read down ──────────
  (function () {
    const bar = document.createElement('div');
    bar.className = 'tz-shiftbar';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    let ticking = false;
    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      bar.classList.toggle('on', p > 0.002);
      ticking = false;
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  // ── Keyboard: ? opens the cheat sheet; g then a letter jumps between pages ───────────────────────────────
  const PAGES = [
    ['h', 'Home', '/'], ['f', 'Features', '/features'], ['s', 'Setup & downloads', '/setup'],
    ['a', 'About', '/about'], ['l', 'Leaderboard', '/leaderboard'], ['t', 'Files', '/totalfiles'], ['p', 'Privacy', '/privacy'],
  ];
  let sheet = null, sheetOpener = null;
  function closeSheet() {
    if (!sheet) return;
    sheet.remove(); sheet = null;
    if (sheetOpener && sheetOpener.focus) sheetOpener.focus();
  }
  function openSheet() {
    if (sheet) return;
    sheetOpener = document.activeElement;
    sheet = document.createElement('div');
    sheet.className = 'tz-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Keyboard shortcuts');
    const rows = PAGES.map(p => '<li><span><kbd>g</kbd> <kbd>' + p[0] + '</kbd></span>' + p[1] + '</li>').join('');
    sheet.innerHTML = '<div class="tz-sheet-card"><div class="tz-sheet-hd"><span>PIT WALL &middot; SHORTCUTS</span>' +
      '<button type="button" class="tz-x" aria-label="Close">Esc</button></div><ul>' + rows +
      '<li><span><kbd>?</kbd></span>This sheet</li><li><span><kbd>Esc</kbd></span>Close</li></ul></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('.tz-x')) closeSheet(); });
    sheet.querySelector('.tz-x').focus();
  }

  let gArmed = false, gTimer = 0;
  const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kIdx = 0;

  let pit = null;
  function setPitWall(on) {
    if (on === !!pit) return;
    if (!on) { document.documentElement.classList.remove('tz-pitwall'); pit.remove(); pit = null; toast('Pit wall mode off.'); return; }
    document.documentElement.classList.add('tz-pitwall');
    pit = document.createElement('div');
    pit.className = 'tz-pit';
    pit.setAttribute('aria-hidden', 'true');
    pit.innerHTML = '<span class="tz-pit-tag">PIT WALL</span><div class="tz-leds">' + '<i></i>'.repeat(15) + '</div>';
    document.body.appendChild(pit);
    const leds = Array.from(pit.querySelectorAll('i'));
    function paint() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      const lit = Math.round(p * leds.length);
      leds.forEach((l, i) => l.classList.toggle('lit', i < lit));
    }
    pit._paint = paint;
    window.addEventListener('scroll', paint, { passive: true });
    paint();
    if (!reduce) {   // a quick sweep, like a rev counter on start-up
      leds.forEach((l, i) => { l.style.animationDelay = (i * 28) + 'ms'; l.classList.add('sweep'); });
    }
    toast('Pit wall mode. Press Esc to exit.');
  }

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') {
      if (sheet) { closeSheet(); return; }
      if (pit) { setPitWall(false); }
      return;
    }
    if (typing(e.target)) return;

    const want = SEQ[kIdx];
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === want) { kIdx += 1; if (kIdx === SEQ.length) { kIdx = 0; setPitWall(!pit); } }
    else { kIdx = (k === SEQ[0]) ? 1 : 0; }

    if (e.key === '?') { sheet ? closeSheet() : openSheet(); return; }
    if (gArmed) {
      gArmed = false; clearTimeout(gTimer);
      const hit = PAGES.find(p => p[0] === e.key.toLowerCase());
      if (hit) { e.preventDefault(); location.href = hit[2]; }
      return;
    }
    if (e.key === 'g' || e.key === 'G') { gArmed = true; clearTimeout(gTimer); gTimer = setTimeout(() => { gArmed = false; }, 1200); }
  });

  // A quiet hint in the footer, only where a keyboard is likely.
  (function () {
    const foot = document.querySelector('footer');
    if (!foot || !hoverCapable) return;
    const hint = document.createElement('div');
    hint.className = 'tz-hint';
    hint.innerHTML = 'Press <kbd>?</kbd> for keyboard shortcuts';
    foot.appendChild(hint);
  })();

  // ── Console banner ───────────────────────────────────────────────────────────────────────────────────────
  try {
    console.log('%cTRACE', 'font:700 28px/1 "Anton",Impact,sans-serif;color:#c8102e;letter-spacing:.06em');
    console.log('%cGT7 telemetry, made by a driver for drivers. Curious how it works? The source is open: https://github.com/ransh2014/gt7telemtrace', 'color:#96949c;font:12px/1.6 "JetBrains Mono",monospace');
  } catch (e) { /* console unavailable */ }
})();
