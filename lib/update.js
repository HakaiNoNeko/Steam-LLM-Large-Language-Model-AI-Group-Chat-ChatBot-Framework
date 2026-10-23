"use strict";
// Looks for a newer GitHub release. Notify-only: it never downloads or replaces anything by itself.

const REPO = "HakaiNoNeko/Steam-LLM-Large-Language-Model-AI-Group-Chat-ChatBot-Framework";

const parse = v => String(v).replace(/^v/i, "").split("-")[0].split(".").map(n => parseInt(n, 10) || 0);

function isNewer(latest, current) {
  const a = parse(latest), b = parse(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

async function checkForUpdate(currentVersion, repo = REPO) {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "steam-llm-chatbot" },
    signal: AbortSignal.timeout(8000)
  });
  if (res.status === 404) return { available: false, latest: currentVersion };
  if (!res.ok) throw new Error("GitHub HTTP " + res.status);
  const rel = await res.json();
  const latest = String(rel.tag_name || "");
  return { available: !!latest && isNewer(latest, currentVersion), latest: latest.replace(/^v/i, ""), url: rel.html_url, notes: String(rel.body || "").slice(0, 600) };
}

module.exports = { checkForUpdate, isNewer, REPO };
