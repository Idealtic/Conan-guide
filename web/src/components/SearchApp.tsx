import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import type { Episode, FilterState, ColumnVisibility } from "../lib/types";
import { ARCS } from "../lib/constants";
import { filterEpisodes } from "../lib/filterLogic";
import { FilterPanel } from "./FilterPanel";
import { EpisodeTable } from "./EpisodeTable";

const initialFilters: FilterState = {
  episodeSystem: "",
  episodeNumber: "",
  status: "all",
  arc: "",
  plot: [],
  characters: [],
  chap: "",
  volume: "",
};

const defaultColumns: ColumnVisibility = {
  label_jp: true,
  label_vn: true,
  title: true,
  status: true,
  arc: false,
  chap: false,
  volume: false,
  clues: false,
};

export function SearchApp() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [columns, setColumns] = useState<ColumnVisibility>(defaultColumns);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const loadEpisodes = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    fetch("/data/episodes.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể tải dữ liệu tập phim`);
        return res.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu tập phim không đúng định dạng mảng JSON");
        }
        setEpisodes(data as Episode[]);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu tập phim:", err);
        setLoadError("Không thể tải dữ liệu tập phim. Vui lòng kiểm tra kết nối và thử lại.");
        setIsLoading(false);
      });
  }, []);

  // Fetch dữ liệu tập phim từ public/data/episodes.json (được sync từ data/episode_info_full.json)
  useEffect(() => {
    loadEpisodes();
  }, [loadEpisodes]);

  const handleFilterChange = (newFilters: FilterState) => {
    // Chỉ tự động mở cột khi bộ lọc tương ứng chuyển từ chưa bật sang đang bật
    const newColumns = { ...columns };
    if (!filters.arc && newFilters.arc) newColumns.arc = true;
    if (filters.plot.length === 0 && newFilters.plot.length > 0) newColumns.clues = true;
    if (!filters.chap && newFilters.chap) newColumns.chap = true;
    if (!filters.volume && newFilters.volume) newColumns.volume = true;

    const columnsChanged =
      newColumns.arc !== columns.arc ||
      newColumns.clues !== columns.clues ||
      newColumns.chap !== columns.chap ||
      newColumns.volume !== columns.volume;

    setFilters(newFilters);
    setCurrentPage(1);
    if (columnsChanged) {
      setColumns(newColumns);
    }
  };

  const handleReset = () => {
    setFilters(initialFilters);
    setColumns(defaultColumns);
    setCurrentPage(1);
  };

  // Tính toán danh sách kết quả lọc theo filters
  const filteredEpisodes = useMemo(() => {
    return filterEpisodes(episodes, filters);
  }, [episodes, filters]);

  // Thống kê động (1 vòng lặp duy nhất)
  const totalCount = episodes.length;
  const filteredCount = filteredEpisodes.length;
  const { canonCount, fillerCount } = useMemo(() => {
    let canon = 0;
    let filler = 0;
    for (const e of filteredEpisodes) {
      if (e.status === "canon") canon++;
      else if (e.status === "filler") filler++;
    }
    return { canonCount: canon, fillerCount: filler };
  }, [filteredEpisodes]);

  // Thông tin Arc khi được chọn
  const activeArcInfo = ARCS.find((a) => a.value === filters.arc);

  return (
    <div class="space-y-5">
      {/* 1. FILTER PANEL (Card) */}
      <FilterPanel
        filters={filters}
        columns={columns}
        onFilterChange={handleFilterChange}
        onColumnChange={setColumns}
        onReset={handleReset}
      />

      {/* 2 & 3. MÔ TẢ ARC + THANH THỐNG KÊ */}
      <div class="space-y-1.5 px-1">
        {activeArcInfo && (
          <div class="text-sm text-[#495057] leading-relaxed">
            <strong class="font-semibold text-[#1B365D]">Arc {activeArcInfo.label}:</strong>{" "}
            <span>{activeArcInfo.desc}</span>
          </div>
        )}

        <div class="flex items-center text-xs text-[#6C757D] gap-2">
          {isLoading ? (
            <span class="font-semibold text-[#0F2C59] flex items-center gap-1.5">
              <svg class="animate-spin h-3.5 w-3.5 text-[#1B365D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              Đang tải dữ liệu tập phim...
            </span>
          ) : loadError ? (
            <span class="font-semibold text-[#C82333]">
              Lỗi tải dữ liệu tập phim
            </span>
          ) : (
            <>
              <span class="font-semibold text-[#0F2C59]">
                Hiển thị {filteredCount} / {totalCount} tập
              </span>
              <span>&bull;</span>
              <span class="text-[#198754] font-medium">Canon: {canonCount}</span>
              <span>&bull;</span>
              <span class="text-[#FD7E14] font-medium">Filler: {fillerCount}</span>
            </>
          )}
        </div>
      </div>

      {/* 4. EPISODE DATA TABLE */}
      <EpisodeTable
        episodes={filteredEpisodes}
        columns={columns}
        loading={isLoading}
        error={loadError}
        onRetry={loadEpisodes}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
export default SearchApp;
