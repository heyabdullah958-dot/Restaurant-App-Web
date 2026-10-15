/**
 * Dine At Blue — Luxury Ocean Entrance Reveal & Page Interaction Script
 * Brand: Dine At Blue (Lahore)
 */

(function () {
  'use strict';

  // 1. Entrance Reveal Handler (< 1.2s luxury reveal with immediate session skip)
  function initEntranceReveal() {
    const splash = document.getElementById('blue-entrance');
    if (!splash) return;

    let hasSeen = false;
    try {
      hasSeen = sessionStorage.getItem('blue_entrance_shown') === 'true';
    } catch (e) {}

    if (hasSeen || document.documentElement.classList.contains('entrance-skipped')) {
      splash.classList.add('fade-out');
      splash.style.display = 'none';
      return;
    }

    // First time visitor in this session: Smooth high-end reveal under 1.2s
    setTimeout(() => {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 450);
      try {
        sessionStorage.setItem('blue_entrance_shown', 'true');
      } catch (e) {}
    }, 850);
  }

  // 2. Scroll Progress & Sticky Nav Shadow
  function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    const nav = document.querySelector('.blue-navbar');

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      if (bar) bar.style.width = scrolled + '%';
      if (nav) {
        if (scrollTop > 40) {
          nav.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.8)';
          nav.style.background = 'rgba(5, 10, 24, 0.98)';
        } else {
          nav.style.boxShadow = 'none';
          nav.style.background = 'rgba(5, 10, 24, 0.92)';
        }
      }
    }, { passive: true });
  }

  // 3. Mobile Navigation Drawer
  window.toggleMobileNav = function () {
    const drawer = document.getElementById('blue-mobile-nav');
    const overlay = document.getElementById('blue-mobile-overlay');
    const hamburger = document.getElementById('blue-hamburger');

    if (!drawer) return;
    const isOpen = drawer.classList.contains('open');

    if (isOpen) {
      window.closeMobileNav();
    } else {
      drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
      if (hamburger) hamburger.classList.add('active');
      document.body.classList.add('mobile-nav-open');
    }
  };

  window.closeMobileNav = function () {
    const drawer = document.getElementById('blue-mobile-nav');
    const overlay = document.getElementById('blue-mobile-overlay');
    const hamburger = document.getElementById('blue-hamburger');

    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (hamburger) hamburger.classList.remove('active');
    document.body.classList.remove('mobile-nav-open');
  };

  // Keyboard accessibility
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeMobileNav();
      if (window.CartDrawer && typeof window.CartDrawer.closeDrawer === 'function') {
        window.CartDrawer.closeDrawer();
      }
    }
  });

  // 4. Quick Branch Selector Handler
  window.selectQuickBranch = function (branchName) {
    if (window.CartDrawer && typeof window.CartDrawer.setSelectedBranch === 'function') {
      window.CartDrawer.setSelectedBranch(branchName);
    }
    const mode = (window.CartDrawer && typeof window.CartDrawer.getFulfillmentType === 'function') 
      ? window.CartDrawer.getFulfillmentType() 
      : (localStorage.getItem('foodsphere_fulfillment_mode') || 'DELIVERY');
    window.location.href = `menu.html?branch=${encodeURIComponent(branchName)}&mode=${encodeURIComponent(mode)}`;
  };

  // 5. In-Page KFC Segmented Toggle Sync
  window.setFulfillmentMode = function (mode) {
    if (window.CartDrawer && typeof window.CartDrawer.setFulfillmentType === 'function') {
      window.CartDrawer.setFulfillmentType(mode);
    } else {
      localStorage.setItem('foodsphere_fulfillment_mode', mode);
      document.querySelectorAll('.kfc-toggle-btn').forEach(btn => {
        const m = btn.getAttribute('data-fulfillment-mode');
        if (m === mode) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initEntranceReveal();
      initScrollProgress();
    });
  } else {
    initEntranceReveal();
    initScrollProgress();
  }
})();
