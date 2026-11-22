import { useState, useRef, useEffect } from "preact/hooks";
import type { FilterState, ColumnVisibility } from "../lib/types";
import { ARCS } from "../lib/constants";
import { CHARACTERS_DATA } from "../lib/charactersData";
import { isValidFilterInput } from "../lib/filterLogic";
import { ColumnToggle } from "./ColumnToggle";

interface FilterPanelProps {
  filters: FilterState;
  columns: ColumnVisibility;
  onFilterChange: (filters: FilterState) => void;
  onColumnChange: (columns: ColumnVisibility) => void;
  onReset: () => void;
}

function normalizeSearchText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/['’]/g, "")
    .toLowerCase();
}

function sanitizeFilterDraft(inputEl: HTMLInputElement, pattern: RegExp): string {
  // Chuẩn hóa en-dash / em-dash thành dấu gạch ngang ASCII rồi lọc ký tự rác
  const cleaned = inputEl.value.replace(/[–—]/g, "-").replace(pattern, "");
  // Ép cập nhật DOM value trực tiếp để tránh bug Preact bail-out khi state trùng giá trị cũ
  if (inputEl.value !== cleaned) {
    inputEl.value = cleaned;
  }
  return cleaned;
}

export function FilterPanel({
  filters,
  columns,
  onFilterChange,
  onColumnChange,
  onReset,
}: FilterPanelProps) {
  const [charSearch, setCharSearch] = useState("");
  const [isCharDropdownOpen, setIsCharDropdownOpen] = useState(false);

  // Local draft states cho các input cần bấm nút riêng để lọc
  const [localEpNumber, setLocalEpNumber] = useState(filters.episodeNumber);
  const [localChap, setLocalChap] = useState(filters.chap);
  const [localVolume, setLocalVolume] = useState(filters.volume);

  // Lỗi cú pháp inline cho Tập / Chap / Volume
  const [epError, setEpError] = useState<string | null>(null);
  const [chapError, setChapError] = useState<string | null>(null);
  const [volError, setVolError] = useState<string | null>(null);

  const charBoxRef = useRef<HTMLDivElement>(null);

  // Đồng bộ draft states khi filter bên ngoài thay đổi (ví dụ: Reset)
  useEffect(() => {
    setLocalEpNumber(filters.episodeNumber);
  }, [filters.episodeNumber]);

  useEffect(() => {
    setLocalChap(filters.chap);
  }, [filters.chap]);

  useEffect(() => {
    setLocalVolume(filters.volume);
  }, [filters.volume]);

  // Close character dropdown when clicking outside and clear stale unselected draft
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (charBoxRef.current && !charBoxRef.current.contains(e.target as Node)) {
        setIsCharDropdownOpen(false);
        if (filters.characters.length === 0) {
          setCharSearch("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filters.characters.length]);

  const isFiller = filters.status === "filler";

  const handleSystemChange = (system: "vn" | "jp" | "") => {
    setEpError(null);
    // Không tự động áp dụng nháp chưa bấm "Đi tới" và đồng bộ lại ô nhập khớp với bộ lọc đang áp dụng
    const newEpNum = system === "" ? "" : filters.episodeNumber;
    setLocalEpNumber(newEpNum);
    onFilterChange({
      ...filters,
      episodeSystem: system,
      episodeNumber: newEpNum,
    });
  };

  const handleStatusChange = (status: "all" | "canon" | "filler") => {
    if (status === "filler") {
      setLocalChap("");
      setLocalVolume("");
      setChapError(null);
      setVolError(null);
      onFilterChange({
        ...filters,
        status,
        arc: "",
        plot: [],
        chap: "",
        volume: "",
      });
    } else {
      onFilterChange({
        ...filters,
        status,
      });
    }
  };

  // Áp dụng lọc Số tập phim khi bấm "Đi tới" hoặc Enter
  const applyEpNumber = () => {
    const trimmed = localEpNumber.trim();
    if (!isValidFilterInput("episode", trimmed)) {
      setEpError("Cú pháp không hợp lệ (VD: 1, 10-20, 10-, -20, R133)");
      return;
    }
    setEpError(null);
    onFilterChange({
      ...filters,
      episodeNumber: trimmed,
    });
  };

  // Áp dụng lọc Chap khi bấm "Lọc" hoặc Enter
  const applyChap = () => {
    const trimmed = localChap.trim();
    if (!isValidFilterInput("chap", trimmed)) {
      setChapError("Cú pháp không hợp lệ (VD: 1, 1-3, 10-, -5, WPS 1)");
      return;
    }
    setChapError(null);
    onFilterChange({
      ...filters,
      chap: trimmed,
    });
  };

  // Áp dụng lọc Volume khi bấm "Lọc" hoặc Enter
  const applyVolume = () => {
    const trimmed = localVolume.trim();
    if (!isValidFilterInput("volume", trimmed)) {
      setVolError("Cú pháp không hợp lệ (VD: 1, 1-2, 10-, -5, SV 1, WPS 1)");
      return;
    }
    setVolError(null);
    onFilterChange({
      ...filters,
      volume: trimmed,
    });
  };

  const selectCharacter = (charNameVn: string) => {
    onFilterChange({
      ...filters,
      characters: [charNameVn],
    });
    setCharSearch(charNameVn);
    setIsCharDropdownOpen(false);
  };

  const removeCharacter = () => {
    onFilterChange({
      ...filters,
      characters: [],
    });
    setCharSearch("");
    setIsCharDropdownOpen(false);
  };

  useEffect(() => {
    if (filters.characters.length === 0) {
      if (!isCharDropdownOpen) {
        setCharSearch("");
      }
    } else if (filters.characters[0] !== charSearch) {
      setCharSearch(filters.characters[0]);
    }
  }, [filters.characters]);

  // Chỉ lọc danh sách gợi ý khi dropdown đang mở và có từ khóa tìm kiếm (hỗ trợ không dấu & lược bỏ dấu nháy)
  const rawQuery = charSearch.trim();
  const normalizedQuery = normalizeSearchText(rawQuery);
  const matchedCharacters =
    !isCharDropdownOpen || normalizedQuery.length === 0
      ? []
      : CHARACTERS_DATA.filter((c) => {
          if (filters.characters.includes(c.name_vn)) return false;
          const matchName = normalizeSearchText(c.name_vn).includes(normalizedQuery);
          const matchAlias =
            c.aliases &&
            c.aliases.some((a) => normalizeSearchText(a).includes(normalizedQuery));
          return matchName || matchAlias;
        });

  return (
    <div class="bg-white rounded-xl shadow-xs border border-[#DEE2E6] p-3.5 sm:p-5 space-y-4">
      {/* ================= DÒNG 1: LỌC THEO TẬP ================= */}
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        <label class="md:col-span-2 md:pt-1.5 text-xs font-semibold text-[#1B365D] uppercase tracking-wider">
          Số tập phim
        </label>
        <div class="md:col-span-10 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          {/* Dropdown chọn hệ tập */}
          <select
            value={filters.episodeSystem}
            onChange={(e) =>
              handleSystemChange((e.target as HTMLSelectElement).value as "vn" | "jp" | "")
            }
            class="w-full bg-[#F8F9FA] border border-[#DEE2E6] rounded-md px-3 py-1.5 text-xs text-[#212529] focus:outline-none focus:ring-1 focus:ring-[#1B365D]"
          >
            <option value="">Chọn hệ tập (Nhật Bản / Việt Nam)</option>
            <option value="jp">Theo tập Nhật Bản</option>
            <option value="vn">Theo tập Việt Nam</option>
          </select>

          {/* Input nhập số tập + Nút Đi tới */}
          <div>
            <div class="flex items-center gap-1.5">
              <div class="relative flex-1 min-w-0">
                <input
                  type="text"
                  disabled={!filters.episodeSystem}
                  value={localEpNumber}
                  onInput={(e) => {
                    const val = sanitizeFilterDraft(
                      e.target as HTMLInputElement,
                      /[^0-9a-zA-Z(). -]/g
                    );
                    setLocalEpNumber(val);
                    if (epError) setEpError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyEpNumber();
                    }
                  }}
                  placeholder={
                    filters.episodeSystem
                      ? `Nhập số tập ${filters.episodeSystem.toUpperCase()} (VD: 1, 10-20, R133)...`
                      : "Vui lòng chọn hệ tập"
                  }
                  class={`w-full border rounded-md pl-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1B365D] ${
                    !filters.episodeSystem
                      ? "bg-gray-100 border-[#DEE2E6]/60 text-[#ADB5BD] cursor-not-allowed"
                      : epError
                        ? "bg-white border-[#C82333] text-[#212529]"
                        : "bg-white border-[#DEE2E6] text-[#212529]"
                  }`}
                />
                {localEpNumber && filters.episodeSystem && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalEpNumber("");
                      setEpError(null);
                      onFilterChange({ ...filters, episodeNumber: "" });
                    }}
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#6C757D] hover:text-[#C82333]"
                    title="Xóa số tập"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={!filters.episodeSystem}
                onClick={applyEpNumber}
                class={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors shadow-2xs ${
                  filters.episodeSystem
                    ? "bg-[#1B365D] hover:bg-[#0F2C59] text-white cursor-pointer"
                    : "bg-gray-200 text-[#ADB5BD] cursor-not-allowed"
                }`}
              >
                Đi tới
              </button>
            </div>
            {epError && (
              <p class="mt-1 text-[11px] text-[#C82333]">{epError}</p>
            )}
          </div>
        </div>
      </div>

      {/* ================= DÒNG 2: NHÂN VẬT ================= */}
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <label class="md:col-span-2 text-xs font-semibold text-[#1B365D] uppercase tracking-wider">
          Nhân vật
        </label>
        <div class="md:col-span-10">
          {/* Input Search không có biểu tượng kính lúp, không hiện gợi ý khi chưa gõ */}
          <div class="relative" ref={charBoxRef}>
            <div class="flex items-center border border-[#DEE2E6] rounded-md bg-[#F8F9FA] px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#1B365D] focus-within:bg-white">
              <input
                type="text"
                value={charSearch}
                onFocus={() => {
                  if (charSearch.trim().length > 0 && filters.characters.length === 0) {
                    setIsCharDropdownOpen(true);
                  }
                }}
                onInput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  setCharSearch(val);
                  setIsCharDropdownOpen(val.trim().length > 0);
                  if (filters.characters.length > 0 && val !== filters.characters[0]) {
                    onFilterChange({ ...filters, characters: [] });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isCharDropdownOpen && matchedCharacters.length > 0) {
                    e.preventDefault();
                    selectCharacter(matchedCharacters[0].name_vn);
                  }
                }}
                placeholder="Nhập tên hoặc biệt danh nhân vật (VD: kudo, kaito, kid, sherry, amuro)..."
                class="w-full bg-transparent text-xs text-[#212529] focus:outline-none"
              />
              {charSearch && (
                <button
                  type="button"
                  onClick={removeCharacter}
                  class="text-xs text-[#6C757D] hover:text-[#C82333] px-1"
                >
                  ×
                </button>
              )}
            </div>

            {/* Gợi ý chỉ hiện khi người dùng gõ tìm kiếm */}
            {isCharDropdownOpen && normalizedQuery.length > 0 && (
              <div class="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg bg-white shadow-lg border border-[#DEE2E6] p-1.5 z-30">
                {matchedCharacters.length === 0 ? (
                  <div class="text-xs text-[#ADB5BD] px-3 py-2 italic text-center">
                    Không tìm thấy nhân vật nào phù hợp
                  </div>
                ) : (
                  <div class="space-y-0.5">
                    {matchedCharacters.map((char) => {
                      const matchedAlias = char.aliases?.find((a) =>
                        normalizeSearchText(a).includes(normalizedQuery)
                      );
                      return (
                        <button
                          key={char.name_vn}
                          type="button"
                          onClick={() => selectCharacter(char.name_vn)}
                          class="w-full flex items-center justify-between text-left text-xs px-3 py-1.5 rounded hover:bg-[#E8EDF3] text-[#212529] transition-colors"
                        >
                          <span class="font-medium">{char.name_vn}</span>
                          {matchedAlias && (
                            <span class="text-[11px] text-[#6C757D] italic">
                              (tên gọi khác: {matchedAlias})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= DÒNG 3: CANON/FILLER + ARC + PLOT ================= */}
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <label class="md:col-span-2 text-xs font-semibold text-[#1B365D] uppercase tracking-wider">
          Phân loại & Cốt truyện
        </label>
        <div class="md:col-span-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Canon / Filler Dropdown */}
          <div>
            <span class="block text-[11px] text-[#6C757D] mb-1 font-medium">Canon / Filler</span>
            <select
              value={filters.status}
              onChange={(e) =>
                handleStatusChange((e.target as HTMLSelectElement).value as "all" | "canon" | "filler")
              }
              class="w-full bg-[#F8F9FA] border border-[#DEE2E6] rounded-md px-3 py-1.5 text-xs text-[#212529] focus:outline-none focus:ring-1 focus:ring-[#1B365D]"
            >
              <option value="all">Tất cả</option>
              <option value="canon">Canon</option>
              <option value="filler">Filler</option>
            </select>
          </div>

          {/* Arc Dropdown */}
          <div>
            <span class="block text-[11px] text-[#6C757D] mb-1 font-medium">Arc</span>
            <select
              disabled={isFiller}
              value={filters.arc}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  arc: (e.target as HTMLSelectElement).value,
                })
              }
              class={`w-full border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1B365D] ${
                isFiller
                  ? "bg-gray-100 border-[#DEE2E6]/60 text-[#ADB5BD] cursor-not-allowed"
                  : "bg-[#F8F9FA] border-[#DEE2E6] text-[#212529]"
              }`}
            >
              <option value="">{isFiller ? "" : "Tất cả"}</option>
              {!isFiller &&
                ARCS.map((arc) => (
                  <option key={arc.value} value={arc.value}>
                    {arc.label}
                  </option>
                ))}
            </select>
          </div>

          {/* Plot Dropdown */}
          <div>
            <span class="block text-[11px] text-[#6C757D] mb-1 font-medium">Plot</span>
            <select
              disabled={isFiller}
              value={filters.plot[0] || ""}
              onChange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                onFilterChange({
                  ...filters,
                  plot: val ? [val] : [],
                });
              }}
              class={`w-full border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1B365D] ${
                isFiller
                  ? "bg-gray-100 border-[#DEE2E6]/60 text-[#ADB5BD] cursor-not-allowed"
                  : "bg-[#F8F9FA] border-[#DEE2E6] text-[#212529]"
              }`}
            >
              <option value="">{isFiller ? "" : "Chọn plot"}</option>
              {!isFiller && (
                <>
                  <optgroup label="── Manh mối quan trọng ──">
                    <option value="main_plot">Có toàn bộ cốt truyện chính</option>
                    <option value="bo_appearance">Có tổ chức áo đen xuất hiện</option>
                  </optgroup>
                  <optgroup label="── Tình cảm ──">
                    <option value="romance_all">Tất cả</option>
                    <option value="romance_shin_ran">Kudo Shinichi - Mori Ran</option>
                    <option value="romance_heiji_kazuha">Hattori Heiji - Toyama Kazuha</option>
                    <option value="romance_takagi_sato">Takagi Wataru - Sato Miwako</option>
                    <option value="romance_sonoko_makoto">Suzuki Sonoko - Kyogoku Makoto</option>
                    <option value="romance_kogoro_eri">Mori Kogoro - Kisaki Eri</option>
                    <option value="romance_shukichi_yumi">Haneda Shukichi - Miyamoto Yumi</option>
                    <option value="romance_chiba_naeko">Chiba Kazunobu - Miike Naeko</option>
                    <option value="romance_kansuke_yui">Yamato Kansuke - Uehara Yui</option>
                    <option value="romance_other">Khác</option>
                  </optgroup>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ================= DÒNG 4: CHAP + VOLUME ================= */}
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        <label class="md:col-span-2 md:pt-5 text-xs font-semibold text-[#1B365D] uppercase tracking-wider">
          Manga
        </label>
        <div class="md:col-span-10 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          {/* Chap */}
          <div>
            <span class="block text-[11px] text-[#6C757D] mb-1 font-medium">
              Số Chap
            </span>
            <div class="flex items-center gap-1.5">
              <div class="relative flex-1 min-w-0">
                <input
                  type="text"
                  disabled={isFiller}
                  value={localChap}
                  onInput={(e) => {
                    const val = sanitizeFilterDraft(
                      e.target as HTMLInputElement,
                      /[^0-9a-zA-Z -]/g
                    );
                    setLocalChap(val);
                    if (chapError) setChapError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyChap();
                    }
                  }}
                  placeholder={isFiller ? "" : "Nhập số chap (VD: 1, 1-3, 10-, -5)..."}
                  class={`w-full border rounded-md pl-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1B365D] ${
                    isFiller
                      ? "bg-gray-100 border-[#DEE2E6]/60 text-[#ADB5BD] cursor-not-allowed"
                      : chapError
                        ? "bg-[#F8F9FA] border-[#C82333] text-[#212529]"
                        : "bg-[#F8F9FA] border-[#DEE2E6] text-[#212529]"
                  }`}
                />
                {localChap && !isFiller && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalChap("");
                      setChapError(null);
                      onFilterChange({ ...filters, chap: "" });
                    }}
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#6C757D] hover:text-[#C82333]"
                    title="Xóa chap"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={isFiller}
                onClick={applyChap}
                class={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors shadow-2xs ${
                  !isFiller
                    ? "bg-[#1B365D] hover:bg-[#0F2C59] text-white cursor-pointer"
                    : "bg-gray-200 text-[#ADB5BD] cursor-not-allowed"
                }`}
              >
                Lọc
              </button>
            </div>
            {chapError && (
              <p class="mt-1 text-[11px] text-[#C82333]">{chapError}</p>
            )}
          </div>

          {/* Volume */}
          <div>
            <span class="block text-[11px] text-[#6C757D] mb-1 font-medium">
              Số Volume
            </span>
            <div class="flex items-center gap-1.5">
              <div class="relative flex-1 min-w-0">
                <input
                  type="text"
                  disabled={isFiller}
                  value={localVolume}
                  onInput={(e) => {
                    const val = sanitizeFilterDraft(
                      e.target as HTMLInputElement,
                      /[^0-9a-zA-Z -]/g
                    );
                    setLocalVolume(val);
                    if (volError) setVolError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyVolume();
                    }
                  }}
                  placeholder={isFiller ? "" : "Nhập số volume (VD: 1, 1-2, SV 1, WPS 1)..."}
                  class={`w-full border rounded-md pl-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1B365D] ${
                    isFiller
                      ? "bg-gray-100 border-[#DEE2E6]/60 text-[#ADB5BD] cursor-not-allowed"
                      : volError
                        ? "bg-[#F8F9FA] border-[#C82333] text-[#212529]"
                        : "bg-[#F8F9FA] border-[#DEE2E6] text-[#212529]"
                  }`}
                />
                {localVolume && !isFiller && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalVolume("");
                      setVolError(null);
                      onFilterChange({ ...filters, volume: "" });
                    }}
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#6C757D] hover:text-[#C82333]"
                    title="Xóa volume"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={isFiller}
                onClick={applyVolume}
                class={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors shadow-2xs ${
                  !isFiller
                    ? "bg-[#1B365D] hover:bg-[#0F2C59] text-white cursor-pointer"
                    : "bg-gray-200 text-[#ADB5BD] cursor-not-allowed"
                }`}
              >
                Lọc
              </button>
            </div>
            {volError && (
              <p class="mt-1 text-[11px] text-[#C82333]">{volError}</p>
            )}
          </div>
        </div>
      </div>

      {/* ================= DÒNG 5: ẨN/HIỆN CỘT + ĐẶT LẠI TOÀN BỘ ================= */}
      <div class="pt-2 border-t border-[#DEE2E6] flex flex-wrap items-center justify-between gap-3">
        <ColumnToggle columns={columns} onChange={onColumnChange} />

        <button
          type="button"
          onClick={() => {
            setLocalEpNumber("");
            setLocalChap("");
            setLocalVolume("");
            setEpError(null);
            setChapError(null);
            setVolError(null);
            setCharSearch("");
            setIsCharDropdownOpen(false);
            onReset();
          }}
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#C82333] text-[#C82333] hover:bg-[#C82333] hover:text-white rounded-md text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Đặt lại toàn bộ</span>
        </button>
      </div>
    </div>
  );
}
