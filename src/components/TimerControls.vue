<script setup lang="ts">
import type { TimerMode, TimerStatus } from "../types/pomodoro";
defineProps<{ status: TimerStatus; mode: TimerMode }>();
defineEmits<{ toggle: []; reset: []; switch: [] }>();
</script>

<template>
  <div class="controls">
    <button class="primary-button" @click="$emit('toggle')">
      <span aria-hidden="true">{{ status === "running" ? "Ⅱ" : "▷" }}</span
      >{{
        status === "running"
          ? "一時停止"
          : status === "paused"
            ? "再開"
            : "開始"
      }}
    </button>
    <button class="reset-button" @click="$emit('reset')">
      <span aria-hidden="true">↺</span> リセット
    </button>
  </div>
  <button class="switch-button" @click="$emit('switch')">
    {{ mode === "focus" ? "休憩に切り替え" : "集中に切り替え" }}
    <span aria-hidden="true">→</span>
  </button>
</template>
