"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_EDGE = 1400;

/** Nén ảnh về JPEG data URL, cạnh dài tối đa 1400px. */
export async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function CameraCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1600 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError(
          "Không mở được camera. Hãy cho phép quyền truy cập camera, hoặc dùng nút “Tải ảnh lên”."
        );
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  function shoot() {
    const video = videoRef.current;
    if (!video) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    stop();
    onCapture(dataUrl);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">Chụp đề bài</span>
        <button
          type="button"
          onClick={() => {
            stop();
            onCancel();
          }}
          className="text-sm underline"
        >
          Đóng
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-3">
        {error ? (
          <p className="max-w-sm text-center text-sm text-white">{error}</p>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-h-full w-full rounded-xl object-contain"
          />
        )}
      </div>

      <div className="flex justify-center py-6">
        <button
          type="button"
          onClick={shoot}
          disabled={!ready || !!error}
          className="h-16 w-16 rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
          aria-label="Chụp"
        />
      </div>
    </div>
  );
}
