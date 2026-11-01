// Runs before the page renders so the chosen theme applies without a flash.
// Kept as a file because the Content-Security-Policy forbids inline scripts.
(function () {
  var pref = "system";
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") pref = stored;
  } catch (e) {}
  var dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();
