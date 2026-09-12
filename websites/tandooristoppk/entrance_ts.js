/**
 * Tandoori Stop — Luxury Entrance Reveal & Page Interaction Script
 * Brand: Tandoori Stop (Lahore)
 */

(function () {
  'use strict';

  // 1. Entrance Reveal Handler
  function initEntranceReveal() {
    const splash = document.getElementById('ts-entrance');
    if (!splash) return;

    const hasSeen = sessionStorage.getItem('ts_entrance_shown');
    const delay = hasSeen ? 150 : 950;

    setTimeout(() => {
      splash.classList.add('dismissed');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 500);
      try {
        sessionStorage.setItem('ts_entrance_shown', 'true');
      } catch (e) {}
    }, delay);
  }

  // 2. Scroll Progress & Sticky Nav Shadow
  function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    const nav = document.querySelector('.ts-nav');

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

  // 3. Mobile Navigation Drawer
  window.toggleMobileNav = function () {
    const drawer = document.getElementById('ts-mobile-nav');
    const btn = document.getElementById('ts-hamburger');
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
    const drawer = document.getElementById('ts-mobile-nav');
    const btn = document.getElementById('ts-hamburger');
    if (drawer) drawer.classList.remove('open');
    if (btn) btn.classList.remove('open');
    document.body.style.overflow = '';
  };

  // 4. Lightbox Quick View
  window.openTsLightbox = function (imgUrl, title, desc) {
    const modal = document.getElementById('ts-lightbox');
    const img = document.getElementById('ts-lightbox-img');
    const titleEl = document.getElementById('ts-lightbox-title');
    const descEl = document.getElementById('ts-lightbox-desc');

    if (img) img.src = imgUrl || '';
    if (titleEl) titleEl.textContent = title || 'Tandoori Specialty';
    if (descEl) descEl.textContent = desc || 'Freshly prepared in our authentic clay tandoor.';

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeTsLightbox = function () {
    const modal = document.getElementById('ts-lightbox');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // Execute on DOM Ready
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initEntranceReveal();
    initScrollProgress();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      initEntranceReveal();
      initScrollProgress();
    });
  }

  // Fail-safe dismissal in case of slow asset loading
  setTimeout(() => {
    const splash = document.getElementById('ts-entrance');
    if (splash && !splash.classList.contains('dismissed')) {
      splash.classList.add('dismissed');
      setTimeout(() => { splash.style.display = 'none'; }, 400);
    }
  }, 2200);

})();
