/**
 * JushhPK — High-Energy Urban Entrance Reveal & Interaction Script
 * Brand: Just Shhh... (JushhPK Lahore)
 */

(function () {
  'use strict';

  // 1. Entrance Reveal Handler (< 1.2s luxury reveal with immediate session skip)
  function initEntranceReveal() {
    const splash = document.getElementById('jushh-entrance');
    if (!splash) return;

    let hasSeen = false;
    try {
      hasSeen = sessionStorage.getItem('jushh_entrance_shown') === 'true';
    } catch (e) {}

    if (hasSeen || document.documentElement.classList.contains('entrance-skipped')) {
      splash.classList.add('dismissed');
      splash.style.display = 'none';
      return;
    }

    // First time visitor in this session: Fast high-energy reveal under 1.2s
    setTimeout(() => {
      splash.classList.add('dismissed');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 350);
      try {
        sessionStorage.setItem('jushh_entrance_shown', 'true');
      } catch (e) {}
    }, 800);
  }

  // 2. Scroll Progress & Sticky Nav Shadow
  function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    const nav = document.querySelector('.jushh-nav');

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      if (bar) bar.style.width = scrolled + '%';
      if (nav) {
        if (scrollTop > 40) {
          nav.classList.add('scrolled');
        } else {
          nav.classList.remove('scrolled');
        }
      }
    }, { passive: true });
  }

  // 3. Mobile Navigation Drawer with Outside Click & ESC Key Handling
  window.toggleMobileNav = function () {
    const drawer = document.getElementById('jushh-mobile-nav');
    const btn = document.getElementById('jushh-hamburger');
    if (!drawer) return;

    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      closeMobileNav();
    } else {
      drawer.classList.add('open');
      if (btn) btn.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeMobileNav = function () {
    const drawer = document.getElementById('jushh-mobile-nav');
    const btn = document.getElementById('jushh-hamburger');
    if (drawer) drawer.classList.remove('open');
    if (btn) btn.classList.remove('open');
    document.body.style.overflow = '';
  };

  // 4. Global Keyboard and Window Listeners
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileNav();
      if (typeof window.closeItemModal === 'function') window.closeItemModal();
    }
  });

  document.addEventListener('click', (e) => {
    const drawer = document.getElementById('jushh-mobile-nav');
    const btn = document.getElementById('jushh-hamburger');
    if (drawer && drawer.classList.contains('open') && !drawer.contains(e.target) && btn && !btn.contains(e.target)) {
      closeMobileNav();
    }
  });

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initEntranceReveal();
    initScrollProgress();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      initEntranceReveal();
      initScrollProgress();
    });
  }

  setTimeout(() => {
    const splash = document.getElementById('jushh-entrance');
    if (splash && !splash.classList.contains('dismissed')) {
      splash.classList.add('dismissed');
      setTimeout(() => { splash.style.display = 'none'; }, 300);
    }
  }, 1800);

})();
