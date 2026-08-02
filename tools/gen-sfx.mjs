import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sfxr } from "jsfxr";
import RIFFWAVE from "jsfxr/riffwave";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx");

// The presets below are in the bfxr JSON format (camelCase; bfxr by Increpare
// is the modern sfxr successor). The jsfxr npm package (a port of the
// original sfxr by Eric Fredricksen / Chris McCormick) only understands the
// original format (wave_type, p_*, sound_vol) -- its default export is a
// namespace object, and the documented API is `sfxr.toWave(params).dataURI`.
// toOldParams() converts between the two, using the engine math from
// node_modules/jsfxr/sfxr.js and bfxr's SfxrSynth.as. Frequencies in the
// presets are in Hz and times in seconds (the bfxr scale is 0..1, so the
// presets are a hand-written dialect); everything else is bfxr-scale direct.

const SAMPLE_RATE = 44100;

// Seeded LCG so re-running the tool re-renders identical WAVs (only retuned
// presets change).
let seed = 0x1337babe;
Math.random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;

function toOldParams(p) {
  const envTime = (seconds) => Math.sqrt((seconds * SAMPLE_RATE) / 100000);
  // oscillator phase advances per oversampled sub-sample (8x), so
  // frequency = 3528 * (f^2 + 0.001) Hz with period = 100 / (f^2 + 0.001) sub-samples
  const freq = (hz) => Math.sqrt(hz / 3528 - 0.001);
  const cutoffEnabled = p.minFrequency < p.startFrequency;
  return {
    oldParams: true,
    wave_type: p.waveType,               // 0=square 1=sawtooth 2=sine 3=noise, identical in both formats
    sound_vol: p.masterVolume ** 2,      // bfxr: volume = v^2 (engine gain = exp(sound_vol) - 1)
    p_env_attack: envTime(p.attackTime), // envelope lengths are p^2 * 100000 samples
    p_env_sustain: envTime(p.sustainTime),
    p_env_punch: p.sustainPunch,         // 0..1; sustain peaks at 1 + 2*punch
    p_env_decay: envTime(p.decayTime),
    p_base_freq: freq(p.startFrequency),
    p_freq_limit: cutoffEnabled ? freq(p.minFrequency) : 0, // disabled unless the slide can reach it (0 disables cutoff)
    p_freq_ramp: p.slide,                // signed; period *= 1 - ramp^3 * 0.01 per sample
    p_freq_dramp: p.deltaSlide,
    p_vib_strength: p.vibratoDepth,      // 0..1; vibrato amplitude = depth * 0.5
    p_vib_speed: Math.sqrt((p.vibratoSpeed * 2 * Math.PI) / 441), // vibratoSpeed in Hz
    p_arp_mod: p.changeAmount,           // signed; pitch jump multiplier 1 - mod^2 * 0.9 (or + mod^2 * 10)
    p_arp_speed: p.changeSpeed,          // 0..1; delay before the pitch jump
    p_duty: p.squareDuty,                // bfxr: dutyCycle = 0.5 - squareDuty * 0.5
    p_duty_ramp: p.dutySweep,
    p_repeat_speed: p.repeatSpeed,       // 0 = no repeat
    p_pha_offset: p.phaserOffset,
    p_pha_ramp: p.phaserSweep,
    p_lpf_freq: p.lpFilterCutoff,        // 1 = low-pass disabled
    p_lpf_ramp: p.lpFilterCutoffSweep,
    p_lpf_resonance: p.lpFilterResonance,
    p_hpf_freq: p.hpFilterCutoff,
    p_hpf_ramp: p.hpFilterCutoffSweep,
    sample_rate: SAMPLE_RATE,
    sample_size: 8,
  };
}

