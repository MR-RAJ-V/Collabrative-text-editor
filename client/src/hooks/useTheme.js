import { useEffect, useState } from 'react';

const STORAGE_KEY = 'collabwrite-theme';

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    return window.localStorage.getItem(STORAGE_KEY) || 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((value) => (value === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
};
