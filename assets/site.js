// Mobile hamburger nav — shared across every page.
(function () {
  const burger = document.querySelector('.nav-burger');
  const menu   = document.querySelector('.mobile-menu');
  const scrim  = document.querySelector('.menu-scrim');
  if (!burger || !menu || !scrim) return;

  menu.setAttribute('inert', '');

  function closeMenu(returnFocus) {
    if (!menu.classList.contains('open')) return;
    burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open'); scrim.classList.remove('open');
    menu.setAttribute('inert', '');
    document.body.style.overflow = '';
    if (returnFocus) burger.focus();
  }
  function toggleMenu() {
    const isOpen = menu.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    scrim.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) { menu.removeAttribute('inert'); } else { menu.setAttribute('inert', ''); }
  }
  burger.addEventListener('click', toggleMenu);
  scrim.addEventListener('click', () => closeMenu(true));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(true); });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 780) closeMenu(false);
  });
})();

// Back-to-top button — created once, shared across every page.
(function () {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
  document.body.appendChild(btn);

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      btn.classList.toggle('show', window.scrollY > 640);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();

// Copy-to-clipboard button for terminal command blocks (.cb).
(function () {
  const blocks = document.querySelectorAll('.cb');
  if (!blocks.length) return;
  blocks.forEach(block => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cb-copy';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy command');
    block.appendChild(btn);
    btn.addEventListener('click', async () => {
      const clone = block.cloneNode(true);
      const copyBtn = clone.querySelector('.cb-copy');
      if (copyBtn) copyBtn.remove();
      const value = clone.textContent.trim();
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1600);
    });
  });
})();

// Scroll-triggered entrance animation for .reveal elements.
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in-view')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  els.forEach(e => io.observe(e));
})();
