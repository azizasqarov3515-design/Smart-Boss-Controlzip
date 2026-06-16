import React, { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";
import { useTranslation } from "../contexts/LanguageContext";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  onManualInput?: () => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScan, onManualInput }: BarcodeScannerModalProps) {
  const { t } = useTranslation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [torchActive, setTorchActive] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.5); // Default 1.5x for macro-like close focusing
  const [hasZoom, setHasZoom] = useState(false);
  const [resolutionInfo, setResolutionInfo] = useState<string>("1280x720");
  const [isScanned, setIsScanned] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Programmatic audio beep sound using Web Audio API
  const playBeep = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // Crisp electronic beep (1200Hz)
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Web Audio API Beep failed:", e);
    }
  };

  // Triggers device haptic feedback if supported (vibration API)
  const triggerHaptic = () => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(80); // 80ms vibration
      }
    } catch (e) {
      console.warn("Vibration failed:", e);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      return;
    }

    setIsScanned(false);
    setScanError(null);
    setHasPermission(null);
    setScanAttempts(0);
    
    // Auto start scanner
    startScanner();

    return () => {
      cleanupScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      // 1. Check camera permission and ask
      const permissionStatus = await navigator.permissions.query({ name: "camera" as any }).catch(() => null);
      
      // Initialize ZXing first with maximum sensitivity settings (TRY_HARDER)
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODABAR,
        BarcodeFormat.CODE_93,
        BarcodeFormat.DATA_MATRIX
      ]);

      const codeReader = new BrowserMultiFormatReader(hints);
      codeReaderRef.current = codeReader;

      // Find best rear camera device ID
      const devices = await BrowserMultiFormatReader.listVideoInputDevices().catch(() => []);
      let targetDeviceId: string | undefined = undefined;

      const rearDevices = devices.filter(d => 
        /back|rear|environment|main|retro|secondary|direction\s*back/i.test(d.label)
      );

      if (rearDevices.length > 0) {
        // Pick the main rear camera (often the first or last back camera)
        targetDeviceId = rearDevices[rearDevices.length - 1].deviceId;
      } else if (devices.length > 0) {
        targetDeviceId = devices[0].deviceId;
      }

      // 2. Stream initialization with Fallback chain
      let stream: MediaStream | null = null;
      const constraintsList = [
        // Ideal high quality constraints for rear scanning
        {
          video: targetDeviceId 
            ? { deviceId: { exact: targetDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } }
            : { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } }
        },
        // Compatible constraints
        {
          video: targetDeviceId
            ? { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        },
        // Basic fallback
        {
          video: { facingMode: "environment" }
        },
        // Absolute fallback
        {
          video: true
        }
      ];

      let lastError: any = null;
      for (const constraints of constraintsList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!stream) {
        throw lastError || new Error("Kamerani ochib bo'lmadi");
      }

      streamRef.current = stream;
      setHasPermission(true);

      // Attach stream to video tag
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video meta load to inspect capabilities and apply focus/zoom
        videoRef.current.onloadedmetadata = async () => {
          if (!videoRef.current) return;
          const width = videoRef.current.videoWidth;
          const height = videoRef.current.videoHeight;
          setResolutionInfo(`${width}x${height}`);
          
          try {
            await videoRef.current.play().catch(e => console.warn("Video play error:", e));
          } catch (e) {
            console.error("Autoplay failed:", e);
          }

          // Apply hardware camera constraints (autofocus, default zoom 1.5x)
          const track = streamRef.current?.getVideoTracks()[0];
          if (track) {
            const capabilities = (track as any).getCapabilities?.() || {};
            const advancedConstraints: any = {};

            // Flashlight check
            if ("torch" in capabilities) {
              setHasTorch(true);
            }

            // Zoom capability check
            if (capabilities.zoom && capabilities.zoom.min !== undefined && capabilities.zoom.max !== undefined) {
              setHasZoom(true);
              const min = capabilities.zoom.min;
              const max = capabilities.zoom.max;
              if (max > min) {
                // Apply 1.5x zoom as default to help with focus distance (8-10cm)
                const range = max - min;
                const targetZoom = min + range * 0.25; // roughly 1.5x multiplier
                advancedConstraints.zoom = targetZoom;
                setZoomLevel(1.5);
              }
            }

            // Continuous autofocus
            if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
              advancedConstraints.focusMode = "continuous";
            }

            if (Object.keys(advancedConstraints).length > 0) {
              try {
                await track.applyConstraints({ advanced: [advancedConstraints] });
              } catch (e) {
                console.warn("Advanced constraints could not be applied:", e);
              }
            }
          }
        };
      }

      // Start continuous decoding using ZXing on the video tag
      if (videoRef.current) {
        codeReader.decodeFromVideoElementContinuously(videoRef.current, (result, err) => {
          if (result) {
            const code = result.getText();
            if (code) {
              // Successfully decoded!
              setIsScanned(true);
              playBeep();
              triggerHaptic();

              // Detach camera immediately to avoid double scans
              if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
              }

              // Let the visual flash finish before callback
              setTimeout(() => {
                onScan(code);
              }, 450);
            }
          }
          if (err) {
            // Log errors silently, we expect many decoding fails on empty frames
            setScanAttempts(prev => prev + 1);
          }
        });
      }

    } catch (err: any) {
      console.error("Scanner failed to start:", err);
      setHasPermission(false);
      setScanError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? t("Kameraga kirish taqiqlangan. Brauzer sozlamalarida ruxsat bering.")
          : t("Kameraga ulanib bo'lmadi. Kamera boshqa dasturda band bo'lishi mumkin.")
      );
    }
  };

  const applyZoom = async (factor: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const capabilities = (track as any).getCapabilities?.() || {};
      if (capabilities.zoom) {
        const min = capabilities.zoom.min || 1;
        const max = capabilities.zoom.max || 1;
        if (max > min) {
          const range = max - min;
          // Linear interpolation from 1x to 2.5x
          const percent = Math.min(Math.max((factor - 1) / 1.5, 0), 1);
          const targetZoom = min + range * percent;
          await track.applyConstraints({
            advanced: [{ zoom: targetZoom } as any]
          });
          setZoomLevel(factor);
        }
      }
    } catch (e) {
      console.warn("Failed to apply zoom:", e);
    }
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const capabilities = (track as any).getCapabilities?.() || {};
      if ("torch" in capabilities) {
        const nextTorch = !torchActive;
        await track.applyConstraints({
          advanced: [{ torch: nextTorch } as any]
        });
        setTorchActive(nextTorch);
      }
    } catch (e) {
      console.warn("Failed to toggle torch:", e);
    }
  };

  const cleanupScanner = () => {
    setTorchActive(false);
    setHasTorch(false);
    setHasZoom(false);
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(8, 10, 18, 0.98)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      zIndex: 10000,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "24px 20px",
      color: "#F3F4F6",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Dynamic Keyframes injected into the page locally */}
      <style>{`
        @keyframes hud-laser {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 1; filter: drop-shadow(0 0 8px #EF4444); }
          100% { top: 0%; opacity: 0.8; }
        }
        @keyframes pulse-viewfinder {
          0% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.02); opacity: 0.4; }
          100% { transform: scale(1); opacity: 0.2; }
        }
        @keyframes scan-flash {
          0% { opacity: 0.8; background-color: #ffffff; }
          100% { opacity: 0; background-color: transparent; }
        }
      `}</style>

      {/* Header Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isScanned ? "#10B981" : "#3B82F6", boxShadow: isScanned ? "0 0 10px #10B981" : "0 0 10px #3B82F6" }}></span>
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "#FFFFFF" }}>
              {t("Shtrix-kod skanerlash")}
            </h3>
          </div>
          <span style={{ fontSize: "11px", color: "rgba(156, 163, 175, 0.7)", marginTop: "2px", letterSpacing: "0.03em" }}>
            {t("ULTRA-SENSITIVE REAL-TIME HUD")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onManualInput && (
            <button
              onClick={() => {
                cleanupScanner();
                onManualInput();
              }}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#FFFFFF",
                padding: "0 14px",
                height: "42px",
                borderRadius: "21px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: "13px",
                fontWeight: 600
              }}
              onTouchStart={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"; }}
              onTouchEnd={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
            >
              <span className="material-icons" style={{ fontSize: "18px" }}>keyboard</span>
              <span>{t("Qo'lda")}</span>
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#FFFFFF",
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onTouchStart={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"; }}
            onTouchEnd={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; }}
          >
            <span className="material-icons" style={{ fontSize: "22px" }}>close</span>
          </button>
        </div>
      </div>

      {/* Central Viewfinder and Video wrapper */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: "420px",
        height: "380px",
        alignSelf: "center",
        borderRadius: "28px",
        overflow: "hidden",
        backgroundColor: "#030712",
        border: "1.5px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(0, 0, 0, 0.6)"
      }}>
        {hasPermission === true && (
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: isScanned ? "brightness(1.3) contrast(1.1)" : "none",
              transition: "filter 0.1s ease-in-out"
            }}
          />
        )}

        {/* HUD Scanner Box frame overlay */}
        {hasPermission === true && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none"
          }}>
            {/* Darkened outer mask container */}
            <div style={{
              position: "absolute",
              width: "280px",
              height: "180px",
              borderRadius: "16px",
              boxShadow: "0 0 0 9999px rgba(3, 7, 18, 0.72)",
              zIndex: 1
            }}></div>

            {/* Target Viewfinder Frame */}
            <div style={{
              position: "relative",
              width: "280px",
              height: "180px",
              zIndex: 2,
              borderRadius: "16px",
              border: "1px solid rgba(59, 130, 246, 0.25)"
            }}>
              {/* Glowing Corner Borders */}
              <div style={{ position: "absolute", top: -2, left: -2, width: "26px", height: "26px", borderTop: "4px solid #3B82F6", borderLeft: "4px solid #3B82F6", borderTopLeftRadius: "16px", filter: "drop-shadow(0 0 5px #3B82F6)" }}></div>
              <div style={{ position: "absolute", top: -2, right: -2, width: "26px", height: "26px", borderTop: "4px solid #3B82F6", borderRight: "4px solid #3B82F6", borderTopRightRadius: "16px", filter: "drop-shadow(0 0 5px #3B82F6)" }}></div>
              <div style={{ position: "absolute", bottom: -2, left: -2, width: "26px", height: "26px", borderBottom: "4px solid #3B82F6", borderLeft: "4px solid #3B82F6", borderBottomLeftRadius: "16px", filter: "drop-shadow(0 0 5px #3B82F6)" }}></div>
              <div style={{ position: "absolute", bottom: -2, right: -2, width: "26px", height: "26px", borderBottom: "4px solid #3B82F6", borderRight: "4px solid #3B82F6", borderBottomRightRadius: "16px", filter: "drop-shadow(0 0 5px #3B82F6)" }}></div>

              {/* Pulsating Target Center Crosshairs */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `radial-gradient(circle, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
                opacity: 0.3
              }}></div>

              {/* Scanning Red Laser Line */}
              {!isScanned && (
                <div style={{
                  position: "absolute",
                  left: "6px",
                  right: "6px",
                  height: "3px",
                  backgroundColor: "#EF4444",
                  borderRadius: "2px",
                  animation: "hud-laser 2.2s ease-in-out infinite"
                }}></div>
              )}

              {/* Flash feedback overlay on scanned success */}
              {isScanned && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: "14px",
                  animation: "scan-flash 0.4s ease-out forwards",
                  zIndex: 3
                }}></div>
              )}
            </div>
          </div>
        )}

        {/* Loading / Connecting View */}
        {hasPermission === null && !scanError && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "20px"
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "3px solid rgba(59, 130, 246, 0.1)",
              borderTopColor: "#3B82F6",
              animation: "spin 1s linear infinite"
            }}></div>
            <p style={{ fontSize: "14px", color: "#9CA3AF", margin: 0, textAlign: "center" }}>
              {t("Kameraga ulanish sozlanmoqda...")}
            </p>
          </div>
        )}

        {/* Error / Access Denied View */}
        {scanError && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "32px",
            textAlign: "center"
          }}>
            <span className="material-icons" style={{ fontSize: "48px", color: "#EF4444" }}>videocam_off</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#F9FAFB", margin: 0 }}>
                {t("Kameraga kirib bo'lmadi")}
              </p>
              <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0, lineHeight: "1.4" }}>
                {scanError}
              </p>
            </div>
            <button
              onClick={startScanner}
              style={{
                marginTop: "8px",
                padding: "10px 20px",
                backgroundColor: "#3B82F6",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
              }}
            >
              {t("Qayta urinish")}
            </button>
          </div>
        )}

        {/* Keyframe Spin helper */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* Footer Details & Control Console */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        alignItems: "center",
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto"
      }}>
        {/* Helper guide instruction */}
        <div style={{ textAlign: "center" }}>
          <p style={{
            fontSize: "14px",
            color: isScanned ? "#10B981" : "#FFFFFF",
            fontWeight: 600,
            margin: 0,
            transition: "color 0.2s"
          }}>
            {isScanned ? t("Skanerlandi! Yuklanmoqda...") : t("Barkodni ramkaga to'g'rilang")}
          </p>
          <p style={{
            fontSize: "11px",
            color: "rgba(156, 163, 175, 0.6)",
            margin: "4px 0 0 0"
          }}>
            {t("Sezgirlik: Maksimal (TRY_HARDER). Masofa: 15-20 sm ushlang.")}
          </p>
        </div>

        {/* Tech diagnostics stats HUD overlay */}
        {hasPermission === true && (
          <div style={{
            width: "100%",
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "16px",
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "rgba(156, 163, 175, 0.75)",
            fontFamily: "monospace"
          }}>
            <span>HUD_RES: {resolutionInfo}</span>
            <span>ZOOM: {zoomLevel.toFixed(1)}x</span>
            <span>ENGINE: ZXING_JS</span>
            <span>DECODE_AT: {scanAttempts}</span>
          </div>
        )}

        {/* Control Console buttons */}
        {hasPermission === true && (
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", alignItems: "center", width: "100%" }}>
            
            {/* Flashlight toggle */}
            {hasTorch && (
              <button
                onClick={toggleTorch}
                style={{
                  background: torchActive ? "#3B82F6" : "rgba(255,255,255,0.08)",
                  border: torchActive ? "1px solid #60A5FA" : "1px solid rgba(255,255,255,0.12)",
                  color: "#FFFFFF",
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: torchActive ? "0 0 15px rgba(59, 130, 246, 0.4)" : "none",
                  transition: "all 0.2s"
                }}
              >
                <span className="material-icons" style={{ fontSize: "22px" }}>
                  {torchActive ? "flashlight_on" : "flashlight_off"}
                </span>
              </button>
            )}

            {/* Hardware Zoom levels */}
            {hasZoom && (
              <div style={{
                display: "flex",
                gap: "4px",
                backgroundColor: "rgba(255,255,255,0.06)",
                padding: "4px",
                borderRadius: "32px",
                border: "1px solid rgba(255,255,255,0.08)"
              }}>
                {[1.0, 1.5, 2.0, 2.5].map((factor) => (
                  <button
                    key={factor}
                    onClick={() => applyZoom(factor)}
                    style={{
                      background: zoomLevel === factor ? "#3B82F6" : "transparent",
                      border: "none",
                      color: "#FFFFFF",
                      padding: "0 12px",
                      height: "38px",
                      borderRadius: "19px",
                      fontWeight: 700,
                      fontSize: "11px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {factor.toFixed(1)}x
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
