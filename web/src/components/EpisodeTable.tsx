import { useRef } from "preact/hooks";
import type { Episode, ColumnVisibility } from "../lib/types";
import { ARCS } from "../lib/constants";

interface EpisodeTableProps {
  episodes: Episode[];
  columns: ColumnVisibility;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}

function getArcLabel(arcVal: string): string {
  if (!arcVal) return "";
  const found = ARCS.find((a) => a.value.toLowerCase() === arcVal.toLowerCase());
  if (found) return found.label;
  return arcVal
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const CLUE_ORDER = ["pbo", "pfbi", "pnew", "pchar", "ppast", "promance", "pmk", "phh", "pdb"];

function getClueLines(clues?: Record<string, string>): { key: string; text: string }[] {
  if (!clues) return [];
  const entries = Object.entries(clues).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0
  );
  entries.sort(([a], [b]) => {
    const idxA = CLUE_ORDER.indexOf(a);
    const idxB = CLUE_ORDER.indexOf(b);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });
  return entries.map(([key, text]) => ({ key, text: text.trim() }));
}

const PAGE_SIZE = 50;

const ALLOWED_YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

function getSafeYouTubeUrl(rawLink?: string): string | null {
  if (!rawLink) return null;
  const trimmed = rawLink.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" && ALLOWED_YOUTUBE_HOSTS.has(parsed.hostname)) {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function EpisodeTable({
  episodes,
  columns,
  loading = false,
  error = null,
  onRetry,
  currentPage,
  onPageChange,
}: EpisodeTableProps) {
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const handlePageChange = (nextPage: number) => {
    onPageChange(nextPage);
    tableWrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  const totalPages = Math.max(1, Math.ceil(episodes.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedEpisodes = episodes.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      ref={tableWrapperRef}
      class="bg-white rounded-xl shadow-xs border border-[#DEE2E6] overflow-hidden scroll-mt-28 sm:scroll-mt-20"
    >
      {/* Table Container with Horizontal Scroll */}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-[#1B365D] text-white border-b border-[#0F2C59] text-xs font-semibold uppercase tracking-wider select-none">
              {columns.label_jp && (
                <th class="py-3 px-3 text-center w-[75px]">
                  Tập JP
                </th>
              )}

              {columns.label_vn && (
                <th class="py-3 px-3 text-center w-[75px]">
                  Tập VN
                </th>
              )}

              {columns.title && (
                <th class="py-3 px-4 min-w-[240px]">
                  Tên tập phim
                </th>
              )}

              {columns.status && (
                <th class="py-3 px-3 text-center w-[100px]">
                  Phân loại
                </th>
              )}

              {columns.arc && (
                <th class="py-3 px-3 text-center w-[110px]">
                  Arc
                </th>
              )}

              {columns.chap && (
                <th class="py-3 px-3 text-center w-[80px]">
                  Chap
                </th>
              )}

              {columns.volume && (
                <th class="py-3 px-3 text-center w-[80px]">
                  Volume
                </th>
              )}

              {columns.clues && (
                <th class="py-3 px-4 min-w-[260px]">
                  Manh mối
                </th>
              )}
            </tr>
          </thead>

          <tbody class="divide-y divide-[#DEE2E6]">
            {loading ? (
              // Skeleton Loading Rows
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`skeleton-${i}`} class="animate-pulse">
                  {columns.label_jp && (
                    <td class="py-3.5 px-3 text-center">
                      <div class="h-4 bg-gray-200 rounded w-8 mx-auto" />
                    </td>
                  )}
                  {columns.label_vn && (
                    <td class="py-3.5 px-3 text-center">
                      <div class="h-4 bg-gray-200 rounded w-8 mx-auto" />
                    </td>
                  )}
                  {columns.title && (
                    <td class="py-3.5 px-4">
                      <div class="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  )}
                  {columns.status && (
                    <td class="py-3.5 px-3 text-center">
                      <div class="h-5 bg-gray-200 rounded-full w-14 mx-auto" />
                    </td>
                  )}
                  {columns.arc && (
                    <td class="py-3.5 px-3 text-center">
                      <div class="h-4 bg-gray-200 rounded w-16 mx-auto" />
                    </td>
                  )}
                  {columns.chap && (
                    <td class="py-3.5 px-3 text-center">
                      <div class="h-4 bg-gray-200 rounded w-10 mx-auto" />
                    </td>
                  )}
                  {columns.volume && (
                    <td class="py-3.5 px-3 text-center">
                      <div class="h-4 bg-gray-200 rounded w-8 mx-auto" />
                    </td>
                  )}
                  {columns.clues && (
                    <td class="py-3.5 px-4">
                      <div class="h-4 bg-gray-200 rounded w-5/6" />
                    </td>
                  )}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={visibleColumnCount} class="py-12 text-center text-[#6C757D]">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <span class="text-3xl">⚠️</span>
                    <p class="font-medium text-base text-[#C82333]">{error}</p>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        class="px-4 py-1.5 bg-[#1B365D] hover:bg-[#0F2C59] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
                      >
                        Thử lại
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : episodes.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount} class="py-12 text-center text-[#6C757D]">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <span class="text-3xl">🔎</span>
                    <p class="font-medium text-base">Không tìm thấy tập phim nào phù hợp</p>
                    <p class="text-xs text-[#ADB5BD]">Thử thay đổi hoặc đặt lại bộ lọc để xem kết quả khác</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedEpisodes.map((ep, idx) => {
                // Lấy toàn bộ danh sách manh mối theo từng key (ưu tiên theo thứ tự quan trọng)
                const clueLines = getClueLines(ep.clues);
                const safeVideoUrl = getSafeYouTubeUrl(ep.link);

                return (
                  <tr
                    key={`${ep.label_jp}_${ep.label_vn}_${idx}`}
                    class={`transition-colors ${
                      idx % 2 === 0
                        ? "bg-white hover:bg-[#E8EDF3]/40"
                        : "bg-[#F8F9FA] hover:bg-[#E8EDF3]/40"
                    }`}
                  >
                    {/* Cột Tập JP */}
                    {columns.label_jp && (
                      <td class="py-3 px-3 text-center font-semibold text-[#0F2C59]">
                        {ep.label_jp}
                      </td>
                    )}

                    {/* Cột Tập VN */}
                    {columns.label_vn && (
                      <td class="py-3 px-3 text-center text-[#212529]">
                        {ep.label_vn ? ep.label_vn : <span class="text-[#ADB5BD]">—</span>}
                      </td>
                    )}

                    {/* Cột Tên tập */}
                    {columns.title && (
                      <td class="py-3 px-4 text-[#212529]">
                        <div class="flex items-center gap-2">
                          <span class="font-medium">{ep.title}</span>
                          {safeVideoUrl && (
                            <a
                              href={safeVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Xem trên YouTube POPS Anime"
                              aria-label={`Xem tập ${ep.title} trên YouTube`}
                              class="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#C82333]/10 text-[#C82333] hover:bg-[#C82333] hover:text-white transition-colors"
                            >
                              <span class="text-[10px] font-bold">▶</span>
                            </a>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Cột Canon/Filler Badge */}
                    {columns.status && (
                      <td class="py-3 px-3 text-center">
                        {ep.status === "canon" ? (
                          <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#198754]/10 text-[#198754] border border-[#198754]/30">
                            CANON
                          </span>
                        ) : (
                          <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#FD7E14]/10 text-[#FD7E14] border border-[#FD7E14]/30">
                            FILLER
                          </span>
                        )}
                      </td>
                    )}

                    {/* Cột Arc (Đã chuẩn hóa chữ hoa theo đúng tên hiển thị) */}
                    {columns.arc && (
                      <td class="py-3 px-3 text-center text-xs text-[#1B365D]">
                        {ep.arc && (
                          <span class="inline-block px-2 py-0.5 rounded bg-[#E8EDF3] font-semibold text-[#1B365D]">
                            {getArcLabel(ep.arc)}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Cột Chap */}
                    {columns.chap && (
                      <td class="py-3 px-3 text-center text-xs">
                        {ep.chap}
                      </td>
                    )}

                    {/* Cột Volume */}
                    {columns.volume && (
                      <td class="py-3 px-3 text-center text-xs">
                        {ep.volume}
                      </td>
                    )}

                    {/* Cột Manh mối */}
                    {columns.clues && (
                      <td class="py-3 px-4 min-w-[280px] text-xs text-[#212529] whitespace-normal break-words leading-relaxed select-text">
                        {clueLines.length === 1 ? (
                          <span>{clueLines[0].text}</span>
                        ) : clueLines.length > 1 ? (
                          <ul class="space-y-1.5">
                            {clueLines.map((item) => (
                              <li key={item.key} class="flex items-start gap-1.5">
                                <span class="text-[#C82333] font-bold leading-snug">•</span>
                                <span>{item.text}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && !error && episodes.length > 0 && (
        <div class="px-3 sm:px-4 py-3 bg-[#F8F9FA] border-t border-[#DEE2E6] flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-xs text-[#6C757D]">
          <div>
            Trang <strong class="text-[#212529]">{safePage}</strong> / {totalPages}
          </div>

          {/* Pagination Controls */}
          <div class="flex flex-wrap items-center justify-center gap-1 select-none">
            {/* Nút Trước */}
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => handlePageChange(Math.max(1, safePage - 1))}
              class={`px-2.5 py-1 border rounded text-xs transition-colors ${
                safePage <= 1
                  ? "border-[#DEE2E6] bg-white text-[#ADB5BD] cursor-not-allowed"
                  : "border-[#DEE2E6] bg-white text-[#212529] hover:bg-[#E8EDF3] cursor-pointer"
              }`}
            >
              ◄ Trước
            </button>

            {/* Các nút số trang */}
            {getPageNumbers().map((page, pIdx) => {
              if (page === "...") {
                return (
                  <span key={`ellipsis-${pIdx}`} class="px-1 text-[#6C757D]">
                    ...
                  </span>
                );
              }
              const isCurrent = page === safePage;
              return (
                <button
                  key={`page-${page}`}
                  type="button"
                  onClick={() => handlePageChange(Number(page))}
                  class={`px-2.5 py-1 border rounded text-xs font-medium transition-colors cursor-pointer ${
                    isCurrent
                      ? "border-[#1B365D] bg-[#1B365D] text-white font-semibold"
                      : "border-[#DEE2E6] bg-white text-[#212529] hover:bg-[#E8EDF3]"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            {/* Nút Tiếp */}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
              class={`px-2.5 py-1 border rounded text-xs transition-colors ${
                safePage >= totalPages
                  ? "border-[#DEE2E6] bg-white text-[#ADB5BD] cursor-not-allowed"
                  : "border-[#DEE2E6] bg-white text-[#212529] hover:bg-[#E8EDF3] cursor-pointer"
              }`}
            >
              Tiếp ►
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
