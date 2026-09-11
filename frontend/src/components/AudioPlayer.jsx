import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, Gauge, Download, Link2, Check } from "lucide-react";

const RATES = [0.75, 1, 1.25, 1.5, 2];

function fmt(t) {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AudioPlayer({ src, downloadName }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    // reset when a new clip arrives
    setPlaying(false);
    setCurrent(0);
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (v) => {
    const a = audioRef.current;
    if (a) a.currentTime = v;
    setCurrent(v);
  };

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const share = async () => {
    const absolute = new URL(src, window.location.origin).href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "verbel-ai audio", url: absolute });
      } else {
        await navigator.clipboard.writeText(absolute);
        setShared(true);
        setTimeout(() => setShared(false), 1500);
      }
    } catch {
      /* user cancelled share sheet — ignore */
    }
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = downloadName || "speech.mp3";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="card animate-fade-in p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Generated audio</h3>
        <div className="flex items-center gap-1.5">
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={share}>
            {shared ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            {shared ? "Copied" : "Share"}
          </button>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={download}>
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => setCurrent(e.target.currentTime)}
        onEnded={() => setPlaying(false)}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-600/30"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 pl-0.5" />}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Volume2 className="h-4 w-4 text-slate-400" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
          />
        </div>
        <button className="chip" onClick={cycleRate} title="Playback speed">
          <Gauge className="h-3.5 w-3.5" /> {rate}×
        </button>
      </div>
    </div>
  );
}
