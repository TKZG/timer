<script setup lang="ts">
import { computed, ref, watch } from "vue";
import TimerDisplay from "./components/TimerDisplay.vue";
import TimerControls from "./components/TimerControls.vue";
import BgmSettingsPanel from "./components/BgmSettingsPanel.vue";
import { usePomodoroTimer } from "./composables/usePomodoroTimer";
import { useBgm } from "./composables/useBgm";
import { useNotificationSound } from "./composables/useNotificationSound";
import { TRACKS, type BgmSettings } from "./types/pomodoro";

const bgm = useBgm();
const notification = useNotificationSound();
const timer = usePomodoroTimer(() => {
  notification.play();
  void bgm.sync(
    timer.mode.value === "focus" && timer.status.value === "running",
    true,
  );
});
const { mode, status, formattedTime, progress, completedSessions } = timer;
const { settings, error: bgmError, playing } = bgm;
const { error: notificationError } = notification;
const panelOpen = ref(false);
const bgmButton = ref<HTMLButtonElement>();
const selectedTrack = computed(() =>
  TRACKS.find((track) => track.id === settings.value.type)!,
);
watch([mode, status], () => {
  void bgm.sync(mode.value === "focus" && status.value === "running");
});
function toggleTimer() {
  if (status.value === "running") {
    timer.pause();
    return;
  }
  void notification.unlock();
  timer.start();
  // Call play directly in the user gesture, before awaiting any promise.
  void bgm.sync(mode.value === "focus");
}
function reset() {
  timer.reset();
  void bgm.sync(false, true);
}
function switchMode() {
  timer.switchMode();
  void bgm.sync(false, true);
}
function changeSettings(value: Partial<BgmSettings>) {
  Object.assign(settings.value, value);
}
function closePanel() {
  panelOpen.value = false;
  bgmButton.value?.focus();
}
function retryAudio() {
  void notification.unlock();
  void bgm.sync(mode.value === "focus" && status.value === "running");
}
</script>

<template>
  <div class="app-shell" :class="{ 'break-mode': mode === 'break' }">
    <header class="site-header">
      <a href="./" class="brand" aria-label="still ホーム"
        ><span class="brand-icon" aria-hidden="true">◒</span> still<span
          class="brand-dot"
          >.</span
        ></a
      ><span class="header-note">余白をつくる、集中の時間。</span
      ><span class="header-tag">POMODORO TIMER</span>
    </header>
    <main>
      <div class="intro">
        <p class="eyebrow">A LITTLE FOCUS, A LITTLE REST.</p>
        <h1>音とともに、ひとつずつ。</h1>
      </div>
      <div class="mode-indicator" aria-live="polite">
        <span :class="{ current: mode === 'focus' }">集中 <b>25</b> 分</span
        ><span class="mode-divider">/</span
        ><span :class="{ current: mode === 'break' }">休憩 <b>5</b> 分</span>
      </div>
      <TimerDisplay
        :time="formattedTime"
        :mode="mode"
        :status="status"
        :progress="progress"
      />
      <TimerControls
        :status="status"
        :mode="mode"
        @toggle="toggleTimer"
        @reset="reset"
        @switch="switchMode"
      />
      <div class="sessions" aria-live="polite">
        <span class="session-dots" aria-hidden="true"
          ><i
            v-for="n in 4"
            :key="n"
            :class="{
              filled:
                n <= (completedSessions % 4 || (completedSessions > 0 ? 4 : 0)),
            }"
          ></i></span
        ><span
          >完了した集中セッション <strong>{{ completedSessions }}</strong></span
        >
      </div>
      <div class="sound-area">
        <button
          ref="bgmButton"
          class="bgm-button"
          :aria-expanded="panelOpen"
          aria-controls="bgm-panel"
          @click="panelOpen = !panelOpen"
        >
          <span class="sound-bars" :class="{ playing }" aria-hidden="true"
            ><i></i><i></i><i></i><i></i></span
          ><span>BGM</span
          ><span class="bgm-current">{{
            settings.enabled ? selectedTrack.label : "OFF"
          }}</span
          ><span aria-hidden="true">{{ panelOpen ? "−" : "+" }}</span>
        </button>
        <BgmSettingsPanel
          v-if="panelOpen"
          :settings="settings"
          @change="changeSettings"
          @close="closePanel"
        />
      </div>
      <div
        v-if="bgmError || notificationError"
        class="audio-message"
        role="status"
      >
        <p>{{ bgmError || notificationError }}</p>
        <button @click="retryAudio">音声を再開</button>
      </div>
    </main>
    <footer>
      <span>25分の集中。5分の余白。</span><span class="footer-line"></span
      ><span>あなたのペースで、少しずつ。</span>
    </footer>
  </div>
</template>
