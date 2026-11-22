import { useState, useRef, useEffect } from "preact/hooks";
import type { ColumnVisibility } from "../lib/types";

interface ColumnToggleProps {
  columns: ColumnVisibility;
  onChange: (columns: ColumnVisibility) => void;
}

const columnLabels: Record<keyof ColumnVisibility, { label: string; fixed?: boolean }> = {
  label_jp: { label: "Tập JP", fixed: true },
  label_vn: { label: "Tập VN", fixed: true },
  title: { label: "Tên tập phim", fixed: true },
  status: { label: "Phân loại", fixed: true },
  arc: { label: "Arc" },
  chap: { label: "Chap" },
  volume: { label: "Volume" },
  clues: { label: "Manh mối" },
};

export function ColumnToggle({ columns, onChange }: ColumnToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (key: keyof ColumnVisibility) => {
    if (columnLabels[key].fixed) return;
    onChange({
      ...columns,
      [key]: !columns[key],
    });
  };

  return (
    <div class="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DEE2E6] rounded-md text-xs font-medium bg-white text-[#1B365D] hover:bg-[#E8EDF3] transition-colors shadow-xs"
        aria-expanded={isOpen}
      >
        <svg class="w-4 h-4 text-[#1B365D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <span>Hiển thị cột ({Object.values(columns).filter(Boolean).length})</span>
        <svg class={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div class="absolute left-0 mt-1.5 w-56 rounded-lg bg-white shadow-lg border border-[#DEE2E6] py-2 z-30">
          <div class="px-3 py-1 text-[11px] font-semibold text-[#6C757D] uppercase tracking-wider border-b border-[#DEE2E6]/60 mb-1">
            Tuỳ chỉnh cột hiển thị
          </div>
          {(Object.keys(columnLabels) as Array<keyof ColumnVisibility>).map((key) => {
            const item = columnLabels[key];
            const isChecked = columns[key];
            return (
              <label
                key={key}
                class={`flex items-center gap-2.5 px-3 py-1.5 text-xs select-none ${
                  item.fixed ? "opacity-60 cursor-not-allowed bg-gray-50" : "hover:bg-[#E8EDF3] cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={item.fixed}
                  onChange={() => toggleColumn(key)}
                  class="rounded text-[#C82333] focus:ring-[#C82333] h-3.5 w-3.5 border-[#DEE2E6]"
                />
                <span class="text-[#212529] font-medium">{item.label}</span>
                {item.fixed && <span class="text-[10px] text-[#6C757D] italic ml-auto">(bắt buộc)</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
