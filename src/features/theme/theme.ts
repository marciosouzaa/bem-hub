export const THEME_COOKIE = "bem-hub-theme";

export const themes = ["dark", "light"] as const;

export type AppTheme = (typeof themes)[number];

export function normalizeTheme(value: string | undefined): AppTheme {
  return value === "light" ? "light" : "dark";
}
