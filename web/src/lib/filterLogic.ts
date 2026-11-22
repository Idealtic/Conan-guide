import type { Episode, FilterState } from "./types";

function normalizeFilterQuery(raw: string): string {
  return raw
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ")")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

const R133_ALIASES = new Set(["R", "R133", "R133 (1076.5)"]);

function splitSpinOffPrefix(str: string): { prefix: "SV" | "WPS" | ""; body: string } {
  const trimmed = str.trim();
  const m = trimmed.match(/^(WPS|SV)(?=$|\s|\d|-)/i);
  if (!m) {
    return { prefix: "", body: trimmed };
  }
  return {
    prefix: m[1].toUpperCase() as "SV" | "WPS",
    body: trimmed.slice(m[1].length).trim(),
  };
}

/**
 * Trích xuất khoảng số [min, max] từ chuỗi chap hoặc volume của tập phim.
 * Chuẩn hóa min <= max phòng trường hợp dữ liệu đầu vào bị ngược.
 */
function parseRange(str: string): { min: number; max: number } | null {
  if (!str) return null;
  const matches = str.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches.map(Number);
  if (nums.length === 1) {
    return { min: nums[0], max: nums[0] };
  }
  return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
}

/**
 * Kiểm tra cú pháp input hợp lệ cho các ô Số tập, Chap, Volume.
 * Từ chối khoảng ngược (VD "5-2"), nhiều dấu gạch ("--", "1-2-3"), hoặc chuỗi chữ rác ("abc").
 */
export function isValidFilterInput(
  kind: "episode" | "chap" | "volume",
  raw: string
): boolean {
  const q = normalizeFilterQuery(raw);
  if (!q) return true;

  if (kind === "episode") {
    // Xử lý riêng cho R133 (1076.5) và các mã tập đặc biệt hợp lệ (P1, SP)
    if (R133_ALIASES.has(q) || /^P\d+$/.test(q) || q === "SP") {
      return true;
    }
    if (/^\d+(?:\.\d+)?$/.test(q) || /^\d+(?:\.\d+)?-$/.test(q) || /^-\d+(?:\.\d+)?$/.test(q)) {
      return true;
    }
    const rangeMatch = q.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
      return parseFloat(rangeMatch[1]) <= parseFloat(rangeMatch[2]);
    }
    return false;
  }

  const { prefix, body } = splitSpinOffPrefix(q);
  if (prefix && !body) {
    return true;
  }
  if (/^\d+$/.test(body) || /^\d+-$/.test(body) || /^-\d+$/.test(body)) {
    return true;
  }
  const rangeMatch = body.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    return parseInt(rangeMatch[1], 10) <= parseInt(rangeMatch[2], 10);
  }
  return false;
}

function matchRangeBody(targetBody: string, qBody: string): boolean {
  const epRange = parseRange(targetBody);
  if (!epRange) return false;

  if (/^\d+-$/.test(qBody)) {
    const minVal = parseInt(qBody.slice(0, -1), 10);
    return epRange.max >= minVal;
  }

  if (/^-\d+$/.test(qBody)) {
    const maxVal = parseInt(qBody.slice(1), 10);
    return epRange.min <= maxVal;
  }

  const rangeMatch = qBody.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const qMin = parseInt(rangeMatch[1], 10);
    const qMax = parseInt(rangeMatch[2], 10);
    if (qMin > qMax) return false;
    return epRange.min <= qMax && epRange.max >= qMin;
  }

  if (/^\d+$/.test(qBody)) {
    const num = parseInt(qBody, 10);
    return epRange.min <= num && num <= epRange.max;
  }

  return false;
}

/**
 * Lọc Chap hoặc Volume, tách biệt manga chính truyện với phụ truyện SV / WPS.
 */
export function matchChapOrVolumeField(
  targetVal: string,
  epVolume: string,
  query: string
): boolean {
  if (!query || !query.trim()) return true;
  if (!targetVal) return false;

  const epPrefix = splitSpinOffPrefix(epVolume || "").prefix;
  const { prefix: qPrefix, body: qBody } = splitSpinOffPrefix(normalizeFilterQuery(query));

  // Không trộn lẫn tập chính truyện với tập SV / WPS
  if (epPrefix !== qPrefix) return false;
  if (qPrefix && !bodyIsPresent(qBody)) return true;

  const targetBody = splitSpinOffPrefix(targetVal).body;
  return matchRangeBody(targetBody, qBody);
}

