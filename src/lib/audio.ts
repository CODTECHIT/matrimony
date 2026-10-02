/**
 * Lightweight in-browser notification sound chime using the Web Audio API.
 * Requires zero external audio assets, works universally, and respects user interactions.
 */
export function playNotificationChime() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Dual-tone harmonic chime (880Hz A5 -> 1320Hz E6)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1108.73, now + 0.05); // C#6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.18);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.05);

    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);

    setTimeout(() => {
      void ctx.close();
    }, 500);
  } catch {
    // Graceful fallback if autoplay restrictions prevent AudioContext
  }
}
