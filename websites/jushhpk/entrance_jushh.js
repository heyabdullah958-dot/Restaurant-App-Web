/**
 * JushhPK — High-Energy Urban Entrance Reveal & Interaction Script
 * Brand: Just Shhh... (JushhPK Lahore)
 */

(function () {
  'use strict';

  function initEntranceReveal() {
    const splash = document.getElementById('jushh-entrance');
    if (!splash) return;

    const hasSeen = sessionStorage.getItem('jushh_entrance_shown');
    const delay = hasSeen ? 120 : 900;

    setTimeout(() => {
      splash.classList.add('dismissed');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 450);
      try {
        sessionStorage.setItem('jushh_entrance_shown', 'true');
      } catch (e) {}
    }, delay);
  }

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

  window.toggleMobileNav = function () {
    const drawer = document.getElementById('jushh-mobile-nav');
    const btn = document.getElementById('jushh-hamburger');
    if (!drawer) return;

    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      drawer.classList.remove('open');
      if (btn) btn.classList.remove('open');
      document.body.style.overflow = '';
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
      setTimeout(() => { splash.style.display = 'none'; }, 400);
    }
  }, 2000);

})();
