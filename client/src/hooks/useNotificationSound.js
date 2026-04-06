/**
 * Plays a soft notification chime using the Web Audio API.
 * No external file needed — works in all modern browsers.
 */
export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Two-tone chime: high note then slightly lower
    const notes = [880, 660];
    let startTime = ctx.currentTime;

    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.start(startTime);
      osc.stop(startTime + 0.3);

      startTime += 0.15;
    });
  } catch {
    // Silently fail if audio context is blocked
  }
}
