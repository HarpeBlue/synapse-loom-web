// Populate download buttons from the latest GitHub release of the PUBLIC repo.
// No version is hardcoded: we always reflect the newest release. The GitHub
// REST API is public (no auth) with a 60 req/h per-IP limit — plenty here.

const DIST_REPO = "HarpeBlue/synapse-loom-dist";
const RELEASES_LATEST = `https://github.com/${DIST_REPO}/releases/latest`;

// Map installer filenames to download variants. First match wins per asset.
// Updater artifacts (.app.tar.gz, .sig) and metadata (latest.json) match
// nothing on purpose — they're for the in-app updater, not for people.
// macOS ships two .dmg (one per CPU): keep them apart so an Intel Mac user
// doesn't get an Apple Silicon build that won't launch.
const VARIANTS = [
  { os: "macOS", label: "macOS (Apple Silicon)", test: (n) => /\.dmg$/i.test(n) && /(aarch64|arm64)/i.test(n) },
  { os: "macOS", label: "macOS (Intel)", test: (n) => /\.dmg$/i.test(n) && /(x64|x86_64|intel)/i.test(n) },
  { os: "macOS", label: "macOS", test: (n) => /\.dmg$/i.test(n) },
  { os: "Windows", label: "Windows", test: (n) => /\.exe$/i.test(n) },
  { os: "Windows", label: "Windows (.msi)", test: (n) => /\.msi$/i.test(n) },
  { os: "Linux", label: "Linux (AppImage)", test: (n) => /\.appimage$/i.test(n) },
  { os: "Linux", label: "Linux (.deb)", test: (n) => /\.deb$/i.test(n) },
  { os: "Linux", label: "Linux (.rpm)", test: (n) => /\.rpm$/i.test(n) },
];

// Best guess at the visitor's OS for the primary button. Browsers don't
// expose the CPU reliably, so on macOS we default to Apple Silicon and let
// the "All platforms" list cover Intel.
function detectOS() {
  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || "";
  const ua = navigator.userAgent || "";
  const hay = `${platform} ${ua}`.toLowerCase();
  if (hay.includes("mac")) return "macOS";
  if (hay.includes("win")) return "Windows";
  if (hay.includes("linux") || hay.includes("x11")) return "Linux";
  return null;
}

function setFallback() {
  const meta = document.getElementById("download-meta");
  const btn = document.getElementById("primary-download");
  btn.href = RELEASES_LATEST;
  btn.textContent = "Download";
  meta.textContent = "Choose your installer on the releases page.";
}

async function init() {
  const detected = detectOS();
  try {
    const res = await fetch(`https://api.github.com/repos/${DIST_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const release = await res.json();

    // One asset per variant, in VARIANTS order (order encodes preference).
    const found = [];
    const taken = new Set();
    for (const v of VARIANTS) {
      const asset = (release.assets || []).find((a) => !taken.has(a.name) && v.test(a.name));
      if (asset) {
        taken.add(asset.name);
        found.push({ ...v, asset });
      }
    }
    if (found.length === 0) throw new Error("no installers in latest release");

    const version = release.tag_name || release.name || "";

    // Primary button: first variant matching the detected OS (VARIANTS order
    // already prefers Apple Silicon, .exe over .msi, AppImage over .deb).
    const btn = document.getElementById("primary-download");
    const meta = document.getElementById("download-meta");
    const primary = detected && found.find((v) => v.os === detected);
    if (primary) {
      btn.href = primary.asset.browser_download_url;
      btn.textContent = `Download for ${primary.label}`;
      meta.textContent = version ? `${version} · ${primary.asset.name}` : primary.asset.name;
    } else {
      btn.href = RELEASES_LATEST;
      btn.textContent = "Download";
      meta.textContent = version ? `Latest release ${version}` : "Latest release";
    }

    // "All platforms" list: every variant we found, labeled.
    const list = document.getElementById("all-platforms-list");
    list.innerHTML = "";
    for (const v of found) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = v.asset.browser_download_url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = v.label;
      li.appendChild(a);
      list.appendChild(li);
    }
    document.getElementById("all-platforms").hidden = false;
  } catch (err) {
    // Public repo may not have a published release yet, or we're rate-limited.
    console.warn("Falling back to releases page:", err);
    setFallback();
  }
}

init();