function bodyIsPresent(body: string): boolean {
  return body.length > 0;
}

/**
 * Lọc số tập phim theo hệ tập (JP/VN):
 * - Xử lý riêng cho R133 (1076.5): khớp "R", "R133", "R133(1076.5)", "R133 (1076.5)", "1076.5"
 * - Hỗ trợ mã tập đặc biệt ("P1", "SP"), số đơn và khoảng ("1", "10-20", "10 - 20", "10-", "-50")
 * - Không kéo nhầm P1/SP vào khoảng số thuần, không để range ngược trả kết quả sai
 */
export function matchEpisodeNumber(
  ep: Episode,
  system: "vn" | "jp" | "",
  query: string
): boolean {
  if (!system || !query || !query.trim()) return true;
  const field = (system === "vn" ? ep.label_vn : ep.label_jp) || "";
  if (!field) return false;

  const q = normalizeFilterQuery(query);
  const f = normalizeFilterQuery(field);

  if (f === q) return true;

  let epNum: number | null = null;
  if (f === "R133 (1076.5)") {
    if (R133_ALIASES.has(q)) return true;
    epNum = 1076.5;
  } else {
    const parenMatch = f.match(/^([A-Z]+\d+)\s*\((\d+(?:\.\d+)?)\)$/);
    if (parenMatch) {
      if (parenMatch[1] === q) return true;
      epNum = parseFloat(parenMatch[2]);
    } else if (/^\d+(?:\.\d+)?$/.test(f)) {
      epNum = parseFloat(f);
    }
  }

  if (epNum === null) return false;

  if (/^\d+(?:\.\d+)?-$/.test(q)) {
    const min = parseFloat(q.slice(0, -1));
    return epNum >= min;
  }

  if (/^-\d+(?:\.\d+)?$/.test(q)) {
    const max = parseFloat(q.slice(1));
    return epNum <= max;
  }

  const rangeMatch = q.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (min > max) return false;
    return epNum >= min && epNum <= max;
  }

  if (/^\d+(?:\.\d+)?$/.test(q)) {
    return epNum === parseFloat(q);
  }

  return false;
}

export function matchStatus(ep: Episode, status: "all" | "canon" | "filler"): boolean {
  if (status === "all") return true;
  return ep.status === status;
}

export function matchArc(ep: Episode, arc: string): boolean {
  if (!arc) return true;
  return (ep.arc || "").toLowerCase() === arc.toLowerCase();
}

export function matchPlot(ep: Episode, plotFilters: string[]): boolean {
  if (!plotFilters || plotFilters.length === 0) return true;
  const filter = plotFilters[0];
  if (!filter) return true;

  if (filter === "main_plot") {
    return ep.plot_level === 1 || ep.plot_level === 2;
  }

  if (filter === "bo_appearance") {
    return ep.plot_level === 2;
  }

  if (filter === "romance_all") {
    return ep.romance_couple != null && ep.romance_couple !== "";
  }

  if (filter.startsWith("romance_")) {
    const coupleKey = filter.replace("romance_", "");
    if (!ep.romance_couple) return false;
    if (Array.isArray(ep.romance_couple)) {
      return ep.romance_couple.includes(coupleKey);
    }
    return ep.romance_couple === coupleKey;
  }

  return true;
}

export function matchCharacters(ep: Episode, characters: string[]): boolean {
  if (characters.length === 0) return true;

  return characters.every((char) => {
    if (char === "Đội thám tử nhí") {
      return Boolean(ep.clues && "pdb" in ep.clues);
    }
    if (!ep.cast || ep.cast.length === 0) return false;
    return ep.cast.some((castMember) => castMember.toLowerCase() === char.toLowerCase());
  });
}

export function filterEpisodes(episodes: Episode[], filters: FilterState): Episode[] {
  return episodes.filter(
    (ep) =>
      matchEpisodeNumber(ep, filters.episodeSystem, filters.episodeNumber) &&
      matchStatus(ep, filters.status) &&
      matchArc(ep, filters.arc) &&
      matchPlot(ep, filters.plot) &&
      matchCharacters(ep, filters.characters) &&
      matchChapOrVolumeField(ep.chap, ep.volume, filters.chap) &&
      matchChapOrVolumeField(ep.volume, ep.volume, filters.volume)
  );
}
