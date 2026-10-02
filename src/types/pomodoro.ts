export type TimerMode = "focus" | "break";
export type TimerStatus = "idle" | "running" | "paused";
export type BgmType = "rain" | "cafe" | "whiteNoise" | "nature" | "lofi";
export interface BgmSettings {
  version: 1;
  enabled: boolean;
  type: BgmType;
  volume: number;
}
export const DURATIONS = { focus: 25 * 60_000, break: 5 * 60_000 } as const;
export const TRACKS: {
  id: BgmType;
  label: string;
  detail: string;
  symbol: string;
  file: string;
}[] = [
  {
    id: "rain",
    label: "雨音",
    detail: "窓の向こうに、静かな雨",
    symbol: "☂",
    file: "rain",
  },
  {
    id: "cafe",
    label: "カフェの環境音",
    detail: "遠くのざわめきとカップの音",
    symbol: "☕",
    file: "cafe",
  },
  {
    id: "whiteNoise",
    label: "ホワイトノイズ",
    detail: "気が散る音をやさしく包む",
    symbol: "≋",
    file: "white-noise",
  },
  {
    id: "nature",
    label: "自然音",
    detail: "小鳥と、水辺のひととき",
    symbol: "♧",
    file: "nature",
  },
  {
    id: "lofi",
    label: "Lo-fi系BGM",
    detail: "ゆるやかなビートとコード",
    symbol: "♫",
    file: "lofi",
  },
];
