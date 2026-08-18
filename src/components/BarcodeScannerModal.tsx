'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  Flashlight,
  RefreshCw,
  Search,
  Sparkles,
  AlertCircle,
  Volume2,
  SwitchCamera,
  Upload,
  CheckCircle2
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
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // نغمة تأكيد صوتية خفيفة عند نجاح المسح
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

  const stopCameraStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  const handleDetected = useCallback((decodedText: string) => {
    const cleanText = decodedText.trim();
    if (!cleanText || cleanText === lastScanned) return;

    setLastScanned(cleanText);
    playBeep();
    triggerHaptic();

    stopCameraStream();
    onScanSuccess(cleanText);
    onClose();
  }, [lastScanned, onScanSuccess, onClose, playBeep, triggerHaptic, stopCameraStream]);

  // تشغيل الكاميرا ومسح الباركود اللحظي
  const startCamera = useCallback(async (deviceId?: string) => {
    stopCameraStream();
    setScannerError(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('المتصفح لا يدعم الوصول للكاميرا مباشرة. يرجى استخدام زر التقاط صورة.');
      }

      // جلب قائمة الكاميرات
      let devices: MediaDeviceInfo[] = [];
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        devices = allDevices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(devices);
      } catch {}

      // تحديد أنسب إعدادات للكاميرا الخلفية
      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      // التحقق من وجود فلاش (Torch)
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = track.getCapabilities?.() as any;
          if (capabilities && 'torch' in capabilities) {
            setHasTorch(true);
          }
        } catch {}
      }

      setIsScanning(true);

      // 🔍 حلقة مسح الباركود اللحظية من الفيديو المباشر
      let detector: any = null;
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          detector = new (window as any).BarcodeDetector({
            formats: [
              'ean_13',
              'ean_8',
              'code_128',
              'code_39',
              'code_93',
              'upc_a',
              'upc_e',
              'qr_code',
              'data_matrix',
              'itf'
            ]
          });
        } catch {}
      }

      let lastCheckTime = 0;
      const scanLoop = async (time: number) => {
        if (!streamRef.current || !videoRef.current) return;

        // فحص إطار كل 80 ميلي ثانية لتوفير البطارية والأداء
        if (time - lastCheckTime >= 80 && videoRef.current.readyState >= 2) {
          lastCheckTime = time;

          // 1. فحص باستخدام BarcodeDetector الأصلي
          if (detector) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleDetected(barcodes[0].rawValue);
                return;
              }
            } catch {}
          } else {
            // 2. Fallback: استخدام html5-qrcode على كائن الفيديو إذا لم يتوفر BarcodeDetector
            try {
              const { Html5Qrcode } = await import('html5-qrcode');
              if (!canvasRef.current) {
                canvasRef.current = document.createElement('canvas');
              }
              const canvas = canvasRef.current;
              const v = videoRef.current;
              if (v.videoWidth > 0 && v.videoHeight > 0) {
                canvas.width = v.videoWidth;
                canvas.height = v.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob(async (blob) => {
                    if (blob) {
                      try {
                        const html5Qr = new Html5Qrcode('temp-hidden-scanner', false);
                        const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
                        const res = await html5Qr.scanFile(file, false);
                        if (res) {
                          handleDetected(res);
                        }
                      } catch {}
                    }
                  }, 'image/jpeg', 0.85);
                }
              }
            } catch {}
          }
        }

        animFrameRef.current = requestAnimationFrame(scanLoop);
      };

      animFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      console.warn('Camera Launch Error:', err);
      setIsScanning(false);
      const isHttp = typeof window !== 'undefined' && window.location.protocol === 'http:' && !window.location.hostname.includes('localhost');

      if (isHttp) {
        setScannerError('يتطلب المتصفح اتصالاً آمناً (HTTPS) لتشغيل الكاميرا المباشرة، أو يمكنك استخدام زر "التقاط صورة 📷" بالأسفل مباشرة.');
      } else {
        setScannerError('تعذر فتح الكاميرا المباشرة. يرجى التأكد من منح الإذن في المتصفح، أو النقر على زر "التقاط صورة 📷" بالأسفل.');
      }
    }
  }, [stopCameraStream, handleDetected]);

  // تبديل الكاميرا (Switch between available camera lenses)
  const switchCamera = () => {
    if (availableCameras.length <= 1) return;
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextIndex);
    const nextDev = availableCameras[nextIndex];
    startCamera(nextDev.deviceId);
  };

  // تشغيل / إطفاء الفلاش (Torch)
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsTorchOn(nextState);
    } catch {}
  };

  // مسح الباركود من صورة ملتقطة (Native File Capture)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFile(true);
      setScannerError(null);

      // 1. تجربة BarcodeDetector على صورة Bitmap
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window && 'createImageBitmap' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
          });
          const bitmap = await createImageBitmap(file);
          const barcodes = await detector.detect(bitmap);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleDetected(barcodes[0].rawValue);
            return;
          }
        } catch {}
      }

      // 2. Fallback: استخدام Html5Qrcode scanFile
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('temp-hidden-scanner', false);
      const decoded = await scanner.scanFile(file, true);
      if (decoded) {
        handleDetected(decoded);
      } else {
        throw new Error('No barcode');
      }
    } catch (err) {
      setScannerError('لم يتم العثور على باركود واضح في الصورة. يرجى تجربة التقاط صورة أقرب للباركود مع إضاءة جيدة أو إدخاله يدوياً.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLastScanned(null);
      setManualCode('');
      setScannerError(null);
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCameraStream();
      };
    } else {
      stopCameraStream();
    }
  }, [isOpen, startCamera, stopCameraStream]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      {/* Hidden container for background decoder */}
      <div id="temp-hidden-scanner" className="hidden" />

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
          
          {/* Real Video Preview Container */}
          <div className="w-full relative rounded-2xl overflow-hidden bg-black border border-slate-700 aspect-square max-h-[290px] flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

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
              <div className="absolute inset-0 bg-slate-950/90 p-4 text-center text-slate-200 text-xs flex flex-col items-center justify-center gap-2.5 z-10">
                <AlertCircle className="w-9 h-9 text-amber-400" />
                <p className="text-xs leading-relaxed max-w-[260px] text-slate-300">{scannerError}</p>
                
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <button
                    onClick={() => startCamera()}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    إعادة المحاولة
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-md"
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
