"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

interface Props {
  onDetected: (code: string) => void;
  paused?: boolean;
}

/**
 * Camera barcode scanner. Uses the native BarcodeDetector API where available
 * (Android Chrome — fast), falling back to ZXing (iOS Safari). Stays in camera
 * mode after each hit so multi-item baskets scan continuously; the same code
 * is ignored for 2s to avoid duplicate adds.
 */
export default function Scanner({ onDetected, paused = false }: Props) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastHit = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const pausedRef = useRef(paused);
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    pausedRef.current = paused;
    onDetectedRef.current = onDetected;
  }, [paused, onDetected]);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let zxingStop: (() => void) | null = null;
    let raf = 0;

    const hit = (code: string) => {
      if (pausedRef.current) return;
      const now = Date.now();
      if (code === lastHit.current.code && now - lastHit.current.at < 2000) return;
      lastHit.current = { code, at: now };
      if (navigator.vibrate) navigator.vibrate(60);
      onDetectedRef.current(code);
    };

    async function start() {
      const video = videoRef.current;
      if (!video) return;

      const hasNative = "BarcodeDetector" in window;
      try {
        if (hasNative) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 } },
            audio: false,
          });
          if (stopped) return;
          video.srcObject = stream;
          await video.play();

          /* eslint-disable @typescript-eslint/no-explicit-any */
          const Detector = (window as any).BarcodeDetector;
          const detector = new Detector({
            formats: ["ean_13", "upc_a", "code_128", "ean_8"],
          });
          const scan = async () => {
            if (stopped) return;
            try {
              if (video.readyState >= 2) {
                const codes = await detector.detect(video);
                if (codes.length) hit(codes[0].rawValue);
              }
            } catch {
              /* a single failed frame is fine */
            }
            raf = requestAnimationFrame(scan);
          };
          raf = requestAnimationFrame(scan);
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
            if (result) hit(result.getText());
          });
          if (stopped) {
            controls.stop();
            return;
          }
          zxingStop = () => controls.stop();
        }
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        setCameraError(
          name === "NotAllowedError"
            ? "Camera access is blocked. Allow it in your browser settings, or use Search instead."
            : "The camera could not be started on this device. Use Search instead."
        );
      }
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      zxingStop?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-black aspect-[4/3]">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />
      {/* aiming guide */}
      {!cameraError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-4/5 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      )}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 px-8 text-center">
          <CameraOff className="h-8 w-8 text-slate-500" />
          <p className="text-sm text-slate-300">{cameraError}</p>
        </div>
      )}
    </div>
  );
}
