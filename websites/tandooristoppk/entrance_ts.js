/**
 * Tandoori Stop — Luxury Entrance Reveal & Page Interaction Script
 * Brand: Tandoori Stop (Lahore)
 */

(function () {
  'use strict';

  // 1. Entrance Reveal Handler (< 1.2s luxury reveal with immediate session skip)
  function initEntranceReveal() {
    const splash = document.getElementById('ts-entrance');
    if (!splash) return;

    let hasSeen = false;
    try {
      hasSeen = sessionStorage.getItem('ts_entrance_shown') === 'true';
    } catch (e) {}

    if (hasSeen || document.documentElement.classList.contains('entrance-skipped')) {
      splash.classList.add('dismissed');
      splash.style.display = 'none';
      return;
    }

    // First time visitor in this session: Smooth high-end reveal under 1.2s
    setTimeout(() => {
      splash.classList.add('dismissed');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 350);
      try {
        sessionStorage.setItem('ts_entrance_shown', 'true');
      } catch (e) {}
    }, 850);
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

  // 3. Mobile Navigation Drawer with Backdrop & Escape Key Handlers
  window.toggleMobileNav = function () {
    const drawer = document.getElementById('ts-mobile-nav');
    const btn = document.getElementById('ts-hamburger');
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

  // 5. Global Keyboard and Window Listeners (ESC key & outside click)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileNav();
      closeTsLightbox();
      if (typeof window.closeItemModal === 'function') window.closeItemModal();
    }
  });

  document.addEventListener('click', (e) => {
    const drawer = document.getElementById('ts-mobile-nav');
    const btn = document.getElementById('ts-hamburger');
    if (drawer && drawer.classList.contains('open') && !drawer.contains(e.target) && btn && !btn.contains(e.target)) {
      closeMobileNav();
    }
  });

  // Execute on DOM Ready or immediately
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
      setTimeout(() => { splash.style.display = 'none'; }, 300);
    }
  }, 1800);

})();
