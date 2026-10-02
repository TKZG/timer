import { createApp, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePomodoroTimer } from "./usePomodoroTimer";

let unmount: (() => void) | undefined;
function mountTimer(boundary = vi.fn()) {
  let timer!: ReturnType<typeof usePomodoroTimer>;
  const app = createApp({
    setup() {
      timer = usePomodoroTimer(boundary);
      return () => h("div");
    },
  });
  app.mount(document.createElement("div"));
  unmount = () => app.unmount();
  return { timer, boundary };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  unmount?.();
  vi.useRealTimers();
});

describe("deadline-based timer", () => {
  it("starts once, pauses exactly, resumes, and cleans up", () => {
    const { timer } = mountTimer();
    expect(timer.formattedTime.value).toBe("25:00");
    timer.start();
    timer.start();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(12_350);
    timer.pause();
    expect(timer.remainingMs.value).toBe(1_487_650);
    vi.advanceTimersByTime(60_000);
    expect(timer.remainingMs.value).toBe(1_487_650);
    timer.start();
    vi.advanceTimersByTime(1000);
    expect(timer.remainingMs.value).toBe(1_486_650);
    unmount?.();
    unmount = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("automatically alternates and counts only completed focus sessions", () => {
    const { timer, boundary } = mountTimer();
    timer.start();
    vi.advanceTimersByTime(25 * 60_000);
    expect(timer.mode.value).toBe("break");
    expect(timer.formattedTime.value).toBe("05:00");
    expect(timer.completedSessions.value).toBe(1);
    vi.advanceTimersByTime(5 * 60_000);
    expect(timer.mode.value).toBe("focus");
    expect(timer.formattedTime.value).toBe("25:00");
    expect(timer.status.value).toBe("running");
    expect(timer.completedSessions.value).toBe(1);
    expect(boundary).toHaveBeenCalledTimes(2);
  });
  it("catches up several suspended cycles and notifies only once", () => {
    const { timer, boundary } = mountTimer();
    timer.start();
    vi.setSystemTime(86 * 60_000);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(timer.mode.value).toBe("break");
    expect(timer.completedSessions.value).toBe(3);
    expect(timer.formattedTime.value).toBe("04:00");
    expect(boundary).toHaveBeenCalledTimes(1);
  });
  it("reset and manual switch stop without adding or clearing completions", () => {
    const { timer } = mountTimer();
    timer.start();
    vi.advanceTimersByTime(25 * 60_000);
    timer.reset();
    expect(timer.formattedTime.value).toBe("05:00");
    expect(timer.status.value).toBe("idle");
    timer.switchMode();
    expect(timer.formattedTime.value).toBe("25:00");
    expect(timer.completedSessions.value).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
