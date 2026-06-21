import React, { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useTranslation } from "../contexts/LanguageContext";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  onManualInput?: () => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScan, onManualInput }: BarcodeScannerModalProps) {
  const { t } = useTranslation();
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const qrCodeScannerRef = useRef<Html5Qrcode | null>(null);
  const stopInitiatedRef = useRef(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const scannerId = "web-reader-element";

  // Helper: safely stop scanner once
  const safeStop = useCallback(async (scanner: Html5Qrcode) => {
    if (stopInitiatedRef.current) return;
    stopInitiatedRef.current = true;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      try { scanner.clear(); } catch (_) { /* ignore */ }
    } catch (err) {
      console.error("Scanner stop failed:", err);
    }
  }, []);

  // Helper: apply focus and camera quality constraints after stream starts
  const applyAdvancedCameraConstraints = useCallback(async () => {
    try {
      // Get the video element that html5-qrcode creates inside the container
      const container = document.getElementById(scannerId);
      if (!container) return;
      const video = container.querySelector("video");
      if (!video || !video.srcObject) return;

      const stream = video.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      videoTrackRef.current = track;

      // Read current capabilities
      const capabilities = track.getCapabilities?.() as any;
      if (!capabilities) return;

      const advancedConstraints: any = {};

      // 1. FOCUS: Enable continuous autofocus if supported
      if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
        advancedConstraints.focusMode = "continuous";
      } else if (capabilities.focusMode && capabilities.focusMode.includes("auto")) {
        advancedConstraints.focusMode = "auto";
      }

      // 2. ZOOM: Set minimum zoom (1x) for sharpest image
      // Some phones default to a wide zoom that makes barcodes small
      if (capabilities.zoom) {
        advancedConstraints.zoom = capabilities.zoom.min || 1;
      }

      // 3. TORCH: Check if flashlight is supported
      if (capabilities.torch !== undefined) {
        setTorchSupported(true);
      }

      // 4. RESOLUTION: Request the highest available resolution
      if (capabilities.width && capabilities.height) {
        advancedConstraints.width = { ideal: Math.min(capabilities.width.max || 1920, 1920) };
        advancedConstraints.height = { ideal: Math.min(capabilities.height.max || 1080, 1080) };
      }

      // Apply all constraints at once
      if (Object.keys(advancedConstraints).length > 0) {
        await track.applyConstraints({ advanced: [advancedConstraints] } as any);
      }

      console.log("Camera advanced constraints applied:", advancedConstraints);
    } catch (err) {
      console.warn("Could not apply advanced camera constraints:", err);
    }
  }, []);

  // Toggle flashlight
  const toggleTorch = useCallback(async () => {
    try {
      const track = videoTrackRef.current;
      if (!track) return;
      const newTorchState = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: newTorchState } as any] });
      setTorchOn(newTorchState);
    } catch (err) {
      console.warn("Torch toggle failed:", err);
    }
  }, [torchOn]);

  // Scanner life-cycle
  useEffect(() => {
    let isMounted = true;
    let scannerInstance: Html5Qrcode | null = null;

    if (!isOpen) {
      if (qrCodeScannerRef.current) {
        safeStop(qrCodeScannerRef.current);
      }
      videoTrackRef.current = null;
      setTorchOn(false);
      setTorchSupported(false);
      return;
    }

    setScanned(false);
    setManualBarcode("");
    stopInitiatedRef.current = false;

    const startScanner = () => {
      const element = document.getElementById(scannerId);
      if (!element) {
        if (isMounted && isOpen) {
          setTimeout(startScanner, 30);
        }
        return;
      }

      if (!isMounted || !isOpen) return;

      const html5Qrcode = new Html5Qrcode(scannerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ]
      });
      scannerInstance = html5Qrcode;
      qrCodeScannerRef.current = html5Qrcode;

      html5Qrcode
        .start(
          {
            facingMode: { exact: "environment" },
          },
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // Rectangular scan box optimized for barcodes (wider than tall)
              const w = Math.min(viewfinderWidth, 320);
              const h = Math.min(viewfinderHeight, 200);
              return { width: w, height: h };
            },
            aspectRatio: 16 / 9,
            // Request high resolution from the camera
            videoConstraints: {
              facingMode: { exact: "environment" },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              advanced: [{ focusMode: "continuous" }, { focusMode: "auto" }]
            } as any,
          } as any,
          (decodedText) => {
            if (isMounted) {
              handleSuccess(decodedText);
            }
          },
          () => {
            // Silence per-frame scan errors
          }
        )
        .then(async () => {
          if (isMounted) {
            setCameraPermission(true);
            // Wait a short moment for the video to stabilize, then apply focus constraints
            await new Promise((r) => setTimeout(r, 500));
            if (isMounted) {
              await applyAdvancedCameraConstraints();
            }
          }
        })
        .catch((err) => {
          console.error("Camera start error:", err);
          // Fallback: try without exact facingMode (for devices that don't support it)
          if (isMounted) {
            html5Qrcode
              .start(
                { facingMode: "environment" },
                {
                  fps: 15,
                  qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                    const w = Math.min(viewfinderWidth, 320);
                    const h = Math.min(viewfinderHeight, 200);
                    return { width: w, height: h };
                  },
                  videoConstraints: {
                    facingMode: "environment",
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    advanced: [{ focusMode: "continuous" }, { focusMode: "auto" }]
                  } as any,
                },
                (decodedText) => {
                  if (isMounted) {
                    handleSuccess(decodedText);
                  }
                },
                () => {}
              )
              .then(async () => {
                if (isMounted) {
                  setCameraPermission(true);
                  await new Promise((r) => setTimeout(r, 500));
                  if (isMounted) {
                    await applyAdvancedCameraConstraints();
                  }
                }
              })
              .catch((err2) => {
                console.error("Camera fallback start error:", err2);
                if (isMounted) {
                  setCameraPermission(false);
                }
              });
          }
        });
    };

    startScanner();

    return () => {
      isMounted = false;
      qrCodeScannerRef.current = null;
      videoTrackRef.current = null;
      if (scannerInstance) {
        safeStop(scannerInstance);
      }
    };
  }, [isOpen, safeStop, applyAdvancedCameraConstraints]);

  const handleSuccess = (code: string) => {
    setScanned(true);
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    if (qrCodeScannerRef.current) {
      safeStop(qrCodeScannerRef.current);
    }

    setTimeout(() => {
      onScan(code);
      setScanned(false);
    }, 400);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualBarcode.trim();
    if (!code) return;
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    if (qrCodeScannerRef.current) {
      safeStop(qrCodeScannerRef.current);
    }

    onScan(code);
    setManualBarcode("");
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "black",
      color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        borderBottom: "1px solid #1F2937",
        zIndex: 10
      }}>
        <button
          onClick={onClose}
          style={{
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "none",
            color: "white",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onTouchStart={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)"}
          onTouchEnd={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
        >
          <svg style={{ width: "24px", height: "24px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>{t("Barcode skaner")}</h2>
        {/* Torch toggle button */}
        {torchSupported ? (
          <button
            onClick={toggleTorch}
            style={{
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              backgroundColor: torchOn ? "#FBBF24" : "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: torchOn ? "#1A1A2E" : "white",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <svg style={{ width: "22px", height: "22px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        ) : (
          <div style={{ width: "40px" }} />
        )}
      </div>

      {/* Camera Viewfinder and Overlay HUD */}
      <div style={{
        position: "relative",
        flex: 1,
        backgroundColor: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden"
      }}>
        {/* Container for html5-qrcode video */}
        <div id={scannerId} style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover"
        }} />

        {/* HUD Dark Overlays — rectangular, barcode optimized */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(50% + 100px)", backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 2 }} />
        <div style={{ position: "absolute", top: "calc(50% + 100px)", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 2 }} />
        <div style={{ position: "absolute", top: "calc(50% - 100px)", left: 0, width: "calc(50% - 160px)", height: "200px", backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 2 }} />
        <div style={{ position: "absolute", top: "calc(50% - 100px)", right: 0, width: "calc(50% - 160px)", height: "200px", backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 2 }} />

        {/* Viewfinder Frame (320x200px — rectangular, barcode optimized) */}
        <div style={{
          position: "absolute",
          width: "320px",
          height: "200px",
          zIndex: 3,
          pointerEvents: "none"
        }}>
          {/* Blue corner borders */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "28px", height: "28px", borderTop: "4px solid #3B82F6", borderLeft: "4px solid #3B82F6", borderTopLeftRadius: "8px" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: "28px", height: "28px", borderTop: "4px solid #3B82F6", borderRight: "4px solid #3B82F6", borderTopRightRadius: "8px" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: "28px", height: "28px", borderBottom: "4px solid #3B82F6", borderLeft: "4px solid #3B82F6", borderBottomLeftRadius: "8px" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: "28px", height: "28px", borderBottom: "4px solid #3B82F6", borderRight: "4px solid #3B82F6", borderBottomRightRadius: "8px" }} />

          {/* Animated scan line */}
          {!scanned && (
            <div style={{
              position: "absolute",
              left: "10px",
              right: "10px",
              height: "3px",
              backgroundColor: "#3B82F6",
              boxShadow: "0 0 12px rgba(59, 130, 246, 0.9), 0 0 4px rgba(59, 130, 246, 0.6)",
              animation: "scan 2s ease-in-out infinite"
            }} />
          )}

          {/* Scanned success overlay */}
          {scanned && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(16, 185, 129, 0.25)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              borderRadius: "8px",
              border: "3px solid #10B981"
            }}>
              <svg style={{ width: "40px", height: "40px", color: "#10B981" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "white", margin: 0 }}>{t("Topildi!")}</p>
            </div>
          )}
        </div>

        {/* Help text */}
        <p style={{
          position: "absolute",
          bottom: "20px",
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: "14px",
          zIndex: 10,
          padding: "0 16px",
          margin: 0
        }}>
          {t("Shtrix-kodni ramka ichiga to'g'rilang")}
        </p>

        {/* Camera Access Blocked alert */}
        {cameraPermission === false && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#111827",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            gap: "16px",
            zIndex: 20
          }}>
            <svg style={{ width: "64px", height: "64px", color: "#EF4444" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>{t("Kamera ruxsati berilmagan")}</h3>
            <p style={{ color: "#9CA3AF", fontSize: "14px", maxWidth: "320px", margin: 0, lineHeight: "1.4" }}>
              {t("Brauzeringizda ushbu sayt uchun kamera ruxsatini yoqing va sahifani yangilang.")}
            </p>
          </div>
        )}
      </div>

      {/* Manual Input form */}
      <form onSubmit={handleManualSubmit} style={{
        backgroundColor: "#111827",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 10
      }}>
        <label style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>{t("Yoki qo'lda shtrix-kod kiriting:")}</label>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            inputMode="numeric"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder={t("Shtrix-kod yoki ID...")}
            style={{
              flex: 1,
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "12px",
              padding: "12px 16px",
              color: "white",
              outline: "none",
              transition: "all 0.2s",
              fontSize: "16px"
            }}
          />
          <button
            type="submit"
            disabled={!manualBarcode.trim()}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: manualBarcode.trim() ? "pointer" : "not-allowed",
              backgroundColor: manualBarcode.trim() ? "#2563EB" : "#374151",
              transition: "all 0.2s"
            }}
          >
            <svg style={{ width: "24px", height: "24px", color: "white" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>{t("Do'kon mahsuloti ID raqamini ham kiritsangiz bo'ladi.")}</p>
      </form>

      {/* Styles for animations */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: calc(100% - 3px); }
          100% { top: 0%; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        #${scannerId} video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}
