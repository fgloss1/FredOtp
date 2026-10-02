"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("nava-theme");
    setDarkMode(savedTheme !== "light");
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    const newThemeStr = newDarkMode ? "dark" : "light";
    localStorage.setItem("nava-theme", newThemeStr);

    // Update document background instantly to prevent flashing
    if (typeof document !== "undefined") {
      const bg = newDarkMode ? "#070b14" : "#f1f5f9";
      document.documentElement.style.backgroundColor = bg;
      document.body.style.backgroundColor = bg;
    }

    window.dispatchEvent(new Event("nava-theme-change"));
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-xs transition-all cursor-pointer shadow-sm flex items-center justify-center"
      aria-label="Toggle dark/light mode"
    >
      <span>{darkMode ? "🌙" : "☀️"}</span>
    </button>
  );
}