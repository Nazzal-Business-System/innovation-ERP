/** Inline boot script — applies stored appearance + locale before first paint (reduces flash & hydration noise). */
export function ThemeInitScript() {
  const script = `
(function () {
  try {
    var raw = localStorage.getItem("ierp_appearance");
    var parsed = raw ? JSON.parse(raw) : null;
    var s = (parsed && parsed.state) ? parsed.state : {};
    var theme = s.theme || "dark";
    var resolved =
      theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
        : theme;
    var root = document.documentElement;
    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-accent", s.accent || "indigo");
    root.setAttribute("data-density", s.density || "comfortable");
    root.setAttribute("data-radius", s.radius || "medium");
    root.setAttribute("data-calendar-style", s.calendarStyle || "modern");
    var layout = s.detailsPageLayout;
    if (layout !== "workspace" && layout !== "executive" && layout !== "compact" && layout !== "focus") {
      layout = "workspace";
    }
    root.setAttribute("data-details-layout", layout || "workspace");
    var locale = localStorage.getItem("ierp_locale") || "en";
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
    document.cookie = "ierp_locale=" + locale + ";path=/;max-age=31536000;SameSite=Lax";
  } catch (e) {}
})();
`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
