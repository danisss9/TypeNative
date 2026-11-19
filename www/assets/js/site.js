// typenative.dev: progressive enhancement only. The page reads fine without it.
(() => {
  'use strict';

  const root = document.documentElement;
  const live = document.querySelector('[data-live]');
  const announce = (message) => {
    if (!live) return;
    live.textContent = '';
    window.setTimeout(() => { live.textContent = message; }, 50);
  };

  // Theme: dark by default, the OS preference next, an explicit choice wins.
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)');
  const currentTheme = () => root.dataset.theme || (prefersLight.matches ? 'light' : 'dark');
  const themeToggle = document.querySelector('[data-theme-toggle]');

  const syncThemeToggle = () => {
    if (!themeToggle) return;
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
    themeToggle.title = `Switch to ${next} theme`;
  };

  themeToggle?.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('tn-theme', next);
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the choice
      // still applies for this page view.
    }
    syncThemeToggle();
  });
  prefersLight.addEventListener('change', syncThemeToggle);
  syncThemeToggle();

  // Copy-to-clipboard buttons.
  const selectText = (element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  document.querySelectorAll('[data-copy]').forEach((button) => {
    let timer = 0;
    button.addEventListener('click', async () => {
      const text = button.dataset.copy ?? '';
      try {
        await navigator.clipboard.writeText(text);
        button.classList.add('is-copied');
        announce('Copied to clipboard');
        window.clearTimeout(timer);
        timer = window.setTimeout(() => button.classList.remove('is-copied'), 1800);
      } catch {
        // No clipboard access: select the command so it can be copied by hand.
        const code = button.parentElement?.querySelector('code');
        if (code) selectText(code);
        announce('Command selected, press Ctrl+C or Cmd+C to copy');
      }
    });
  });

  // Tabs (WAI-ARIA pattern with automatic activation).
  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const select = (tab, focus) => {
      for (const t of tabs) {
        const selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls') ?? '');
        if (panel) panel.hidden = !selected;
      }
      if (focus) tab.focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (event) => {
        const last = tabs.length - 1;
        const target = {
          ArrowRight: index === last ? 0 : index + 1,
          ArrowLeft: index === 0 ? last : index - 1,
          Home: 0,
          End: last,
        }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        select(tabs[target], true);
      });
    });

    select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0], false);
  });

  // Mobile menu.
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  const setMenu = (open) => {
    if (!navToggle) return;
    root.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  navToggle?.addEventListener('click', () => setMenu(!root.classList.contains('nav-open')));
  nav?.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('nav-open')) {
      setMenu(false);
      navToggle?.focus();
    }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });

  // Header border once the page scrolls.
  const onScroll = () => root.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Highlight the nav link of the section in view.
  const links = new Map();
  nav?.querySelectorAll('a[href^="#"]').forEach((link) => {
    const section = document.getElementById(link.getAttribute('href').slice(1));
    if (section) links.set(section, link);
  });

  if (links.size > 0 && 'IntersectionObserver' in window) {
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      const current = Array.from(links.keys()).find((section) => visible.has(section));
      for (const [section, link] of links) {
        const active = section === current;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }, { rootMargin: '-35% 0px -60% 0px' });
    links.forEach((_, section) => observer.observe(section));
  }
})();
