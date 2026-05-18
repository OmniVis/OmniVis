"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseVoiceToTextOptions {
  /** BCP-47 language tag for recognition, e.g. "en-US", "de-DE". Default: "en-US". */
  lang?: string;
  /** Called with each finalized transcript segment. */
  onTranscript?: (text: string) => void;
  /** Called when the recognition engine reports an error. */
  onError?: (errorCode: string) => void;
}

export interface UseVoiceToTextResult {
  /** True when the Web Speech API is available in the current browser. */
  isSupported: boolean;
  /** True while the microphone is actively recording. */
  isRecording: boolean;
  /** Start microphone recording. No-op if already recording or unsupported. */
  startRecording: () => void;
  /** Stop microphone recording. */
  stopRecording: () => void;
  /**
   * Toggle recording on/off.
   * @param onInsecure — called instead of starting if the page is not served
   *   over HTTPS (Web Speech API requires a secure context in most browsers).
   */
  toggleRecording: (onInsecure?: () => void) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useVoiceToText
 *
 * Wraps the Web Speech API's SpeechRecognition interface into a React hook.
 * The recognition instance is created once on mount and reused across
 * recording sessions — no teardown/re-creation on each toggle.
 *
 * Callbacks (`onTranscript`, `onError`) are stored in refs so they can be
 * updated by the caller without re-creating the recognition instance.
 */
export function useVoiceToText(
  options: UseVoiceToTextOptions = {}
): UseVoiceToTextResult {
  const { lang = "en-US", onTranscript, onError } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Keep latest callbacks in refs so the recognition handlers never go stale
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  useEffect(() => { onTranscriptRef.current = onTranscript; });
  useEffect(() => { onErrorRef.current = onError; });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Create the recognition instance once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        onTranscriptRef.current?.(transcript);
      }
    };

    recognition.onerror = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      setIsRecording(false);
      onErrorRef.current?.(event.error as string);
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
    // `lang` is the only setup-time prop — changing it requires a new instance
  }, [lang]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch {
      // SpeechRecognition throws if called while already running — safe to ignore
    }
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(
    (onInsecure?: () => void) => {
      // Web Speech API requires HTTPS in most browsers
      if (typeof window !== "undefined" && !window.isSecureContext) {
        onInsecure?.();
        return;
      }
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    },
    [isRecording, startRecording, stopRecording]
  );

  return { isSupported, isRecording, startRecording, stopRecording, toggleRecording };
}
