import { onUnmounted, ref } from "vue";

export function useNotificationSound() {
  let context: AudioContext | undefined;
  let disposed = false;
  const error = ref("");
  async function unlock() {
    try {
      if (disposed) return;
      context ??= new AudioContext();
      await context.resume();
      if (!disposed) error.value = "";
    } catch {
      error.value = "通知音を有効にするには、音声を再開してください。";
    }
  }
  function play() {
    if (!context || context.state !== "running") {
      error.value = "通知音が停止しています。音声を再開してください。";
      return;
    }
    const start = context.currentTime;
    for (const [index, frequency] of [659.25, 880].entries()) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const time = start + index * 0.22;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.14, time + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.65);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  }
  onUnmounted(() => {
    disposed = true;
    void context?.close().catch(() => {});
  });
  return { unlock, play, error };
}
