"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeColors = {
  bgPrimary: string;
  bgSecondary: string;
  bgChat: string;
  bgTertiary: string;
  bubbleOut: string;
  bubbleIn: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  inputBg: string;
  searchBg: string;
  activeBg: string;
  hoverBg: string;
  tooltipBg: string;
};

const LIGHT: ThemeColors = {
  bgPrimary: "#ffffff",
  bgSecondary: "#f0f2f5",
  bgChat: "#efeae2",
  bgTertiary: "#e9edef",
  bubbleOut: "#d9fdd3",
  bubbleIn: "#ffffff",
  textPrimary: "#111b21",
  textSecondary: "#667781",
  border: "rgba(0,0,0,0.1)",
  inputBg: "#ffffff",
  searchBg: "#f0f2f5",
  activeBg: "#f0f2f5",
  hoverBg: "#f5f6f6",
  tooltipBg: "#111b21",
};

const DARK: ThemeColors = {
  bgPrimary: "#111b21",
  bgSecondary: "#202c33",
  bgChat: "#0b141a",
  bgTertiary: "#2a3942",
  bubbleOut: "#005c4b",
  bubbleIn: "#202c33",
  textPrimary: "#e9edef",
  textSecondary: "#8696a0",
  border: "rgba(255,255,255,0.08)",
  inputBg: "#2a3942",
  searchBg: "#2a3942",
  activeBg: "#2a3942",
  hoverBg: "#2a3942",
  tooltipBg: "#182229",
};

type ThemeContextValue = {
  dark: boolean;
  toggle: () => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue>({
  dark: false,
  toggle: () => {},
  colors: LIGHT,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  // Expuesto como atributo del documento para lo poco que React no puede
  // themar con `style` inline: la barra de scroll nativa (ver globals.css).
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <ThemeContext.Provider
      value={{ dark, toggle: () => setDark((d) => !d), colors: dark ? DARK : LIGHT }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
