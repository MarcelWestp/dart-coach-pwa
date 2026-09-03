import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProviderCustom: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as ThemeMode) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#5156B0',
            dark: '#2B2961',
            light: '#6B70C8',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#B8524D',
            light: '#C96863',
            dark: '#933B37',
            contrastText: '#ffffff',
          },
          info: {
            main: '#00A8E8',
          },
          warning: {
            main: '#FF9F1C',
          },
          background: {
            default: mode === 'dark' ? '#121420' : '#F4F6F8',
            paper: mode === 'dark' ? '#1B1E2E' : '#FFFFFF',
          },
          text: {
            primary: mode === 'dark' ? '#F1F5F9' : '#1E293B',
            secondary: mode === 'dark' ? '#A1A1A1' : '#64748B',
          },
        },
        shape: {
          borderRadius: 12,
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setThemeMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext muss innerhalb von ThemeProviderCustom verwendet werden.');
  }
  return context;
};