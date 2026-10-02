<script setup lang="ts">
import { TRACKS, type BgmSettings } from "../types/pomodoro";
defineProps<{ settings: BgmSettings }>();
const emit = defineEmits<{
  change: [value: Partial<BgmSettings>];
  close: [];
}>();
function volumeInput(event: Event) {
  emit("change", {
    volume: Number((event.target as HTMLInputElement).value) / 100,
  });
}
</script>

<template>
  <section
    id="bgm-panel"
    class="bgm-panel"
    aria-labelledby="bgm-title"
    @keydown.esc.stop="emit('close')"
  >
    <div class="panel-heading">
      <div>
        <p class="eyebrow">SOUNDS FOR FOCUS</p>
        <h2 id="bgm-title">集中に、音を添える。</h2>
      </div>
      <button
        class="close-button"
        aria-label="BGM設定を閉じる"
        @click="emit('close')"
      >
        ×
      </button>
    </div>
    <div class="sound-toggle">
      <span>BGM</span
      ><button
        class="toggle"
        role="switch"
        :aria-checked="settings.enabled"
        aria-label="BGM"
        :class="{ on: settings.enabled }"
        @click="emit('change', { enabled: !settings.enabled })"
      >
        <span></span>{{ settings.enabled ? "ON" : "OFF" }}
      </button>
    </div>
    <fieldset class="tracks">
      <legend class="sr-only">BGMの種類</legend>
      <label
        v-for="track in TRACKS"
        :key="track.id"
        class="track"
        :class="{ selected: settings.type === track.id }"
        ><input
          type="radio"
          name="track"
          :value="track.id"
          :checked="settings.type === track.id"
          @change="emit('change', { type: track.id })" /><span
          class="track-symbol"
          aria-hidden="true"
          >{{ track.symbol }}</span
        ><span class="track-copy"
          ><strong>{{ track.label }}</strong
          ><small>{{ track.detail }}</small></span
        ><span class="radio-mark" aria-hidden="true"></span
      ></label>
    </fieldset>
    <div class="volume-heading">
      <label for="volume">音量</label
      ><output for="volume">{{ Math.round(settings.volume * 100) }}%</output>
    </div>
    <input
      id="volume"
      class="volume-range"
      type="range"
      min="0"
      max="100"
      :value="Math.round(settings.volume * 100)"
      @input="volumeInput"
    />
    <p class="panel-note">BGMは集中時間中のみ再生されます。</p>
  </section>
</template>
