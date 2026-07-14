/**
 * Client-side notification sound player.
 * Uses preloaded MP3 files from /sounds/ with Web Audio API fallback.
 */

const SOUND_PATHS: Record<string, string> = {
  notification: "/sounds/notification.mp3",
  ping: "/sounds/notification-ping-372476.mp3",
};

const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(src: string): HTMLAudioElement {
  let audio = audioCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = "auto";
    audioCache.set(src, audio);
  }
  // Reset for replay
  audio.currentTime = 0;
  return audio;
}

/**
 * Play a notification sound.
 * Falls back to Web Audio API beep if audio element fails.
 */
export function playNotificationSound(type: "notification" | "ping" = "notification"): void {
  const src = SOUND_PATHS[type];
  if (!src) return;

  try {
    const audio = getAudio(src);
    audio.play().catch(() => playGeneratedBeep());
  } catch {
    playGeneratedBeep();
  }
}

/**
 * Fallback: generate a beep using Web Audio API.
 */
function playGeneratedBeep(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);

    // Cleanup
    osc.onended = () => ctx.close();
  } catch {
    // Audio not supported — silent fallback
  }
}
