export interface Episode {
  label_jp: string;
  label_vn: string;
  title: string;
  status: "canon" | "filler";
  chap: string;
  volume: string;
  manga_file?: string;
  arc: string;
  cast: string[];
  clues: Record<string, string>;
  link: string;
  plot_level?: number | null;
  romance_couple?: string | string[] | null;
}

export interface CharacterInfo {
  name_vn: string;
  aliases: string[];
}

export type EpisodeFilterSystem = "vn" | "jp" | "";

export interface FilterState {
  episodeSystem: EpisodeFilterSystem;
  episodeNumber: string;
  status: "all" | "canon" | "filler";
  arc: string;
  plot: string[]; // Placeholder multi-select
  characters: string[];
  chap: string;
  volume: string;
}

export interface ColumnVisibility {
  label_jp: boolean;
  label_vn: boolean;
  title: boolean;
  status: boolean;
  arc: boolean;
  chap: boolean;
  volume: boolean;
  clues: boolean;
}
