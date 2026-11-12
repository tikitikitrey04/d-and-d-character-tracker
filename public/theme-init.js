// Apply before React and styles load to avoid a flash of the other theme.
(() => {
  let saved;
  try {
    saved = localStorage.getItem("keeper-theme");
  } catch {
    /* Storage may be disabled. */
  }
  const theme =
    saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.documentElement.dataset.theme = theme;
})();
