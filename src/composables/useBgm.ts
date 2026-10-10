import { onUnmounted, ref, watch } from "vue";
import { TRACKS, type BgmSettings } from "../types/pomodoro";

export const STORAGE_KEY = "pomodoro:bgm-settings";
const defaults: BgmSettings = {
  version: 1,
  enabled: true,
  type: "rain",
  volume: 0.15,
};
export function readSettings(): BgmSettings {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (value?.version !== 1) return { ...defaults };
    return {
      version: 1,
      enabled:
        typeof value.enabled === "boolean" ? value.enabled : defaults.enabled,
      type: TRACKS.some((track) => track.id === value.type)
        ? value.type
        : defaults.type,
      volume:
        typeof value.volume === "number" &&
        Number.isFinite(value.volume) &&
        value.volume >= 0 &&
        value.volume <= 1
          ? value.volume
          : defaults.volume,
    };
  } catch {
    return { ...defaults };
  }
}

export function useBgm() {
  const settings = ref(readSettings());
  const error = ref("");
  const playing = ref(false);
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "none";
  let wantsPlayback = false;
  let request = 0;
  let disposed = false;
  function setSource() {
    const track = TRACKS.find((track) => track.id === settings.value.type)!;
    audio.src = `${import.meta.env.BASE_URL}audio/${track.file}.wav`;
  }
  setSource();
  audio.volume = settings.value.volume;

  async function sync(active: boolean, rewind = false) {
    wantsPlayback = active;
    const current = ++request;
    error.value = "";
    if (rewind) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (!active || !settings.value.enabled || disposed) {
      audio.pause();
      playing.value = false;
      return;
    }
    try {
      await audio.play();
      if (current === request && !disposed) playing.value = true;
    } catch (cause) {
      if (current !== request || disposed) return;
      playing.value = false;
      error.value =
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "音声の再生が制限されています。ボタンを押して再開してください。"
          : "BGMを再生できませんでした。音声を再開してお試しください。";
    }
  }
  watch(
    () => settings.value.type,
    () => {
      ++request;
      audio.pause();
      playing.value = false;
      setSource();
      void sync(wantsPlayback, true);
    },
    { flush: "sync" },
  );
  watch(
    () => settings.value.enabled,
    () => {
      void sync(wantsPlayback);
    },
    { flush: "sync" },
  );
  watch(
    () => settings.value.volume,
    (volume) => {
      audio.volume = volume;
    },
    { flush: "sync" },
  );
  watch(
    settings,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* Continue without persistence. */
      }
    },
    { deep: true, flush: "sync" },
  );
  onUnmounted(() => {
    disposed = true;
    ++request;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  });
  return { settings, error, playing, sync };
}
