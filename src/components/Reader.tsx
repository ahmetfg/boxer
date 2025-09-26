import React, { useEffect, useRef, useState } from "react";

/**
 * Reader – Kamera ile QR kod okuyan React bileşeni
 *
 * Props:
 *  - onResult: (text, raw) => void        // QR metni yakalandığında çalışır
 *  - onError:  (err) => void              // Hata olduğunda (opsiyonel)
 *  - facingMode: "environment"|"user"     // Varsayılan: "environment"
 *  - continuous: boolean                  // Aynı kod tekrar geldiyse yollama. Varsayılan: true
 */
export function Reader({
  onResult,
  onError,
  facingMode = "environment",
  continuous = true,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);   // BarcodeDetector
  const scannerRef = useRef(null);    // QrScanner (fallback)
  const streamRef = useRef(null);
  const loopReqRef = useRef(null);
  const lastTextRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [usingNative, setUsingNative] = useState(false);

  // --- yardımcılar ---
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  const hasNative = async () => {
    const BD = window.BarcodeDetector;
    if (!BD) return false;
    try {
      const formats = await BD.getSupportedFormats?.();
      return formats?.includes?.("qr_code") ?? true;
    } catch {
      return true; // bazı tarayıcılarda yöntem yok ama çalışır
    }
  };

  const startCamera = async (chosenDeviceId = deviceId) => {
    stopStream();
    const constraints = {
      audio: false,
      video: chosenDeviceId
        ? { deviceId: { exact: chosenDeviceId } }
        : { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    const video = videoRef.current;
    video.srcObject = stream;
    await video.play();

    // Torch desteği
    const track = stream.getVideoTracks()[0];
    const caps = track?.getCapabilities?.() || {};
    setHasTorch(!!caps.torch);

    // Cihaz listesi
    const list = await navigator.mediaDevices.enumerateDevices();
    const cams = list.filter((d) => d.kind === "videoinput");
    setDevices(cams);
    if (!chosenDeviceId && cams.length) {
      const settings = track.getSettings?.() || {};
      setDeviceId(settings.deviceId || cams[0].deviceId);
    }
    return stream;
  };

  const stopStream = () => {
    try {
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
  };

  const setTorch = async (on) => {
    try {
      const track = streamRef.current?.getVideoTracks?.()[0];
      await track?.applyConstraints?.({ advanced: [{ torch: !!on }] });
      setTorchOn(!!on);
    } catch {
      // cihaz desteklemiyorsa sessizce geç
    }
  };

  const handleHit = (text, raw) => {
    if (!text) return;
    if (!continuous && lastTextRef.current === text) return;
    lastTextRef.current = text;
    onResult?.(text, raw);
  };

  const scanLoop = async () => {
    const detector = detectorRef.current;
    const video = videoRef.current;
    if (!detector || !video || video.readyState < 2 || !running) {
      loopReqRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    try {
      const w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) {
        loopReqRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      let canvas = canvasRef.current;
      if (!canvas) {
        canvasRef.current = document.createElement("canvas");
        canvas = canvasRef.current;
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);

      const codes = await detector.detect(canvas);
      if (codes?.length) handleHit(codes[0].rawValue, codes[0]);
    } catch {
      // bazı platformlarda detect hata verebilir
    } finally {
      loopReqRef.current = requestAnimationFrame(scanLoop);
    }
  };

  const stopAll = () => {
    setRunning(false);
    if (loopReqRef.current) {
      cancelAnimationFrame(loopReqRef.current);
      loopReqRef.current = null;
    }
    try { scannerRef.current?.stop(); } catch {}
    scannerRef.current = null;
    detectorRef.current = null;
    stopStream();
  };

  // --- başlat ---
  const start = async () => {
    try {
      if (!window.isSecureContext) {
        throw new Error("Kamera erişimi için HTTPS veya http://localhost gerekir.");
      }
      const nativeOk = await hasNative();
      await startCamera();

      if (nativeOk) {
        setUsingNative(true);
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        setRunning(true);
        scanLoop();
      } else {
        setUsingNative(false);
        if (!window.QrScanner) {
          await loadScript(
            "https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.umd.min.js"
          );
        }
        // UMD sürüm global QrScanner sağlar; WORKER_PATH artık gereksiz
        scannerRef.current = new window.QrScanner(
          videoRef.current,
          (result) => handleHit(typeof result === "string" ? result : result?.data, result),
          {
            preferredCamera: facingMode === "user" ? "user" : "environment",
            highlightScanRegion: false,
          }
        );
        await scannerRef.current.start();
        setRunning(true);
      }
    } catch (err) {
      onError?.(err);
    }
  };

  // Cihaz değişiminde kamerayı yeniden başlat
  useEffect(() => {
    if (!deviceId || !running) return;
    (async () => {
      try { await startCamera(deviceId); } catch (e) { onError?.(e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  // Mount/unmount
  useEffect(() => {
    start();
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ width: "100%", background: "#000", borderRadius: 8 }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={deviceId || ""}
          onChange={(e) => setDeviceId(e.target.value)}
          style={{ padding: 6 }}
          aria-label="Kamera seç"
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || "Kamera"}
            </option>
          ))}
        </select>

        {hasTorch && (
          <button
            onClick={() => setTorch(!torchOn)}
            style={{ padding: "6px 10px", cursor: "pointer" }}
            aria-pressed={torchOn}
          >
            {torchOn ? "Feneri Kapat" : "Feneri Aç"}
          </button>
        )}

        <button
          onClick={() => {
            if (running) { stopAll(); } else { start(); }
          }}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
          {running ? "Durdur" : "Başlat"}
        </button>

        <span style={{ fontSize: 12, opacity: 0.8 }}>
          {usingNative ? "Native BarcodeDetector" : "CDN: qr-scanner"}
        </span>
      </div>
    </div>
  );
}
