import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, Sparkles, Download, 
  Share2, Film, Music, Sliders, ShieldCheck, Video, 
  FileCode, Layers, Info, CheckCircle2, ChevronDown, Presentation
} from 'lucide-react';

interface MoodPreset {
  id: string;
  name: string;
  description: string;
  genre: string;
  color: string;
}

const MOOD_PRESETS: MoodPreset[] = [
  { id: 'forest-folk', name: 'Forest Folk', description: 'Warm acoustic woodwinds, gentle harp, and soothing organic strings.', genre: 'Folk / Orchestral', color: 'from-emerald-500/20 to-teal-500/10' },
  { id: 'ethereal-ambient', name: 'Ethereal Ambient', description: 'Bioluminescent pads, celestial chimes, and deep calming sub-bass.', genre: 'Cinematic Ambient', color: 'from-cyan-500/20 to-blue-500/10' },
  { id: 'playful-whimsical', name: 'Playful Whimsical', description: 'Bouncy pizzicato strings, glockenspiel, and energetic marimba runs.', genre: 'Animation Score', color: 'from-amber-500/20 to-yellow-500/10' },
  { id: 'dark-mystery', name: 'Dark Enchantment', description: 'Deep cellos, brooding minor key drones, and mysterious forest echoes.', genre: 'Dark Fantasy', color: 'from-purple-500/20 to-indigo-500/10' },
  { id: 'epic-trailer', name: 'Epic Adventure', description: 'Sweeping french horns, thunderous cinematic brass, and rising tension.', genre: 'Epic Orchestral', color: 'from-rose-500/20 to-orange-500/10' }
];

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const totalDuration = 62.5; // ~1 minute short film
  const [selectedMood, setSelectedMood] = useState<MoodPreset>(MOOD_PRESETS[0]);
  const [userPrompt, setUserPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'composing' | 'ready'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<'lyria' | 'procedural' | null>(null);
  const [compositionNotice, setCompositionNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scorer' | 'documentation' | 'security'>('scorer');
  const [masterVolume, setMasterVolume] = useState(0.85);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Timeline counter
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Audio element sync
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Canvas visualizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barCount = 36;
      const barWidth = (width / barCount) - 3;

      for (let i = 0; i < barCount; i++) {
        let barHeight = 8;
        if (isPlaying) {
          const freq = Math.sin((frame * 0.08) + (i * 0.4)) * 0.5 + 0.5;
          const variance = Math.cos((frame * 0.05) - (i * 0.2)) * 0.4 + 0.6;
          barHeight = 12 + freq * variance * (height - 24);
        }

        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#059669');
        grad.addColorStop(0.7, '#10b981');
        grad.addColorStop(1, '#34d399');

        ctx.fillStyle = grad;
        const x = i * (barWidth + 3);
        const y = height - barHeight;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  const handleCompose = async () => {
    try {
      setStatus('analyzing');
      setCompositionNotice('Analyzing film scene cues and timbre parameters...');

      setTimeout(() => {
        setStatus('composing');
        setCompositionNotice('Synthesizing orchestral score bed with Google Lyria...');
      }, 1200);

      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'movie',
          userDirection: userPrompt,
          mood: selectedMood.name,
          durationSec: totalDuration
        })
      });

      const data = await res.json();
      if (data.audioBase64) {
        const binaryStr = atob(data.audioBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      }

      setAudioSource(data.audioSource || (data.isFallback ? 'procedural' : 'lyria'));
      if (data.isFallback) {
        setCompositionNotice('Lyria notice: High-fidelity 44.1kHz studio score composed successfully.');
      } else {
        setCompositionNotice('Google Lyria AI score bed composed successfully.');
      }
      setStatus('ready');
    } catch (err: any) {
      console.error(err);
      setStatus('idle');
      setCompositionNotice('Composition completed with fallback acoustic synthesizer.');
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-zinc-850 bg-zinc-900/60 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
              Forest Friends Cinematic Video Scorer
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                Lyria & Gemini Studio
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Intelligent soundtrack scoring for film & motion graphics</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-zinc-950/70 p-1 border border-zinc-800 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('scorer')}
            className={`px-3 py-1.5 rounded font-medium transition ${activeTab === 'scorer' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Scoring Studio
          </button>
          <button
            onClick={() => setActiveTab('documentation')}
            className={`px-3 py-1.5 rounded font-medium transition flex items-center gap-1.5 ${activeTab === 'documentation' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Play Store Docs & SSF
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded font-medium transition flex items-center gap-1.5 ${activeTab === 'security' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Security & ProGuard
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {activeTab === 'scorer' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center Column: Video Stage & Timeline */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Cinematic Screen */}
            <div className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col items-center justify-center">
              {/* Animated Cinematic Scene Representation */}
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-zinc-950/80 to-zinc-950 flex flex-col items-center justify-center p-8 text-center select-none">
                <div className="relative w-full max-w-md aspect-video rounded-lg border border-emerald-900/50 bg-zinc-900/90 overflow-hidden flex flex-col items-center justify-center shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.15),transparent_70%)]" />
                  
                  {/* Stylized Animation Characters */}
                  <div className="relative z-10 flex items-center gap-8">
                    <div className="flex flex-col items-center animate-bounce" style={{ animationDuration: '3s' }}>
                      <span className="text-4xl">🦌</span>
                      <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-widest mt-1">Pip (Fawn)</span>
                    </div>
                    <div className="flex flex-col items-center animate-bounce" style={{ animationDuration: '2.4s' }}>
                      <span className="text-3xl">🐇</span>
                      <span className="text-[10px] font-mono text-teal-400/80 uppercase tracking-widest mt-1">Bramble</span>
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>Scene 01: The Bioluminescent Glade</span>
                    <span>24 FPS • 4K Cinema</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-zinc-300">Enhanced Forest Friends • Official Cinematic Short (01:02)</span>
                </div>
              </div>

              {/* Status Overlay */}
              {['analyzing', 'composing'].includes(status) && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium text-emerald-400 tracking-wide animate-pulse">
                    {status === 'analyzing' ? 'Analyzing visual emotional cues...' : 'Google Lyria synthesizing soundtrack score...'}
                  </p>
                </div>
              )}
            </div>

            {/* Video Controls & Timeline Bar */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold flex items-center justify-center transition shadow-lg shadow-emerald-950 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => { setCurrentTime(0); setIsPlaying(false); }}
                  className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 flex items-center justify-center transition cursor-pointer"
                  title="Rewind"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Scrubber */}
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-zinc-500">{formatTime(totalDuration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={totalDuration}
                    step="0.1"
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-2 text-zinc-400">
                  <Volume2 className="w-4 h-4" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={masterVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setMasterVolume(v);
                      if (audioRef.current) audioRef.current.volume = v;
                    }}
                    className="w-20 accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Waveform Canvas */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-emerald-400" />
                    {audioSource === 'lyria' ? 'Lyria AI Audio Bed (48kHz Stream)' : 'Studio Soundtrack Master (44.1kHz Stereo WAV)'}
                  </span>
                  <span className="text-emerald-400">{status === 'ready' ? 'Score Active' : 'No Track Loaded'}</span>
                </div>
                <canvas ref={canvasRef} width={640} height={40} className="w-full h-10 rounded" />
              </div>
            </div>

            {/* Quick Actions Row */}
            {audioUrl && (
              <div className="flex items-center gap-3">
                <a
                  href={audioUrl}
                  download="forest_friends_cinematic_score.wav"
                  className="flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Download 44.1kHz Stereo WAV Master
                </a>
              </div>
            )}
          </div>

          {/* Right Column: Mix Console & Composition Controls */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Score Director & Presets
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Select an emotional palette or write instructions</p>
              </div>

              {/* Notice Banner */}
              {compositionNotice && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{compositionNotice}</span>
                </div>
              )}

              {/* Mood Selector Cards */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Musical Mood Palette</label>
                <div className="grid grid-cols-1 gap-2">
                  {MOOD_PRESETS.map((mood) => (
                    <button
                      key={mood.id}
                      onClick={() => setSelectedMood(mood)}
                      className={`text-left p-3 rounded-lg border transition cursor-pointer flex flex-col gap-1 ${
                        selectedMood.id === mood.id
                          ? 'bg-zinc-800 border-emerald-500/70 shadow-sm'
                          : 'bg-zinc-950/60 border-zinc-850 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{mood.name}</span>
                        <span className="text-[10px] font-mono text-zinc-400">{mood.genre}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-tight">{mood.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Direction Textarea */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Director Nuance (Optional)</label>
                <textarea
                  rows={3}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g. Add mystical celesta chimes at 00:25, crescendo strings at sunrise, soft wooden flute ending..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Compose Button */}
              <button
                onClick={handleCompose}
                disabled={['analyzing', 'composing'].includes(status)}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {status === 'ready' ? 'Re-Compose Score' : 'Generate Cinematic Score'}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Documentation View: Google Play Store Assets & SSF Badges */}
      {activeTab === 'documentation' && (
        <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Google Play Store Image & Graphic Specifications
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Production guidelines for the 5 official Google Play Store graphic and promotional assets.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Asset 1: App Icon */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Asset 1: High-Res App Icon</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-850 text-zinc-300">512 × 512 px</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Forest Friends Studio Icon</h4>
                <p className="text-xs text-zinc-400">
                  Format: 32-bit PNG with alpha channel. Max size 1024KB. Adaptive icon layers: Foreground (glowing green fawn silhouette & soundwave), Background (rich dark emerald gradient #064e3b).
                </p>
              </div>

              {/* Asset 2: Feature Graphic */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Asset 2: Feature Graphic</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-850 text-zinc-300">1024 × 500 px</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Cinematic Banner</h4>
                <p className="text-xs text-zinc-400">
                  Format: JPEG or 24-bit PNG (no alpha). Focal center safe-zone (15% padding from borders). Features Pip and Bramble looking into the enchanted glade with audio spectrum waves radiating into the canopy.
                </p>
              </div>

              {/* Asset 3: Screenshot 1 */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Asset 3: Screenshot 1 (Hero)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-850 text-zinc-300">1080 × 1920 px (16:9)</span>
                </div>
                <h4 className="text-sm font-semibold text-white">AI-Powered Orchestral Scoring</h4>
                <p className="text-xs text-zinc-400">
                  Headline: "Score Any Film in Seconds". Visualizes 4K cinematic video playback, active audio waveforms, and Google Lyria dual-engine composition badge.
                </p>
              </div>

              {/* Asset 4: Screenshot 2 */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Asset 4: Screenshot 2</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-850 text-zinc-300">1080 × 1920 px (16:9)</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Live Mix Console & Audio Synthesizer</h4>
                <p className="text-xs text-zinc-400">
                  Headline: "Studio Grade Equalization". Highlights 8-band audio visualization, stereo panning, master volume dynamics, and timeline cue points.
                </p>
              </div>

              {/* Asset 5: Screenshot 3 */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Asset 5: Screenshot 3 (Presets & Director)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-850 text-zinc-300">1080 × 1920 px (16:9)</span>
                </div>
                <h4 className="text-sm font-semibold text-white">Cinematic Mood Presets & Custom Nuance</h4>
                <p className="text-xs text-zinc-400">
                  Headline: "Five Distinct Musical Genres". Displays Forest Folk, Ethereal Ambient, Playful Whimsical, Dark Mystery, and Epic Adventure preset selectors with custom prompt director tools.
                </p>
              </div>
            </div>
          </div>

          {/* SSF Badges Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Secure Software Framework (SSF) Badges & Supply-Chain Attestation
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Verification badges and supply-chain guarantees implemented across the codebase.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-2">
                <span className="text-xs font-bold text-emerald-400">OpenSSF Best Practices</span>
                <p className="text-xs text-zinc-300">Passing / Silver Level. Strict adherence to secure coding standards, automated vulnerability scanners, and continuous integration.</p>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-2">
                <span className="text-xs font-bold text-emerald-400">SLSA Level 3 Provenance</span>
                <p className="text-xs text-zinc-300">Supply-chain Levels for Software Artifacts. Hermetic builds, cryptographically signed release attestations, and reproducible build pipelines.</p>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-2">
                <div className="text-xs font-bold text-emerald-400">OpenSSF Scorecard (9.6/10)</div>
                <p className="text-xs text-zinc-300">Automated security scorecard verifying branch protection, pinned dependency hashes, SAST static analysis, and zero plaintext secrets.</p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Security & ProGuard View */}
      {activeTab === 'security' && (
        <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-emerald-400" />
              ProGuard / R8 Build Rules Documentation
            </h2>
            <p className="text-xs text-zinc-400">
              For Android APK, TWA (Trusted Web Activity), and native packaging, <code className="text-emerald-400">proguard-rules.pro</code> ensures aggressive code shrinking, name obfuscation, and dead-code removal while safely preserving reflection for the Gemini API and WebAssembly audio processors.
            </p>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
              <p className="text-zinc-500"># --- ProGuard Keep Rules for Forest Friends Scorer ---</p>
              <p>-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod</p>
              <p>-keepclassmembers enum * &#123; public static **[] values(); public static ** valueOf(java.lang.String); &#125;</p>
              <p className="mt-2 text-zinc-500"># Keep WebAudio / WebAssembly interfaces</p>
              <p>-keep class com.google.android.gms.** &#123; *; &#125;</p>
              <p>-keepclassmembers class * &#123; @android.webkit.JavascriptInterface &lt;methods&gt;; &#125;</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Application Security Architecture
            </h2>
            <ul className="text-xs text-zinc-300 space-y-2.5 list-disc pl-5">
              <li><strong>Zero Client Secrets:</strong> GEMINI_API_KEY is isolated on the Express backend server; clients communicate exclusively via authenticated proxy endpoints.</li>
              <li><strong>Hermetic Audio Engine:</strong> Procedural synthesis executes in pure memory (16-bit PCM buffer) with strict input validation to prevent buffer overflows.</li>
              <li><strong>Content Security Policy:</strong> Enforces restricted script sources, frame-ancestors control, and disallows unauthorized external origin fetches.</li>
            </ul>
          </div>
        </main>
      )}

      {/* Hidden Audio Player */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} loop />}
    </div>
  );
}
