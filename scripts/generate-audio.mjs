// Original procedural soundscapes. No recordings or third-party samples.
import { mkdirSync, writeFileSync } from "node:fs";
const rate = 22050;
const duration = 16;
const size = rate * duration;
mkdirSync(new URL("../public/audio/", import.meta.url), { recursive: true });
let seed = 37;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => random() * 2 - 1;
const sine = (frequency, t) => Math.sin(2 * Math.PI * frequency * t);
function write(name, samples) {
  // Equal-power overlap at the loop boundary for ambient textures.
  const overlap = name === "lofi" ? 0 : Math.floor(rate * 0.2);
  for (let i = 0; i < overlap; i++) {
    const mix = i / overlap;
    samples[i] =
      samples[size - overlap + i] * Math.cos((mix * Math.PI) / 2) +
      samples[i] * Math.sin((mix * Math.PI) / 2);
  }
  const count = size - overlap;
  // Bake fades into the audio so looping stays gentle even in background tabs.
  const fadeIn = rate;
  const fadeOut = rate * 2;
  const smoothstep = (x) => x * x * (3 - 2 * x);
  for (let i = 0; i < count; i++) {
    const gain =
      smoothstep(Math.min(1, i / fadeIn)) *
      smoothstep(Math.min(1, (count - 1 - i) / fadeOut));
    samples[i] *= gain;
  }
  const wav = Buffer.alloc(44 + count * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++)
    wav.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767),
      44 + i * 2,
    );
  writeFileSync(new URL(`../public/audio/${name}.wav`, import.meta.url), wav);
}
for (const name of ["rain", "cafe", "white-noise", "nature", "lofi"]) {
  const samples = new Float32Array(size);
  let low = 0,
    slow = 0;
  const chatter = Array.from({ length: 14 }, () => ({
    f: 100 + random() * 370,
    speed: 1 + random() * 5,
    phase: random() * 6,
  }));
  for (let i = 0; i < size; i++) {
    const t = i / rate;
    const white = noise();
    low = low * 0.96 + white * 0.04;
    slow = slow * 0.998 + white * 0.002;
    let value = 0;
    if (name === "white-noise") value = white * 0.22;
    if (name === "rain") {
      value = (white * 0.12 + low * 1.1) * (0.8 + 0.2 * sine(0.125, t));
      const drop = t % 0.731;
      value += sine(2600 - drop * 900, t) * Math.exp(-drop * 95) * 0.045;
    }
    if (name === "cafe") {
      value = low * 0.4 + slow * 0.8;
      for (const voice of chatter)
        value +=
          sine(voice.f, t) *
          Math.max(0, Math.sin(t * voice.speed + voice.phase)) ** 3 *
          0.012;
      const clink = (t + 0.8) % 3.7;
      value +=
        (sine(1800, clink) + sine(2730, clink) * 0.4) *
        Math.exp(-clink * 18) *
        0.08;
    }
    if (name === "nature") {
      value = low * 0.7 + white * 0.035 + slow * 0.3;
      const bird = t % 3.2;
      if (bird < 0.7)
        value +=
          sine(2100, bird) *
          sine(480, bird) *
          Math.sin((Math.PI * bird) / 0.7) ** 2 *
          0.08;
      const chirp = (t + 1.5) % 4;
      if (chirp < 0.4)
        value +=
          Math.sin(2 * Math.PI * (2800 * chirp + 600 * chirp * chirp)) *
          Math.sin((Math.PI * chirp) / 0.4) ** 2 *
          0.06;
    }
    if (name === "lofi") {
      const chords = [
        [130.81, 164.81, 196, 246.94],
        [110, 130.81, 164.81, 196],
        [87.31, 110, 130.81, 164.81],
        [98, 123.47, 146.83, 174.61],
      ];
      const chord = chords[Math.floor(t / 4) % 4];
      const local = t % 4;
      const env = Math.min(1, local * 15) * Math.min(1, (4 - local) * 10);
      for (const f of chord)
        value += (sine(f, t) + 0.15 * sine(f * 2, t)) * 0.055 * env;
      const beat = t % 0.8;
      value +=
        Math.sin(2 * Math.PI * (48 * beat + 3 * (1 - Math.exp(-beat * 30)))) *
        Math.exp(-beat * 18) *
        0.25;
      const snare = (t + 0.8) % 1.6;
      value += white * Math.exp(-snare * 30) * 0.1;
      value += white * Math.exp(-(t % 0.4) * 90) * 0.055 + white * 0.007;
    }
    samples[i] = value;
  }
  write(name, samples);
  console.log(`Generated ${name}.wav`);
}
