// Populate download buttons from the latest GitHub release of the PUBLIC repo.
// No version is hardcoded: we always reflect the newest release. The GitHub
// REST API is public (no auth) with a 60 req/h per-IP limit — plenty here.

const DIST_REPO = "HarpeBlue/synapse-loom-dist";
const RELEASES_LATEST = `https://github.com/${DIST_REPO}/releases/latest`;

// Map a download filename to a human OS label. Order matters: the first match wins.
const OS_MATCHERS = [
  { os: "macOS", test: (n) => /\.dmg$/i.test(n) },
  { os: "macOS", test: (n) => /\.app\.tar\.gz$/i.test(n) },
  { os: "Windows", test: (n) => /\.(exe|msi)$/i.test(n) },
  { os: "Linux", test: (n) => /\.appimage$/i.test(n) },
  { os: "Linux", test: (n) => /\.(deb|rpm)$/i.test(n) },
];

function classify(name) {
  for (const m of OS_MATCHERS) if (m.test(name)) return m.os;
  return null;
}

// Best guess at the visitor's OS for the primary button.
function detectOS() {
  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || "";
  const ua = navigator.userAgent || "";
  const hay = `${platform} ${ua}`.toLowerCase();
  if (hay.includes("mac")) return "macOS";
  if (hay.includes("win")) return "Windows";
  if (hay.includes("linux") || hay.includes("x11")) return "Linux";
  return null;
}

// Prefer the friendliest installer when an OS exposes several.
function pickPreferred(assets) {
  const order = [/\.dmg$/i, /\.exe$/i, /\.msi$/i, /\.appimage$/i, /\.deb$/i, /\.rpm$/i];
  for (const re of order) {
    const hit = assets.find((a) => re.test(a.name));
    if (hit) return hit;
  }
  return assets[0];
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

    const downloads = (release.assets || []).filter((a) => classify(a.name));
    if (downloads.length === 0) throw new Error("no installers in latest release");

    // Group assets by OS.
    const byOS = { Linux: [], Windows: [], macOS: [] };
    for (const a of downloads) byOS[classify(a.name)].push(a);

    const version = release.tag_name || release.name || "";

    // Primary button: the detected OS if we have a build for it, else fall back.
    const btn = document.getElementById("primary-download");
    const meta = document.getElementById("download-meta");
    if (detected && byOS[detected] && byOS[detected].length) {
      const asset = pickPreferred(byOS[detected]);
      btn.href = asset.browser_download_url;
      btn.textContent = `Download for ${detected}`;
      meta.textContent = version ? `${version} · ${asset.name}` : asset.name;
    } else {
      btn.href = RELEASES_LATEST;
      btn.textContent = "Download";
      meta.textContent = version ? `Latest release ${version}` : "Latest release";
    }

    // "All platforms" list: one line per OS, linking the preferred installer.
    const list = document.getElementById("all-platforms-list");
    list.innerHTML = "";
    for (const os of ["Linux", "macOS", "Windows"]) {
      if (!byOS[os].length) continue;
      const asset = pickPreferred(byOS[os]);
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = asset.browser_download_url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = os;
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
