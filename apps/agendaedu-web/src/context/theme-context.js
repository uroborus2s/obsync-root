import { createContext, useContext, useEffect, useState } from 'react';
const initialState = {
    theme: 'system',
    setTheme: () => null,
};
const ThemeProviderContext = createContext(initialState);
export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'vite-ui-theme', ...props }) {
    const [theme, _setTheme] = useState(() => localStorage.getItem(storageKey) || defaultTheme);
    useEffect(() => {
        const root = window.document.documentElement;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const applyTheme = (theme) => {
            root.classList.remove('light', 'dark'); // Remove existing theme classes
            const systemTheme = mediaQuery.matches ? 'dark' : 'light';
            const effectiveTheme = theme === 'system' ? systemTheme : theme;
            root.classList.add(effectiveTheme); // Add the new theme class
        };
        const handleChange = () => {
            if (theme === 'system') {
                applyTheme('system');
            }
        };
        applyTheme(theme);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);
    const setTheme = (theme) => {
        localStorage.setItem(storageKey, theme);
        _setTheme(theme);
    };
    const value = {
        theme,
        setTheme,
    };
    return (<ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>);
}
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
    const context = useContext(ThemeProviderContext);
    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
//# sourceMappingURL=theme-context.js.map