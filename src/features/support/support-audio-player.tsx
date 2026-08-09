"use client";

import { LoaderCircle, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import { IconButton } from "@/components/ui/icon-button";

const waveHeights = [28, 42, 66, 36, 78, 52, 34, 62, 44, 88, 48, 32, 70, 54, 40, 82, 36, 58, 74, 46, 32, 64, 50, 84, 42, 68, 38, 56, 76, 44, 62, 34, 86, 52, 40, 72, 48, 30, 66, 54];

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export function SupportAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const progress = duration ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadAudio() {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error("audio_fetch_failed");
        objectUrl = URL.createObjectURL(await response.blob());
        if (!cancelled) {
          setSourceError(false);
          setSource(objectUrl);
        }
      } catch {
        if (!cancelled) setSourceError(true);
      }
    }

    void loadAudio();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function seek(value: string) {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(value);
    audio.currentTime = next;
    setCurrentTime(next);
  }

  function seekFromPointer(event: PointerEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!audio || !duration || !rect.width) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const next = ratio * duration;
    audio.currentTime = next;
    setCurrentTime(next);
  }

  return <div className="flex min-w-[244px] items-center gap-2.5 rounded-xl border border-panel-border bg-black/20 px-2.5 py-2">
    <audio
      onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
      onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      onPause={() => setPlaying(false)}
      onPlay={() => setPlaying(true)}
      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      preload="metadata"
      ref={audioRef}
      src={source ?? undefined}
    />
    <IconButton disabled={!source} label={sourceError ? "Áudio indisponível" : playing ? "Pausar áudio" : "Reproduzir áudio"} onClick={togglePlayback} size="sm" variant="ghost">
      {!source && !sourceError ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
    </IconButton>
    <div className="min-w-0 flex-1">
      <div className="relative h-7">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 flex h-5 -translate-y-1/2 items-center gap-px overflow-hidden">
          {waveHeights.map((height, index) => <span className={index / waveHeights.length * 100 <= progress ? "flex-1 bg-primary" : "flex-1 bg-muted/40"} key={index} style={{ height: `${height}%` }} />)}
        </div>
        <input aria-label="Posição do áudio" className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0" max={duration || 0} min="0" onChange={(event) => seek(event.target.value)} onPointerDown={seekFromPointer} onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && seekFromPointer(event)} step="0.01" type="range" value={Math.min(currentTime, duration || 0)} />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted"><span>{formatAudioTime(currentTime)}</span><span>{formatAudioTime(duration)}</span></div>
    </div>
    <Volume2 className="size-3.5 shrink-0 text-muted" />
  </div>;
}
