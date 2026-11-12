import React, { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import "./theme.css";

const ThemeContext = createContext(null);
const valid = (value) => value === "dark" || value === "light";
function storedTheme() {
  try {
    return localStorage.getItem("keeper-theme");
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "light",
  );
  const [explicit, setExplicit] = useState(() => valid(storedTheme()));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#181818" : "#f8f9f5");
  }, [theme]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const systemChanged = () => {
      if (!explicit) setTheme(media.matches ? "dark" : "light");
    };
    const storageChanged = (event) => {
      if (event.key !== "keeper-theme" && event.key !== null) return;
      const preference = storedTheme();
      setExplicit(valid(preference));
      setTheme(
        valid(preference) ? preference : media.matches ? "dark" : "light",
      );
    };
    media.addEventListener("change", systemChanged);
    window.addEventListener("storage", storageChanged);
    return () => {
      media.removeEventListener("change", systemChanged);
      window.removeEventListener("storage", storageChanged);
    };
  }, [explicit]);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setExplicit(true);
    try {
      localStorage.setItem("keeper-theme", next);
    } catch {
      /* In-memory choice still works. */
    }
  }
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      onClick={toggle}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
    </button>
  );
}
