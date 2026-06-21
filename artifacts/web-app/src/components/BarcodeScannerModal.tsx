import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useTranslation } from "../contexts/LanguageContext";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  onManualInput?: () => void; // Optional callback for legacy manual triggers
}

export function BarcodeScannerModal({ isOpen, onClose, onScan, onManualInput }: BarcodeScannerModalProps) {
  const { t } = useTranslation();
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const qrCodeScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "web-reader-element";

  const stopInitiatedRef = useRef(false);

  // Helper to safely stop the scanner once
  const safeStop = async (scanner: Html5Qrcode) => {
    if (stopInitiatedRef.current) return;
    stopInitiatedRef.current = true;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      try {
        scanner.clear();
      } catch (e) {
        console.warn("Scanner clear failed:", e);
      }
    } catch (err) {
      console.error("Scanner stop failed:", err);
    }
  };

  // Scanner life-cycle
  useEffect(() => {
    let isMounted = true;
    let scannerInstance: Html5Qrcode | null = null;

    if (!isOpen) {
      if (qrCodeScannerRef.current) {
        safeStop(qrCodeScannerRef.current);
      }
      return;
    }

    setScanned(false);
    setManualBarcode("");
    stopInitiatedRef.current = false;

    // Start scanner with DOM mount guard
    const startScanner = () => {
      const element = document.getElementById(scannerId);
      if (!element) {
        if (isMounted && isOpen) {
          setTimeout(startScanner, 30);
        }
        return;
      }

      if (!isMounted || !isOpen) return;

      const html5Qrcode = new Html5Qrcode(scannerId);
      scannerInstance = html5Qrcode;
      qrCodeScannerRef.current = html5Qrcode;

      html5Qrcode
        .start(
          { facingMode: "environment" },
          {
            fps: 20, // High frame rate for millisecond detection
            qrbox: (width, height) => {
              // Custom scanning region
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            if (isMounted) {
              handleSuccess(decodedText);
            }
          },
          () => {
            // Silence scanning frame exceptions
          }
        )
        .then(() => {
          if (isMounted) {
            setCameraPermission(true);
          }
        })
        .catch((err) => {
          console.error("Camera start error:", err);
          if (isMounted) {
            setCameraPermission(false);
          }
        });
    };

    startScanner();

    return () => {
      isMounted = false;
      qrCodeScannerRef.current = null;
      if (scannerInstance) {
        safeStop(scannerInstance);
      }
    };
  }, [isOpen]);

  const handleSuccess = (code: string) => {
    setScanned(true);
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Stop scanner on success
    if (qrCodeScannerRef.current) {
      safeStop(qrCodeScannerRef.current);
    }

    setTimeout(() => {
      onScan(code);
      setScanned(false);
    }, 400); // UI feedback delay
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
        padding: "16px",
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
        <div style={{ width: "40px" }} />
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

        {/* HUD Dark Overlays */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "calc(50% + 150px)", backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 2 }} />
        <div style={{ position: "absolute", top: "calc(50% + 150px)", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 2 }} />
        <div style={{ position: "absolute", top: "calc(50% - 150px)", left: 0, width: "calc(50% - 150px)", height: "300px", backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 2 }} />
        <div style={{ position: "absolute", top: "calc(50% - 150px)", right: 0, width: "calc(50% - 150px)", height: "300px", backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 2 }} />

        {/* Viewfinder Frame (300x300px) */}
        <div style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          zIndex: 3,
          pointerEvents: "none"
        }}>
          {/* Blue Corner corners */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "24px", height: "24px", borderTop: "4px solid #3B82F6", borderLeft: "4px solid #3B82F6", borderTopLeftRadius: "6px" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: "24px", height: "24px", borderTop: "4px solid #3B82F6", borderRight: "4px solid #3B82F6", borderTopRightRadius: "6px" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: "24px", height: "24px", borderBottom: "4px solid #3B82F6", borderLeft: "4px solid #3B82F6", borderBottomLeftRadius: "6px" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: "24px", height: "24px", borderBottom: "4px solid #3B82F6", borderRight: "4px solid #3B82F6", borderBottomRightRadius: "6px" }} />

          {/* Glowing Red laser scanning line */}
          {!scanned && (
            <div style={{
              position: "absolute",
              left: "8px",
              right: "8px",
              height: "3px",
              backgroundColor: "#3B82F6",
              boxShadow: "0 0 10px rgba(59, 130, 246, 0.8)",
              animation: "scan 2.5s linear infinite"
            }} />
          )}

          {/* Loading scan state */}
          {scanned && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              borderRadius: "8px"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                border: "4px solid white",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              <p style={{ fontSize: "14px", fontWeight: 600, color: "white", margin: 0 }}>{t("Tekshirilmoqda...")}</p>
            </div>
          )}
        </div>

        <p style={{
          position: "absolute",
          bottom: "24px",
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
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        zIndex: 10
      }}>
        <label style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>{t("Yoki qo'lda shtrix-kod kiriting:")}</label>
        <div style={{ display: "flex", gap: "12px" }}>
          <input
            type="text"
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
          100% { top: 100%; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
