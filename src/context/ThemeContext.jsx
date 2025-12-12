import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const themes = {
  light: {
    name: 'Light',
    primary: '#667eea',
    primaryDark: '#764ba2',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
  },
  dark: {
    name: 'Dark',
    primary: '#818cf8',
    primaryDark: '#6366f1',
    background: '#111827',
    surface: '#1f2937',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
  },
  miami: {
    name: 'Miami (Neon)',
    primary: '#ff00ff',
    primaryDark: '#00ffff',
    background: '#0a0a1a',
    surface: '#1a1a2e',
    text: '#ffffff',
    textSecondary: '#ff00ff',
  },
  usa: {
    name: 'USA',
    primary: '#003f87',
    primaryDark: '#bb133e',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#003f87',
    textSecondary: '#6b7280',
  },
  mexico: {
    name: 'Mexico',
    primary: '#006847',
    primaryDark: '#ce1126',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#006847',
    textSecondary: '#6b7280',
  },
  canada: {
    name: 'Canada',
    primary: '#ff0000',
    primaryDark: '#ff0000',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#1f2937',
    textSecondary: '#6b7280',
  },
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
  }, [currentTheme]);

  const applyTheme = (themeName) => {
    const theme = themes[themeName];
    const root = document.documentElement;

    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-dark', theme.primaryDark);
    root.style.setProperty('--background', theme.background);
    root.style.setProperty('--surface', theme.surface);
    root.style.setProperty('--text', theme.text);
    root.style.setProperty('--text-secondary', theme.textSecondary);

    document.body.setAttribute('data-theme', themeName);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
