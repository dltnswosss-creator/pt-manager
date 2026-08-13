const SKIP_COMPRESSION_BELOW = 15 * 1024 * 1024; // 이 이하 용량은 압축해도 체감 이득이 적어 건너뜀
const MAX_DIMENSION = 960; // 폼 체크용이므로 이 정도 해상도면 충분
const TARGET_FPS = 24;
const TARGET_BITRATE = 2_000_000; // 2Mbps

const CANDIDATE_MIME_TYPES = [
  "video/mp4;codecs=avc1",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return CANDIDATE_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

function transcode(file: File, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;";
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    document.body.appendChild(video);

    const canvas = document.createElement("canvas");
    let rafId = 0;
    let watchdog: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      clearTimeout(watchdog);
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadedmetadata = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
      const height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { cleanup(); reject(new Error("canvas context unavailable")); return; }

      const stream = canvas.captureStream(TARGET_FPS);
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: TARGET_BITRATE });
      } catch (err) {
        cleanup(); reject(err); return;
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onerror = () => { cleanup(); reject(new Error("recorder error")); };
      recorder.onstop = () => {
        cleanup();
        resolve(new Blob(chunks, { type: mimeType }));
      };

      const drawFrame = () => {
        ctx.drawImage(video, 0, 0, width, height);
        rafId = requestAnimationFrame(drawFrame);
      };

      video.onended = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };

      // onended이 안 불릴 경우를 대비한 안전장치 (영상 길이 + 여유시간)
      watchdog = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, (Number.isFinite(video.duration) ? video.duration : 60) * 1000 + 20000);

      recorder.start();
      video.play().then(drawFrame).catch((err) => { cleanup(); reject(err); });
    };

    video.onerror = () => { cleanup(); reject(new Error("video load error")); };
  });
}

// PT 폼 체크 영상은 음성이 필요 없고 고해상도일 필요도 없어서,
// 업로드 전에 해상도를 낮추고 오디오를 제거해 전송량을 줄인다.
// 압축이 실패하거나 지원되지 않는 브라우저면 원본 그대로 업로드한다 (항상 안전한 폴백).
export async function maybeCompressVideo(file: File): Promise<{ blob: Blob | File; fileName: string }> {
  if (file.size < SKIP_COMPRESSION_BELOW) return { blob: file, fileName: file.name };
  if (typeof HTMLCanvasElement === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
    return { blob: file, fileName: file.name };
  }
  const mimeType = pickMimeType();
  if (!mimeType) return { blob: file, fileName: file.name };

  try {
    const blob = await transcode(file, mimeType);
    if (!blob.size || blob.size >= file.size) return { blob: file, fileName: file.name };
    const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    return { blob, fileName: `compressed.${ext}` };
  } catch {
    return { blob: file, fileName: file.name };
  }
}
