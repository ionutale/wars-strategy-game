import type { SfxName } from "../world/world";

const SFX: Record<SfxName, string> = {
  select: "/sfx/select.wav",
  command: "/sfx/command.wav",
  attack: "/sfx/attack.wav",
  hit: "/sfx/hit.wav",
  death: "/sfx/death.wav",
  build: "/sfx/build.wav",
  gather: "/sfx/gather.wav",
  upgrade: "/sfx/upgrade.wav",
  victory: "/sfx/victory.wav",
  defeat: "/sfx/defeat.wav",
};

const cache = new Map<string, HTMLAudioElement>();

export function playSfx(name: SfxName): void {
  try {
    const url = SFX[name];
    if (!url) return;
    let a = cache.get(url);
    if (!a) {
      a = new Audio(url);
      cache.set(url, a);
    }
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch { /* audio unsupported — ignore */ }
}

let musicEl: HTMLAudioElement | null = null;

export function startMusic(): void {
  try {
    if (musicEl) return;
    musicEl = new Audio("/audio/music.mp3");
    musicEl.loop = true;
    musicEl.volume = 0.25;
    void musicEl.play().catch(() => {});
  } catch { /* ignore */ }
}
