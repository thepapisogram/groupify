"use client"
import { useState, useEffect } from 'react';

const Theme = () => {
  const prefersDarkMode =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [isDarkMode, setIsDarkMode] = useState(prefersDarkMode);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleMediaChange = (event) => {
      setIsDarkMode(event.matches);
    };

    // Set the initial theme
    if (isDarkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.classList.remove("dark");
    }

    // Add the event listener
    mediaQuery.addEventListener("change", handleMediaChange);

    // Clean up the event listener on unmount
    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [isDarkMode]);

  const handleThemeChange = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <label className="flex justify-center items-center cursor-pointer gap-2 mb-2">
      <svg
        className="stroke-sky-600 fill-sky-600 dark:stroke-green-600 dark:fill-green-600 col-start-1 row-start-1"
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="blue"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
      </svg>
      <input
        type="checkbox"
        value="synthwave"
        checked={isDarkMode}
        onChange={handleThemeChange}
        className="toggle theme-controller bg-sky-600 dark:bg-green-600 col-span-2 col-start-1 row-start-1"
      />
      <svg
        className="stroke-sky-600 fill-sky-600 dark:stroke-green-600 dark:fill-green-600 col-start-2 row-start-1"
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="blue"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </label>
  );
};

export default Theme;