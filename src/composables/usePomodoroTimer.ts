import { computed, onMounted, onUnmounted, ref } from "vue";
import { DURATIONS, type TimerMode, type TimerStatus } from "../types/pomodoro";

export function usePomodoroTimer(
  onBoundary: (completedMode: TimerMode) => void = () => {},
) {
  const mode = ref<TimerMode>("focus");
  const status = ref<TimerStatus>("idle");
  const remainingMs = ref<number>(DURATIONS.focus);
  const completedSessions = ref(0);
  let endAt = 0;
  let interval: ReturnType<typeof setInterval> | undefined;
  const formattedTime = computed(() => {
    const seconds = Math.ceil(remainingMs.value / 1000);
    return `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  });
  const progress = computed(
    () => 1 - remainingMs.value / DURATIONS[mode.value],
  );

  function tick() {
    if (status.value !== "running") return;
    const now = Date.now();
    let completedMode: TimerMode | undefined;
    // Advance from the previous deadline, so throttled callbacks never add drift.
    while (now >= endAt) {
      completedMode = mode.value;
      if (mode.value === "focus") completedSessions.value++;
      mode.value = mode.value === "focus" ? "break" : "focus";
      endAt += DURATIONS[mode.value];
    }
    remainingMs.value = Math.max(0, endAt - now);
    if (completedMode) onBoundary(completedMode);
  }
  function clearTicker() {
    if (interval !== undefined) clearInterval(interval);
    interval = undefined;
  }
  function start() {
    if (status.value === "running") return;
    endAt = Date.now() + remainingMs.value;
    status.value = "running";
    clearTicker();
    interval = setInterval(tick, 250);
  }
  function pause() {
    if (status.value !== "running") return;
    tick();
    status.value = "paused";
    clearTicker();
  }
  function reset() {
    clearTicker();
    status.value = "idle";
    remainingMs.value = DURATIONS[mode.value];
  }
  function switchMode() {
    mode.value = mode.value === "focus" ? "break" : "focus";
    reset();
  }
  onMounted(() => document.addEventListener("visibilitychange", tick));
  onUnmounted(() => {
    clearTicker();
    document.removeEventListener("visibilitychange", tick);
  });
  return {
    mode,
    status,
    remainingMs,
    completedSessions,
    formattedTime,
    progress,
    start,
    pause,
    reset,
    switchMode,
  };
}
