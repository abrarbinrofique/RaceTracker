const KEY_UNLOCKED = 'bbr_unlocked';
const KEY_BEST_TIMES = 'bbr_best_times';

export default class ProgressManager {
  static getUnlocked() {
    try {
      return new Set(JSON.parse(localStorage.getItem(KEY_UNLOCKED) || '[0]'));
    } catch { return new Set([0]); }
  }

  static isUnlocked(trackIndex) {
    return ProgressManager.getUnlocked().has(trackIndex);
  }

  static unlockNext(currentTrackIndex) {
    const next = currentTrackIndex + 1;
    const unlocked = ProgressManager.getUnlocked();
    if (unlocked.has(next)) return false;  // already unlocked
    unlocked.add(next);
    localStorage.setItem(KEY_UNLOCKED, JSON.stringify([...unlocked]));
    return true;  // newly unlocked
  }

  // Returns true if a new record was set
  static saveBestTime(trackIndex, ms) {
    try {
      const times = JSON.parse(localStorage.getItem(KEY_BEST_TIMES) || '{}');
      if (!times[trackIndex] || ms < times[trackIndex]) {
        times[trackIndex] = ms;
        localStorage.setItem(KEY_BEST_TIMES, JSON.stringify(times));
        return true;
      }
    } catch {}
    return false;
  }

  static getBestTime(trackIndex) {
    try {
      const times = JSON.parse(localStorage.getItem(KEY_BEST_TIMES) || '{}');
      return times[trackIndex] || null;
    } catch { return null; }
  }

  static reset() {
    localStorage.removeItem(KEY_UNLOCKED);
    localStorage.removeItem(KEY_BEST_TIMES);
  }
}
