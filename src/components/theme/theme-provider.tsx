"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  normalizeTheme,
  THEME_COOKIE,
  type AppTheme,
} from "@/features/theme/theme";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: AppTheme;
}) {
  const [theme, setThemeState] = useState<AppTheme>(initialTheme);

  const applyTheme = useCallback((nextTheme: AppTheme) => {
    document.documentElement.dataset.theme = nextTheme;
    document.cookie = `${THEME_COOKIE}=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
    setThemeState(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = normalizeTheme(initialTheme);
  }, [initialTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: applyTheme,
      toggleTheme: () => applyTheme(theme === "dark" ? "light" : "dark"),
    }),
    [applyTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
  }

  return context;
}
