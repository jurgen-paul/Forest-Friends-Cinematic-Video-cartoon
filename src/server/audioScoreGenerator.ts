/**
 * Procedural Studio Soundtrack Audio Generator (44.1kHz Stereo 16-bit PCM WAV)
 * High-fidelity fallback when Google Lyria API limits/permission issues occur.
 */

export interface ScoreGenerationOptions {
  durationSec: number;
  moodId?: string;
  moodName?: string;
  proceduralPlan?: {
    tempoBpm?: number;
    keySignature?: string;
    baseFrequencyHz?: number;
    scales?: number[];
    chordSequence?: Array<{
      timeMs: number;
      chordName: string;
      rootFreq: number;
      type: 'major' | 'minor' | 'sus4' | 'maj7';
    }>;
  };
}

export function generateStudioScoreWav(options: ScoreGenerationOptions): string {
  const durationSec = Math.max(5, Math.min(180, options.durationSec || 60));
  const sampleRate = 44100;
  const numChannels = 2;
  const totalSamples = Math.floor(sampleRate * durationSec);

  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const plan = options.proceduralPlan;
  const baseFreq = plan?.baseFrequencyHz || 164.81; // E3
  const tempoBpm = plan?.tempoBpm || 80;
  const beatDurationSec = 60 / tempoBpm;

  // Cinematic Progression
  const defaultChords: Array<{ startSec: number; endSec: number; rootFreq: number; type: 'major' | 'minor' | 'sus4' | 'maj7' }> = [
    { startSec: 0, endSec: 5.5, rootFreq: baseFreq, type: 'major' },
    { startSec: 5.5, endSec: 10.5, rootFreq: baseFreq * 1.122, type: 'major' },
    { startSec: 10.5, endSec: 18.5, rootFreq: baseFreq * 1.26, type: 'minor' },
    { startSec: 18.5, endSec: 26.5, rootFreq: baseFreq * 0.84, type: 'minor' },
    { startSec: 26.5, endSec: 35.5, rootFreq: baseFreq * 0.667, type: 'major' },
    { startSec: 35.5, endSec: 48.5, rootFreq: baseFreq * 0.75, type: 'sus4' },
    { startSec: 48.5, endSec: 58.0, rootFreq: baseFreq, type: 'maj7' },
    { startSec: 58.0, endSec: durationSec, rootFreq: baseFreq, type: 'major' },
  ];

  const chords = plan?.chordSequence && plan.chordSequence.length > 0
    ? plan.chordSequence.map((c, idx, arr) => {
        const startSec = c.timeMs / 1000;
        const next = arr[idx + 1];
        const endSec = next ? next.timeMs / 1000 : durationSec;
        return {
          startSec,
          endSec,
          rootFreq: c.rootFreq || baseFreq,
          type: c.type || 'major'
        };
      })
    : defaultChords;

  const chordIntervals: Record<string, number[]> = {
    major: [1, 1.25, 1.5, 2.0],
    minor: [1, 1.2, 1.5, 2.0],
    sus4: [1, 1.333, 1.5, 2.0],
    maj7: [1, 1.25, 1.5, 1.875, 2.0]
  };

  const arpeggioStepSec = beatDurationSec * 0.5;
  const chimeIntervalSec = 3.5;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Master Envelope (Fade in and out)
    let masterEnv = 1.0;
    if (t < 2.0) {
      masterEnv = (t / 2.0) * (t / 2.0);
    } else if (t > durationSec - 3.0) {
      const remaining = durationSec - t;
      masterEnv = Math.max(0, (remaining / 3.0) * (remaining / 3.0));
    }

    // Active chord
    let activeChord = chords[chords.length - 1];
    for (let c = 0; c < chords.length; c++) {
      if (t >= chords[c].startSec && t < chords[c].endSec) {
        activeChord = chords[c];
        break;
      }
    }

    const root = activeChord.rootFreq;
    const intervals = chordIntervals[activeChord.type] || chordIntervals.major;

    // Sub bass & warm drone
    const subFreq = root * 0.5;
    const sub1 = Math.sin(2 * Math.PI * subFreq * t);
    const sub2 = Math.sin(2 * Math.PI * (subFreq * 1.004) * t);
    const subFifth = Math.sin(2 * Math.PI * (subFreq * 1.498) * t);
    const bassDrone = (sub1 * 0.16 + sub2 * 0.12 + subFifth * 0.08);

    // Orchestral pad
    let padLeft = 0;
    let padRight = 0;
    for (let v = 0; v < intervals.length; v++) {
      const f = root * intervals[v];
      const tone = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t);
      const panFactor = (v / (intervals.length - 1 || 1)) * 0.4 - 0.2;
      padLeft += tone * (0.05 - panFactor * 0.03);
      padRight += tone * (0.05 + panFactor * 0.03);
    }

    // Harp / Arpeggio layer
    const arpeggioIndex = Math.floor(t / arpeggioStepSec);
    const arpeggioTimeInStep = t - arpeggioIndex * arpeggioStepSec;
    const noteIntervalIndex = arpeggioIndex % intervals.length;
    const arpFreq = root * 2.0 * intervals[noteIntervalIndex];
    const arpDecay = Math.exp(-arpeggioTimeInStep * 5.5);
    const arpHarp = (Math.sin(2 * Math.PI * arpFreq * t) + 0.4 * Math.sin(4 * Math.PI * arpFreq * t)) * arpDecay * 0.07;
    const arpPanL = arpeggioIndex % 2 === 0 ? 1.0 : 0.4;
    const arpPanR = arpeggioIndex % 2 === 1 ? 1.0 : 0.4;

    // Celesta / Forest chimes
    const chimeIndex = Math.floor(t / chimeIntervalSec);
    const chimeTimeInStep = t - chimeIndex * chimeIntervalSec;
    const chimeDecay = Math.exp(-chimeTimeInStep * 1.8);
    const chimeFreq = root * 4.0 * (intervals[(chimeIndex * 2) % intervals.length] || 1);
    const chimeTone = (Math.sin(2 * Math.PI * chimeFreq * t) + 0.5 * Math.sin(2 * Math.PI * (chimeFreq * 2.76) * t)) * chimeDecay * 0.04;
    const chimePan = Math.sin(chimeIndex * 1.3);

    // Stereo mix with soft saturation
    let lVal = (bassDrone * 0.95 + padLeft + arpHarp * arpPanL + chimeTone * (0.5 - chimePan * 0.4)) * masterEnv;
    let rVal = (bassDrone * 1.05 + padRight + arpHarp * arpPanR + chimeTone * (0.5 + chimePan * 0.4)) * masterEnv;

    lVal = Math.tanh(lVal * 1.3);
    rVal = Math.tanh(rVal * 1.3);

    left[i] = lVal;
    right[i] = rVal;
  }

  // Encode to 16-bit PCM WAV
  const blockAlign = numChannels * 2;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    const sR = Math.max(-1, Math.min(1, right[i]));
    buffer.writeInt16LE(Math.floor(sL * 32767), offset);
    offset += 2;
    buffer.writeInt16LE(Math.floor(sR * 32767), offset);
    offset += 2;
  }

  return buffer.toString('base64');
}