// `noise` is not a bfxr param (waveType 3 IS noise there), so treat it as a
// 0..1 white-noise mix ratio: blend noise into the normalized samples and
// re-encode, giving non-noise waveforms a bit of grit.
function renderWavDataUri(preset) {
  const wave = sfxr.toWave(toOldParams(preset));
  const mix = preset.noise || 0;
  if (mix <= 0) return wave.dataURI;
  const bytes = wave.buffer.map((s) => {
    const mixed = (1 - mix) * s + mix * (Math.random() * 2 - 1);
    const q = Math.floor((mixed + 1) * 128);
    return q < 0 ? 0 : q > 255 ? 255 : q;
  });
  const riff = new RIFFWAVE();
  riff.header.sampleRate = SAMPLE_RATE;
  riff.header.bitsPerSample = 8;
  riff.Make(bytes);
  return riff.dataURI;
}

// Presets follow the bfxr JSON format (see the header comment for the conversion notes).
const presets = {
  select: { masterVolume: 0.5, attackTime: 0.01, sustainTime: 0.08, sustainPunch: 0.3, decayTime: 0.1, startFrequency: 880, minFrequency: 440, slide: 0, deltaSlide: 0, vibratoDepth: 0, vibratoSpeed: 0, changeAmount: 0, changeSpeed: 0, squareDuty: 0.5, dutySweep: 0, repeatSpeed: 0, phaserOffset: 0, phaserSweep: 0, lpFilterCutoff: 1, lpFilterCutoffSweep: 0, lpFilterResonance: 0, hpFilterCutoff: 0, hpFilterCutoffSweep: 0, noise: 0, waveType: 1 },
  command: { masterVolume: 0.5, attackTime: 0.005, sustainTime: 0.05, sustainPunch: 0.2, decayTime: 0.08, startFrequency: 620, minFrequency: 420, slide: -0.2, deltaSlide: 0, vibratoDepth: 0, vibratoSpeed: 0, changeAmount: 0, changeSpeed: 0, squareDuty: 0.5, dutySweep: 0, repeatSpeed: 0, phaserOffset: 0, phaserSweep: 0, lpFilterCutoff: 1, lpFilterCutoffSweep: 0, lpFilterResonance: 0, hpFilterCutoff: 0, hpFilterCutoffSweep: 0, noise: 0, waveType: 0 },
  attack: { masterVolume: 0.5, attackTime: 0.01, sustainTime: 0.1, sustainPunch: 0.4, decayTime: 0.15, startFrequency: 300, minFrequency: 120, slide: -0.4, deltaSlide: 0, vibratoDepth: 0, vibratoSpeed: 0, changeAmount: 0, changeSpeed: 0, squareDuty: 0.5, dutySweep: 0, repeatSpeed: 0, phaserOffset: 0, phaserSweep: 0, lpFilterCutoff: 1, lpFilterCutoffSweep: 0, lpFilterResonance: 0, hpFilterCutoff: 0, hpFilterCutoffSweep: 0, noise: 0.2, waveType: 2 },
  hit: { masterVolume: 0.5, attackTime: 0.005, sustainTime: 0.03, sustainPunch: 0.1, decayTime: 0.05, startFrequency: 220, minFrequency: 150, slide: -0.3, deltaSlide: 0, vibratoDepth: 0, vibratoSpeed: 0, changeAmount: 0, changeSpeed: 0, squareDuty: 0.5, dutySweep: 0, repeatSpeed: 0, phaserOffset: 0, phaserSweep: 0, lpFilterCutoff: 0.8, lpFilterCutoffSweep: 0, lpFilterResonance: 0, hpFilterCutoff: 0, hpFilterCutoffSweep: 0, noise: 0.4, waveType: 3 },
  death: { masterVolume: 0.5, attackTime: 0.02, sustainTime: 0.3, sustainPunch: 0.2, decayTime: 0.4, startFrequency: 400, minFrequency: 60, slide: -0.6, deltaSlide: 0, vibratoDepth: 0, vibratoSpeed: 0, changeAmount: 0, changeSpeed: 0, squareDuty: 0.5, dutySweep: 0, repeatSpeed: 0, phaserOffset: 0, phaserSweep: 0, lpFilterCutoff: 0.6, lpFilterCutoffSweep: 0, lpFilterResonance: 0, hpFilterCutoff: 0, hpFilterCutoffSweep: 0, noise: 0.5, waveType: 3 },
  build: { masterVolume: 0.5, attackTime: 0.01, sustainTime: 0.12, sustainPunch: 0.2, decayTime: 0.2, startFrequency: 200, minFrequency: 320, slide: 0.3, deltaSlide: 0, vibratoDepth: 0, vibratoSpeed: 0, changeAmount: 0, changeSpeed: 0, squareDuty: 0.5, dutySweep: 0, repeatSpeed: 0, phaserOffset: 0, phaserSweep: 0, lpFilterCutoff: 1, lpFilterCutoffSweep: 0, lpFilterResonance: 0, hpFilterCutoff: 0, hpFilterCutoffSweep: 0, noise: 0.1, waveType: 0 },
  gather: { masterVolume: 0.5, attackTime: 0.005, sustainTime: 0.04, sustainPunch: 0.1, decayTime: 0.1, startFrequency: 520, minFrequency: 520, slide: 0.1, deltaSlide: 0, vibratoDepth: 0.3, vibratoSpeed: 8, changeAmount: 0, changeSpeed: 0, squareDuty: 0.5, dutySweep: 0, repeatSpeed: 0, phaserOffset: 0, phaserSweep: 0, lpFilterCutoff: 1, lpFilterCutoffSweep: 0, lpFilterResonance: 0, hpFilterCutoff: 0, hpFilterCutoffSweep: 0, noise: 0, waveType: 1 },
  upgrade: { masterVolume: 0.5, attackTime: 0.05, sustainTime: 0.2, sustainPunch: 0.3, decayTime: 0.3, startFrequency: 300, minFrequency: 900, slide: 0.8, deltaSlide: 0, vibratoDepth: 0, vibratoSpeed: 0, changeAmount: 0, changeSpeed: 0, squareDuty: 0.5, dutySweep: 0, repeatSpeed: 0, phaserOffset: 0, phaserSweep: 0, lpFilterCutoff: 1, lpFilterCutoffSweep: 0, lpFilterResonance: 0, hpFilterCutoff: 0, hpFilterCutoffSweep: 0, noise: 0, waveType: 0 },
  victory: { masterVolume: 0.6, attackTime: 0.01, sustainTime: 0.4, sustainPunch: 0.4, decayTime: 0.5, startFrequency: 523, minFrequency: 523, slide: 0, deltaSlide: 0, vibratoDepth: 0.1, vibratoSpeed: 6, changeAmount: 0.4, changeSpeed: 0.6, squareDuty: 0.5, dutySweep: 0, repeatSpeed: 0, phaserOffset: 0, phaserSweep: 0, lpFilterCutoff: 1, lpFilterCutoffSweep: 0, lpFilterResonance: 0, hpFilterCutoff: 0, hpFilterCutoffSweep: 0, noise: 0, waveType: 0 },
  defeat: { masterVolume: 0.5, attackTime: 0.05, sustainTime: 0.5, sustainPunch: 0.2, decayTime: 0.6, startFrequency: 220, minFrequency: 110, slide: -0.4, deltaSlide: 0, vibratoDepth: 0, vibratoSpeed: 0, changeAmount: 0, changeSpeed: 0, squareDuty: 0.5, dutySweep: 0, repeatSpeed: 0, phaserOffset: 0, phaserSweep: 0, lpFilterCutoff: 0.8, lpFilterCutoffSweep: 0, lpFilterResonance: 0, hpFilterCutoff: 0, hpFilterCutoffSweep: 0, noise: 0.1, waveType: 2 },
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, params] of Object.entries(presets)) {
  const dataUri = renderWavDataUri(params);
  const b64 = dataUri.split(",")[1];
  const buffer = Buffer.from(b64, "base64");
  const file = join(OUT_DIR, `${name}.wav`);
  writeFileSync(file, buffer);
  console.log(`wrote ${file} (${buffer.length} bytes)`);
}
