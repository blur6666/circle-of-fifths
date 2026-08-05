/* Mobile selected-key playback. Its state remains private to this module. */

CF.audio = (function () {

const { ROOT_MIDI, MAJOR_SCALE } = CF.config;

function createKeyPlayer(getKeyIndex, prepareKeyForPlayback) {
  const button = document.getElementById('key-player');
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!button || !AudioContextCtor) {
    if (button) button.hidden = true;
    return;
  }

  let context = null;
  let playing = false;
  let preparing = false;
  let finishTimer = null;
  const oscillators = new Set();

  const setPlaying = active => {
    playing = active;
    button.classList.toggle('is-playing', active);
    button.setAttribute('aria-label', active ? 'Stop key playback' : 'Play selected key');
    button.setAttribute('aria-pressed', String(active));
  };

  const stop = () => {
    if (finishTimer) clearTimeout(finishTimer);
    finishTimer = null;
    oscillators.forEach(oscillator => {
      oscillator.onended = null;
      try { oscillator.stop(); } catch {}
    });
    oscillators.clear();
    setPlaying(false);
  };

  const scheduleTone = (midi, start, duration, gainLevel) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainLevel, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.onended = () => oscillators.delete(oscillator);
    oscillators.add(oscillator);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };

  const scalePitch = (root, degree) =>
    root + MAJOR_SCALE[degree % MAJOR_SCALE.length] + 12 * Math.floor(degree / MAJOR_SCALE.length);

  button.addEventListener('click', async () => {
    if (playing || preparing) {
      stop();
      return;
    }

    context ||= new AudioContextCtor();
    try {
      await context.resume();
    } catch {
      return;
    }

    preparing = true;
    button.disabled = true;
    await prepareKeyForPlayback();
    button.disabled = false;
    preparing = false;

    const root = ROOT_MIDI[getKeyIndex()];
    let start = context.currentTime + 0.05;
    const scaleDuration = 0.28;
    const chordDuration = 0.58;

    for (let degree = 0; degree <= MAJOR_SCALE.length; degree += 1) {
      scheduleTone(scalePitch(root, degree), start, scaleDuration, 0.11);
      start += 0.34;
    }
    start += 0.1;
    for (let degree = 0; degree < MAJOR_SCALE.length; degree += 1) {
      [degree, degree + 2, degree + 4].forEach(note =>
        scheduleTone(scalePitch(root, note), start, chordDuration, 0.045));
      start += 0.68;
    }

    setPlaying(true);
    finishTimer = setTimeout(() => {
      finishTimer = null;
      oscillators.clear();
      setPlaying(false);
    }, Math.ceil((start - context.currentTime) * 1000) + 80);
  });
}

return { createKeyPlayer };

})();
