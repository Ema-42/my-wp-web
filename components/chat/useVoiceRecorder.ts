import { useCallback, useEffect, useRef, useState } from "react";
import type Recorder from "opus-recorder";

export type VoiceRecording = {
  blob: Blob;
  url: string;
  seconds: number;
};

type RecorderState = "idle" | "recording" | "preview";

const ENCODER_PATH = "/opus/encoderWorker.min.js";

/**
 * Records microphone audio directly to Ogg/Opus (via opus-recorder's WASM
 * encoder) — the only audio format WhatsApp renders as a native voice-note
 * bubble. The browser's own MediaRecorder only outputs WebM/Opus, which
 * Meta's API rejects for voice messages.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<VoiceRecording | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<Recorder | null>(null);
  const chunksRef = useRef<Uint8Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const cancelledRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const discard = useCallback(() => {
    if (recording) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setSeconds(0);
    setState("idle");
  }, [recording]);

  const start = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    cancelledRef.current = false;
    try {
      const { default: RecorderCtor } = await import("opus-recorder");
      const recorder = new RecorderCtor({
        encoderPath: ENCODER_PATH,
        numberOfChannels: 1,
        streamPages: false,
      });

      recorder.ondataavailable = (typedArray: Uint8Array) => {
        if (cancelledRef.current) return;
        chunksRef.current.push(typedArray);
        const blob = new Blob(chunksRef.current.map((c) => new Uint8Array(c)), {
          type: "audio/ogg",
        });
        const url = URL.createObjectURL(blob);
        setRecording((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return { blob, url, seconds: secondsRef.current };
        });
      };

      recorderRef.current = recorder;
      await recorder.start();
      setState("recording");
      setSeconds(0);
      secondsRef.current = 0;
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch {
      setError(
        "No se pudo acceder al micrófono. Revisa los permisos del navegador."
      );
      setState("idle");
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    recorderRef.current?.stop();
    setState("preview");
  }, [clearTimer]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    recorderRef.current?.stop();
    recorderRef.current = null;
    discard();
  }, [clearTimer, discard]);

  useEffect(() => {
    return () => {
      clearTimer();
      recorderRef.current?.close();
      if (recording) URL.revokeObjectURL(recording.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, seconds, recording, error, start, stop, cancel, discard };
}
