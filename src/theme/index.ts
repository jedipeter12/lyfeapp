import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  type Theme as NavigationTheme,
} from "expo-router/react-navigation";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
export const radius = { sm: 8, md: 12, lg: 20 } as const;

export const colors = {
  light: {
    background: "#F7F9F9",
    surface: "#FFFFFF",
    text: "#17252A",
    muted: "#425A61",
    primary: "#075E59",
    onPrimary: "#FFFFFF",
    border: "#718A90",
    error: "#A42232",
    focus: "#075E59",
  },
  dark: {
    background: "#0D191D",
    surface: "#182A2F",
    text: "#F5F8F8",
    muted: "#C6D5D8",
    primary: "#83E0D2",
    onPrimary: "#073B37",
    border: "#8EA7AD",
    error: "#FFADB4",
    focus: "#83E0D2",
  },
} as const;

export type AppColors = (typeof colors)[keyof typeof colors];

export function useAppTheme(): {
  scheme: "light" | "dark";
  colors: AppColors;
} {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { scheme, colors: colors[scheme] };
}

export function navigationTheme(scheme: "light" | "dark"): NavigationTheme {
  const palette = colors[scheme];
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.error,
    },
  };
}
