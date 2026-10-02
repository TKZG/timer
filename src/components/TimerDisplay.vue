<script setup lang="ts">
import type { TimerMode, TimerStatus } from "../types/pomodoro";
defineProps<{
  time: string;
  mode: TimerMode;
  status: TimerStatus;
  progress: number;
}>();
</script>

<template>
  <div class="timer-face">
    <svg class="timer-ring" viewBox="0 0 400 400" aria-hidden="true">
      <circle class="ring-track" cx="200" cy="200" r="189" />
      <circle
        class="ring-progress"
        cx="200"
        cy="200"
        r="189"
        pathLength="100"
        :stroke-dasharray="`${progress * 100} 100`"
      />
    </svg>
    <div class="timer-content">
      <p class="mode-label">
        <span
          class="status-dot"
          :class="{ active: status === 'running' }"
        ></span
        >{{ mode === "focus" ? "集中時間" : "休憩時間" }}
      </p>
      <div class="time" role="timer" :aria-label="`残り ${time}`">
        {{ time }}
      </div>
      <p class="timer-caption">
        {{
          status === "paused"
            ? "自分のペースで、ひと呼吸。"
            : mode === "focus"
              ? "今は、ひとつのことだけ。"
              : "肩の力を抜いて、ひと休み。"
        }}
      </p>
    </div>
  </div>
</template>
