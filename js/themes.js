/**
 * Project 1M Quest Tracker - Theme Engine
 * Provides 5 cohesive, high-contrast theme palettes that dynamically update
 * CSS Custom Properties on :root, enabling instant color changes across the entire app.
 */

const THEMES = {
  cream: {
    id: 'cream',
    name: 'Sovereign Path',
    badge: 'Default Elegance',
    description: 'Hutan Zamrud, Emas Kerajaan, dan Kertas Perkamen Hangat',
    preview: {
      bg: '#f4fbf2',
      primary: '#1c3e25',
      secondary: '#fec659'
    },
    vars: {
      '--surface': '#f4fbf2',
      '--surface-bright': '#f4fbf2',
      '--surface-dim': '#d5dcd3',
      '--surface-container-lowest': '#ffffff',
      '--surface-container-low': '#eef6ec',
      '--surface-container': '#e9f0e6',
      '--surface-container-high': '#e3eae1',
      '--surface-container-highest': '#dde5db',
      '--surface-variant': '#dde5db',
      '--on-surface': '#161d18',
      '--on-surface-variant': '#424842',
      '--inverse-surface': '#2b322c',
      '--inverse-on-surface': '#ebf3e9',
      '--primary': '#1c3e25',
      '--primary-container': '#33553a',
      '--on-primary': '#ffffff',
      '--on-primary-container': '#a2c8a6',
      '--primary-fixed': '#c5ecc8',
      '--primary-fixed-dim': '#aad0ad',
      '--on-primary-fixed': '#00210b',
      '--secondary': '#7c5800',
      '--secondary-container': '#fec659',
      '--on-secondary': '#ffffff',
      '--on-secondary-container': '#735200',
      '--secondary-fixed': '#ffdea7',
      '--secondary-fixed-dim': '#f5be52',
      '--on-secondary-fixed': '#271900',
      '--tertiary': '#651f02',
      '--tertiary-container': '#833516',
      '--on-tertiary': '#ffffff',
      '--on-tertiary-container': '#ffa98b',
      '--outline': '#727971',
      '--outline-variant': '#c2c8bf',
      '--error': '#ba1a1a',
      '--error-container': '#ffdad6',
      '--on-error': '#ffffff',
      '--path-solid': '#33553a',
      '--path-dotted': '#c2c8bf',
      '--theme-bar': '#1c3e25'
    }
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight Obsidian',
    badge: 'Sleek Dark Mode',
    description: 'Slate Gelap Misterius dengan Aksen Cyan Neon & Emas Bara',
    preview: {
      bg: '#0f172a',
      primary: '#38bdf8',
      secondary: '#f2c94c'
    },
    vars: {
      '--surface': '#0f172a',
      '--surface-bright': '#1e293b',
      '--surface-dim': '#090d16',
      '--surface-container-lowest': '#090d16',
      '--surface-container-low': '#131d31',
      '--surface-container': '#1e293b',
      '--surface-container-high': '#334155',
      '--surface-container-highest': '#475569',
      '--surface-variant': '#334155',
      '--on-surface': '#f8fafc',
      '--on-surface-variant': '#94a3b8',
      '--inverse-surface': '#f8fafc',
      '--inverse-on-surface': '#0f172a',
      '--primary': '#38bdf8',
      '--primary-container': '#0369a1',
      '--on-primary': '#0f172a',
      '--on-primary-container': '#bae6fd',
      '--primary-fixed': '#38bdf8',
      '--primary-fixed-dim': '#0284c7',
      '--on-primary-fixed': '#0c4a6e',
      '--secondary': '#f2c94c',
      '--secondary-container': '#eab308',
      '--on-secondary': '#422006',
      '--on-secondary-container': '#422006',
      '--secondary-fixed': '#fef08a',
      '--secondary-fixed-dim': '#fde047',
      '--on-secondary-fixed': '#713f12',
      '--tertiary': '#f43f5e',
      '--tertiary-container': '#be123c',
      '--on-tertiary': '#ffffff',
      '--on-tertiary-container': '#ffe4e6',
      '--outline': '#64748b',
      '--outline-variant': '#334155',
      '--error': '#f87171',
      '--error-container': '#7f1d1d',
      '--on-error': '#ffffff',
      '--path-solid': '#38bdf8',
      '--path-dotted': '#475569',
      '--theme-bar': '#0f172a'
    }
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean Mint',
    badge: 'Fresh Marine',
    description: 'Teal Samudra Dalam, Pesisir Mint Segar, dan Biru Langit',
    preview: {
      bg: '#f0fdfa',
      primary: '#0f3d3e',
      secondary: '#0284c7'
    },
    vars: {
      '--surface': '#f0fdfa',
      '--surface-bright': '#f0fdfa',
      '--surface-dim': '#ccfbf1',
      '--surface-container-lowest': '#ffffff',
      '--surface-container-low': '#e6faf6',
      '--surface-container': '#ccfbf1',
      '--surface-container-high': '#99f6e4',
      '--surface-container-highest': '#5eead4',
      '--surface-variant': '#99f6e4',
      '--on-surface': '#134e4a',
      '--on-surface-variant': '#115e59',
      '--inverse-surface': '#134e4a',
      '--inverse-on-surface': '#f0fdfa',
      '--primary': '#0f3d3e',
      '--primary-container': '#115e59',
      '--on-primary': '#ffffff',
      '--on-primary-container': '#99f6e4',
      '--primary-fixed': '#5eead4',
      '--primary-fixed-dim': '#2dd4bf',
      '--on-primary-fixed': '#042f2e',
      '--secondary': '#0284c7',
      '--secondary-container': '#bae6fd',
      '--on-secondary': '#ffffff',
      '--on-secondary-container': '#0369a1',
      '--secondary-fixed': '#bae6fd',
      '--secondary-fixed-dim': '#7dd3fc',
      '--on-secondary-fixed': '#082f49',
      '--tertiary': '#0d9488',
      '--tertiary-container': '#14b8a6',
      '--on-tertiary': '#ffffff',
      '--on-tertiary-container': '#ccfbf1',
      '--outline': '#5eead4',
      '--outline-variant': '#99f6e4',
      '--error': '#e11d48',
      '--error-container': '#ffe4e6',
      '--on-error': '#ffffff',
      '--path-solid': '#0f3d3e',
      '--path-dotted': '#99f6e4',
      '--theme-bar': '#0f3d3e'
    }
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset Ember',
    badge: 'Warm Terracotta',
    description: 'Bara Senja Terakota, Karamel Emas, dan Krem Matahari Terbit',
    preview: {
      bg: '#fff7ed',
      primary: '#7a2e2e',
      secondary: '#c2410c'
    },
    vars: {
      '--surface': '#fff7ed',
      '--surface-bright': '#fff7ed',
      '--surface-dim': '#fed7aa',
      '--surface-container-lowest': '#ffffff',
      '--surface-container-low': '#fff1e0',
      '--surface-container': '#ffedd5',
      '--surface-container-high': '#fed7aa',
      '--surface-container-highest': '#fdba74',
      '--surface-variant': '#fed7aa',
      '--on-surface': '#431407',
      '--on-surface-variant': '#7c2d12',
      '--inverse-surface': '#431407',
      '--inverse-on-surface': '#fff7ed',
      '--primary': '#7a2e2e',
      '--primary-container': '#9a3412',
      '--on-primary': '#ffffff',
      '--on-primary-container': '#ffedd5',
      '--primary-fixed': '#fdba74',
      '--primary-fixed-dim': '#fb923c',
      '--on-primary-fixed': '#431407',
      '--secondary': '#c2410c',
      '--secondary-container': '#ffedd5',
      '--on-secondary': '#ffffff',
      '--on-secondary-container': '#7c2d12',
      '--secondary-fixed': '#ffedd5',
      '--secondary-fixed-dim': '#fed7aa',
      '--on-secondary-fixed': '#431407',
      '--tertiary': '#b45309',
      '--tertiary-container': '#d97706',
      '--on-tertiary': '#ffffff',
      '--on-tertiary-container': '#fef3c7',
      '--outline': '#fb923c',
      '--outline-variant': '#fdba74',
      '--error': '#b91c1c',
      '--error-container': '#fee2e2',
      '--on-error': '#ffffff',
      '--path-solid': '#7a2e2e',
      '--path-dotted': '#fdba74',
      '--theme-bar': '#7a2e2e'
    }
  },

  mono: {
    id: 'mono',
    name: 'Monochrome Cyber',
    badge: 'Futuristic Zinc',
    description: 'Zinc Obsidian Pekat dengan Kobalt Elektrik Presisi Modern',
    preview: {
      bg: '#18181b',
      primary: '#3b82f6',
      secondary: '#60a5fa'
    },
    vars: {
      '--surface': '#18181b',
      '--surface-bright': '#27272a',
      '--surface-dim': '#09090b',
      '--surface-container-lowest': '#09090b',
      '--surface-container-low': '#141416',
      '--surface-container': '#27272a',
      '--surface-container-high': '#3f3f46',
      '--surface-container-highest': '#52525b',
      '--surface-variant': '#3f3f46',
      '--on-surface': '#fafafa',
      '--on-surface-variant': '#a1a1aa',
      '--inverse-surface': '#fafafa',
      '--inverse-on-surface': '#18181b',
      '--primary': '#3b82f6',
      '--primary-container': '#1d4ed8',
      '--on-primary': '#ffffff',
      '--on-primary-container': '#dbeafe',
      '--primary-fixed': '#60a5fa',
      '--primary-fixed-dim': '#3b82f6',
      '--on-primary-fixed': '#1e3a8a',
      '--secondary': '#60a5fa',
      '--secondary-container': '#93c5fd',
      '--on-secondary': '#1e3a8a',
      '--on-secondary-container': '#1e3a8a',
      '--secondary-fixed': '#dbeafe',
      '--secondary-fixed-dim': '#bfdbfe',
      '--on-secondary-fixed': '#172554',
      '--tertiary': '#a855f7',
      '--tertiary-container': '#9333ea',
      '--on-tertiary': '#ffffff',
      '--on-tertiary-container': '#f3e8ff',
      '--outline': '#71717a',
      '--outline-variant': '#3f3f46',
      '--error': '#ef4444',
      '--error-container': '#7f1d1d',
      '--on-error': '#ffffff',
      '--path-solid': '#3b82f6',
      '--path-dotted': '#52525b',
      '--theme-bar': '#18181b'
    }
  }
};

class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('p1m_theme') || 'cream';
    if (!THEMES[this.currentTheme]) {
      this.currentTheme = 'cream';
    }
  }

  init() {
    this.applyTheme(this.currentTheme, false);
  }

  applyTheme(themeKey, persist = true) {
    const theme = THEMES[themeKey] || THEMES.cream;
    this.currentTheme = theme.id;
    const root = document.documentElement;

    // Set all CSS variables directly on root
    Object.entries(theme.vars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });

    // Toggle dark class on root if theme is dark
    if (theme.id === 'midnight' || theme.id === 'mono') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Set meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.vars['--theme-bar'] || theme.vars['--surface']);
    }

    if (persist) {
      localStorage.setItem('p1m_theme', this.currentTheme);
    }

    // Dispatch custom event for canvas/SVG and UI updates
    window.dispatchEvent(new CustomEvent('p1m-theme-changed', {
      detail: { themeKey: this.currentTheme, theme }
    }));
  }

  getCurrentTheme() {
    return THEMES[this.currentTheme];
  }

  getAllThemes() {
    return Object.values(THEMES);
  }
}

window.ThemeEngine = new ThemeManager();
