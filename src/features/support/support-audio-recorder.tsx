"use client";

import { LoaderCircle, Mic, Pause, Play, SendHorizontal, Square, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { SupportAudioPlayer } from "@/features/support/support-audio-player";

type AudioRecorderState = "idle" | "paused" | "preview" | "recording";

type OpusRecorder = {
  ondataavailable: (data: Uint8Array) => void;
  onpause: () => void;
  onresume: () => void;
  onstop: () => void;
  pause: () => Promise<void>;
  resume: () => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

type OpusRecorderConstructor = new (options: {
  encoderApplication: number;
  encoderBitRate: number;
  encoderPath: string;
  numberOfChannels: number;
}) => OpusRecorder;

declare global {
  interface Window {
    Recorder?: OpusRecorderConstructor;
  }
}

let opusRecorderPromise: Promise<OpusRecorderConstructor> | null = null;

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function loadOpusRecorder() {
  if (window.Recorder) return Promise.resolve(window.Recorder);
  if (opusRecorderPromise) return opusRecorderPromise;

  opusRecorderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.onerror = () => reject(new Error("ogg_encoder_unavailable"));
    script.onload = () => window.Recorder
      ? resolve(window.Recorder)
      : reject(new Error("ogg_encoder_unavailable"));
    script.src = "/vendor/opus-recorder/recorder.min.js";
    document.head.append(script);
  });
  return opusRecorderPromise.catch((error: unknown) => {
    opusRecorderPromise = null;
    throw error;
  });
}

export function SupportAudioRecorder({ disabled, onSend, onStateChange, showTrigger = true }: {
  disabled?: boolean;
  onSend: (file: File) => Promise<void>;
  onStateChange?: (state: AudioRecorderState) => void;
  showTrigger?: boolean;
}) {
  const recorderRef = useRef<OpusRecorder | null>(null);
  const discardOnStopRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const previewUrl = useMemo(() => preview ? URL.createObjectURL(preview) : null, [preview]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (!recording || paused) return;
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [paused, recording]);

  useEffect(() => {
    onStateChange?.(recording ? paused ? "paused" : "recording" : preview ? "preview" : "idle");
  }, [onStateChange, paused, preview, recording]);

  useEffect(() => () => { void recorderRef.current?.stop(); }, []);

  async function start() {
    if (disabled || recording) return;
    setError(null);
    try {
      const Recorder = await loadOpusRecorder();
      const recorder = new Recorder({
        encoderApplication: 2048,
        encoderBitRate: 24_000,
        encoderPath: "/vendor/opus-recorder/encoderWorker.min.js",
        numberOfChannels: 1,
      });
      let encodedAudio: Uint8Array | null = null;
      recorder.ondataavailable = (data) => { encodedAudio = data; };
      recorder.onpause = () => setPaused(true);
      recorder.onresume = () => setPaused(false);
      recorder.onstop = () => {
        recorderRef.current = null;
        setRecording(false);
        setPaused(false);
        if (!discardOnStopRef.current && encodedAudio?.byteLength) {
          setPreview(new File([encodedAudio], `audio-${Date.now()}.ogg`, { type: "audio/ogg" }));
        }
        discardOnStopRef.current = false;
      };
      recorderRef.current = recorder;
      setSeconds(0);
      await recorder.start();
      setRecording(true);
    } catch (caught) {
      recorderRef.current = null;
      setError(caught instanceof Error && caught.message === "ogg_encoder_unavailable"
        ? "Não foi possível carregar o codificador OGG. Tente novamente."
        : "Microfone indisponível. Verifique a permissão do navegador.");
    }
  }

  async function togglePause() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (paused) recorder.resume();
    else await recorder.pause();
  }

  function stop(discard = false) {
    const recorder = recorderRef.current;
    if (!recorder) return;
    discardOnStopRef.current = discard;
    void recorder.stop();
  }

  async function sendPreview() {
    if (!preview || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(preview);
      setPreview(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível enviar o áudio.");
    } finally {
      setSending(false);
    }
  }

  if (recording) return <div className="flex flex-1 items-center justify-between gap-2 rounded-[var(--radius-control)] border border-danger/30 bg-danger/10 px-2 py-1 text-xs text-danger"><div className="flex items-center gap-2"><span className="size-2 animate-pulse rounded-full bg-danger motion-reduce:animate-none" />{paused ? "Pausado" : "Gravando"} <span className="font-mono">{formatDuration(seconds)}</span></div><div className="flex items-center gap-1"><IconButton label="Cancelar gravação" onClick={() => stop(true)} size="sm" type="button" variant="ghost"><Trash2 className="size-3.5" /></IconButton><IconButton label={paused ? "Retomar gravação" : "Pausar gravação"} onClick={() => void togglePause()} size="sm" type="button" variant="ghost">{paused ? <Play className="size-3.5 fill-current" /> : <Pause className="size-3.5 fill-current" />}</IconButton><IconButton label="Concluir gravação" onClick={() => stop()} size="sm" type="button" variant="ghost"><Square className="size-3.5 fill-current" /></IconButton></div></div>;
  if (preview) return <div className="flex w-fit max-w-full items-center gap-2 rounded-[var(--radius-control)] border border-primary/25 bg-sidebar-active/45 px-2 py-1.5">{previewUrl ? <SupportAudioPlayer src={previewUrl} /> : null}<IconButton disabled={sending} label="Descartar áudio" onClick={() => { setError(null); setPreview(null); }} size="sm" type="button" variant="ghost"><Trash2 className="size-3.5" /></IconButton><IconButton className="size-9" disabled={sending} label="Enviar áudio" onClick={() => void sendPreview()} size="sm" type="button"><span className="sr-only">Enviar áudio</span>{sending ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" /> : <SendHorizontal className="size-3.5" />}</IconButton>{error ? <span className="hidden max-w-48 text-[10px] leading-4 text-danger sm:block">{error}</span> : null}</div>;
  return <div className="flex flex-col items-end">{showTrigger ? <IconButton className="size-9" disabled={disabled} label="Gravar áudio" onClick={() => void start()} size="sm" type="button"><Mic className="size-4" /></IconButton> : null}{error ? <span className="mt-1 max-w-48 text-right text-[10px] leading-4 text-danger">{error}</span> : null}</div>;
}
