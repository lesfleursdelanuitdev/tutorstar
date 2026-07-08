"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "tutorstar-theme";

/**
 * Light/dark switch. The initial theme is applied pre-paint by the inline
 * script in the root layout; this just keeps it in sync and persists changes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"axolotl-light" | "axolotl-dark">(
    "axolotl-light",
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "axolotl-dark" ? "axolotl-dark" : "axolotl-light");
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "axolotl-dark" ? "axolotl-light" : "axolotl-dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures (private mode etc.).
    }
  }

  const isDark = theme === "axolotl-dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`btn btn-ghost btn-circle ${className ?? ""}`}
    >
      {mounted && isDark ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </button>
  );
}
