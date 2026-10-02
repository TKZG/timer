import { createApp, h } from "vue";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readSettings, STORAGE_KEY, useBgm } from "./useBgm";

let unmount: (() => void) | undefined;
let audio: {
  loop: boolean;
  preload: string;
  src: string;
  volume: number;
  currentTime: number;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  removeAttribute: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
};
beforeEach(() => {
  localStorage.clear();
  audio = {
    loop: false,
    preload: "",
    src: "",
    volume: 1,
    currentTime: 0,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    removeAttribute: vi.fn(),
    load: vi.fn(),
  };
  vi.stubGlobal("Audio", function () {
    return audio;
  });
});
afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function mountBgm() {
  let bgm!: ReturnType<typeof useBgm>;
  const app = createApp({
    setup() {
      bgm = useBgm();
      return () => h("div");
    },
  });
  app.mount(document.createElement("div"));
  unmount = () => app.unmount();
  return bgm;
}
it("validates stored settings and tolerates broken or blocked storage", () => {
  localStorage.setItem(STORAGE_KEY, "{broken");
  expect(readSettings().type).toBe("rain");
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, type: "bad", volume: 99, enabled: false }),
  );
  expect(readSettings()).toEqual({
    version: 1,
    type: "rain",
    volume: 0.35,
    enabled: false,
  });
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(readSettings().volume).toBe(0.35);
});
it("plays, pauses without rewinding, stops with rewind and persists selection", async () => {
  const bgm = mountBgm();
  expect(audio.play).not.toHaveBeenCalled();
  await bgm.sync(true);
  expect(bgm.playing.value).toBe(true);
  audio.currentTime = 5;
  await bgm.sync(false);
  expect(audio.currentTime).toBe(5);
  await bgm.sync(false, true);
  expect(audio.currentTime).toBe(0);
  bgm.settings.value.type = "lofi";
  bgm.settings.value.volume = 0.7;
  expect(audio.src).toContain("lofi.wav");
  expect(audio.volume).toBe(0.7);
  expect(readSettings().type).toBe("lofi");
  expect(readSettings().volume).toBe(0.7);
});
it("keeps disabled BGM silent, and recovers from autoplay rejection", async () => {
  const bgm = mountBgm();
  bgm.settings.value.enabled = false;
  await bgm.sync(true);
  expect(audio.play).not.toHaveBeenCalled();
  bgm.settings.value.enabled = true;
  audio.play.mockRejectedValueOnce(
    new DOMException("blocked", "NotAllowedError"),
  );
  await bgm.sync(true);
  expect(bgm.error.value).toContain("制限");
  await bgm.sync(true);
  expect(bgm.error.value).toBe("");
  expect(bgm.playing.value).toBe(true);
});
it("ignores stale play results after pause and cleans up the audio", async () => {
  const bgm = mountBgm();
  let resolve!: () => void;
  audio.play.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  const pending = bgm.sync(true);
  await bgm.sync(false);
  resolve();
  await pending;
  expect(bgm.playing.value).toBe(false);
  unmount?.();
  unmount = undefined;
  expect(audio.removeAttribute).toHaveBeenCalledWith("src");
  expect(audio.load).toHaveBeenCalled();
});
