'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  X,
  Flashlight,
  RefreshCw,
  Search,
  Sparkles,
  AlertCircle,
  Volume2,
  Image as ImageIcon,
  SwitchCamera,
  ShieldAlert,
  HelpCircle,
  Upload
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string) => void;
  title?: string;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'مسح باركود الدواء بكاميرا الهاتف'
}: BarcodeScannerModalProps) {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'mobile-barcode-reader-viewport';

  // نغمة تأكيد صوتية فورية
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 30, 40]);
      }
    } catch {}
  }, []);

  const handleDetected = useCallback((decodedText: string) => {
    const cleanText = decodedText.trim();
    if (!cleanText || cleanText === lastScanned) return;

    setLastScanned(cleanText);
    playBeep();
    triggerHaptic();

    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }

    onScanSuccess(cleanText);
    onClose();
  }, [lastScanned, onScanSuccess, onClose, playBeep, triggerHaptic]);

  // مسح الباركود من صورة ملتقطة بكاميرا الهاتف (Native Photo Capture Fallback)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFile(true);
      setScannerError(null);

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
          ],
          verbose: false
        });
      }

      const decoded = await scannerRef.current.scanFile(file, true);
      if (decoded) {
        handleDetected(decoded);
      }
    } catch (err) {
      setScannerError('لم يتم العثور على باركود واضح في الصورة. يرجى تجربة التقاط صورة أقرب للباركود مع إضاءة جيدة أو إدخاله يدوياً.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {}
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async (cameraIdToUse?: string) => {
    setScannerError(null);
    setIsScanning(true);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
          ],
          verbose: false
        });
      }

      // إيقاف أي بث نشط مسبقاً قبل بدء بث جديد
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop().catch(() => {});
      }

      // 1. فحص قائمة الكاميرات المتاحة
      let cameras: Array<{ id: string; label: string }> = [];
      try {
        cameras = await Html5Qrcode.getCameras();
        setAvailableCameras(cameras);
      } catch {}

      // تحديد الكاميرا الخلفية الأنسب
      let cameraConfig: any = { facingMode: 'environment' };

      if (cameraIdToUse) {
        cameraConfig = cameraIdToUse;
      } else if (cameras.length > 0) {
        const backCam = cameras.find((c) =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment') ||
          c.label.toLowerCase().includes('خلفية')
        ) || cameras[cameras.length - 1]; // الكاميرا الخلفية غالباً تكون الأخيرة

        cameraConfig = backCam.id;
        setSelectedCameraId(backCam.id);
      }

      const scanConfig = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.0
      };

      try {
        await scannerRef.current.start(
          cameraConfig,
          scanConfig,
          (decodedText) => handleDetected(decodedText),
          () => {}
        );
      } catch (startErr) {
        // Fallback: تجربة facingMode مباشرة إذا فشل معرف الكاميرا
        await scannerRef.current.start(
          { facingMode: 'environment' },
          scanConfig,
          (decodedText) => handleDetected(decodedText),
          () => {}
        );
      }

      // فحص إمكانية تشغيل الفلاش (Torch)
      try {
        const capabilities = scannerRef.current.getRunningTrackCapabilities?.() as any;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      } catch {}

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera Scanner Init Error:', err);
      setIsScanning(false);
      const isHttp = typeof window !== 'undefined' && window.location.protocol === 'http:' && !window.location.hostname.includes('localhost');
      
      if (isHttp) {
        setScannerError('يتطلب المتصفح اتصالاً آمناً (HTTPS) لفتح البث المباشر للكاميرا، أو يمكنك استخدام زر "التقاط صورة بالكاميرا" بالأسفل مباشرة.');
      } else {
        setScannerError('يرجى السماح بإذن الكاميرا في المتصفح، أو النقر على "التقاط صورة للباركود" بالأسفل.');
      }
    }
  }, [handleDetected]);

  // التبديل بين الكاميرات المتاحة
  const switchCamera = () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCam = availableCameras[nextIndex];
    setSelectedCameraId(nextCam.id);
    startScanner(nextCam.id);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }] as any
      });
      setIsTorchOn(nextState);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      setLastScanned(null);
      setManualCode('');
      setScannerError(null);
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">{title}</h3>
              <p className="text-[11px] text-emerald-100 font-medium">وجه الكاميرا نحو باركود علبة الدواء</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-4 flex flex-col items-center bg-slate-900 text-white relative">
          
          {/* Scanner Container */}
          <div className="w-full relative rounded-2xl overflow-hidden bg-black border border-slate-700 aspect-square max-h-[280px] flex items-center justify-center shadow-inner">
            <div id={scannerContainerId} className="w-full h-full object-cover" />

            {/* Laser Scanning Animation Overlay */}
            {isScanning && !scannerError && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-[82%] h-[58%] border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-pulse absolute top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] font-bold text-emerald-300 mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm border border-emerald-500/30">
                  ضع الباركود داخل الإطار الأخضر
                </span>
              </div>
            )}

            {/* Error / Fallback State */}
            {scannerError && (
              <div className="p-4 text-center text-slate-200 text-xs flex flex-col items-center gap-2.5 z-10">
                <AlertCircle className="w-9 h-9 text-amber-400" />
                <p className="text-xs leading-relaxed max-w-[260px] text-slate-300">{scannerError}</p>
                
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <button
                    onClick={() => startScanner()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    إعادة المحاولة
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    التقاط صورة بالكاميرا 📷
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hidden Native File Capture Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />

          {/* Action Bar (Flip Camera / Flashlight / Native Photo Capture) */}
          <div className="w-full flex items-center justify-between mt-3 px-1 text-xs">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isProcessingFile ? 'جاري التحليل...' : 'التقاط صورة 📷'}</span>
            </button>

            <div className="flex items-center gap-2">
              {availableCameras.length > 1 && (
                <button
                  onClick={switchCamera}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all cursor-pointer"
                  title="تبديل الكاميرا"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}

              {hasTorch && (
                <button
                  onClick={toggleTorch}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isTorchOn
                      ? 'bg-amber-400 text-amber-950 shadow-lg shadow-amber-400/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <Flashlight className="w-3.5 h-3.5" />
                  <span>{isTorchOn ? 'إطفاء' : 'فلاش'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Manual Barcode / Code Search Fallback */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            أو اكتب رقم الباركود / كود الصنف يدوياً:
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualCode.trim()) {
                    handleDetected(manualCode.trim());
                  }
                }}
                placeholder="مثال: 628108600... أو اسم الدواء"
                className="w-full h-11 bg-white border border-slate-300 rounded-xl pr-9 pl-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              onClick={() => {
                if (manualCode.trim()) {
                  handleDetected(manualCode.trim());
                }
              }}
              disabled={!manualCode.trim()}
              className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/20 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>عرض</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
