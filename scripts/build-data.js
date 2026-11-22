import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const dataDir = path.join(rootDir, "data");
const targetDir = path.join(rootDir, "web", "public", "data");

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const ALLOWED_YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

function validateEpisodeLink(rawLink, epLabel) {
  if (!rawLink) return "";
  if (typeof rawLink !== "string") {
    throw new Error(`[build-data] Invalid link type at episode ${epLabel}`);
  }
  const trimmed = rawLink.trim();
  if (!trimmed) return "";

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`[build-data] Malformed link at episode ${epLabel}: ${trimmed}`);
  }

  if (parsed.protocol !== "https:" || !ALLOWED_YOUTUBE_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `[build-data] Disallowed link origin at episode ${epLabel}: ${trimmed}`
    );
  }
  return parsed.toString();
}

// Read episode_info_full.json and emit minimal runtime payload for frontend
const rawEpisodesPath = path.join(dataDir, "episode_info_full.json");
const rawEpisodes = JSON.parse(fs.readFileSync(rawEpisodesPath, "utf8"));
if (!Array.isArray(rawEpisodes)) {
  throw new Error("[build-data] episode_info_full.json must contain a JSON array");
}

const transformedEpisodes = rawEpisodes.map((ep, idx) => ({
  label_jp: ep.label_jp || "",
  label_vn: ep.label_vn || "",
  title: ep.title || "",
  status: ep.status,
  chap: ep.chap || "",
  volume: ep.volume || "",
  arc: ep.arc || "",
  cast: ep.cast || [],
  clues: ep.clues || {},
  link: validateEpisodeLink(ep.link, ep.label_jp || `#${idx}`),
  plot_level: ep.plot_level ?? null,
  romance_couple: ep.romance_couple ?? null,
}));

const episodesOutputPath = path.join(targetDir, "episodes.json");
fs.writeFileSync(episodesOutputPath, JSON.stringify(transformedEpisodes));
console.log(`[build-data] Written ${transformedEpisodes.length} episodes to ${episodesOutputPath}`);
