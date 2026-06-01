import { useEffect, useState } from 'react';

const DEFAULT_THEME = 'default';

const applyTheme = (themeName) => {
  const safeTheme = themeName || DEFAULT_THEME;
  document.body.dataset.theme = safeTheme;
};

const getThemeFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('theme');
};

const useExtensionTheme = () => {
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    // 1. Initial local state (URL -> LocalStorage -> Default)
    const urlTheme = getThemeFromUrl();
    const initialTheme = urlTheme || localStorage.getItem('swm-theme') || DEFAULT_THEME;
    applyTheme(initialTheme);
    setActiveTheme(initialTheme);
    if (!urlTheme) {
      localStorage.setItem('swm-theme', initialTheme);
    }

    // 2. Listen for theme updates from the Sync Bridge
    const handleThemeResponse = (e) => {
      const theme = e.detail || DEFAULT_THEME;
      applyTheme(theme);
      setActiveTheme(theme);
      localStorage.setItem('swm-theme', theme);
    };

    // 3. Trigger initial request when bridge is ready
    const handleBridgeReady = () => {
      window.dispatchEvent(new CustomEvent('REQUEST_THEME'));
    };

    window.addEventListener('THEME_RESPONSE', handleThemeResponse);
    window.addEventListener('EXTENSION_BRIDGE_READY', handleBridgeReady);

    // Call it immediately just in case the bridge fired before this mounted
    handleBridgeReady();

    return () => {
      window.removeEventListener('THEME_RESPONSE', handleThemeResponse);
      window.removeEventListener('EXTENSION_BRIDGE_READY', handleBridgeReady);
    };
  }, []);

  const setExtensionTheme = (themeName) => {
    // Optimistic UI update
    applyTheme(themeName);
    setActiveTheme(themeName);
    localStorage.setItem('swm-theme', themeName);
    // Send to extension
    window.dispatchEvent(new CustomEvent('UPDATE_EXTENSION_THEME', { detail: themeName }));
  };

  return { activeTheme, setExtensionTheme };
};

export default useExtensionTheme;
