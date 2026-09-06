import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Share2,
  Trash2,
  Download,
  FileText,
  Check,
  ChevronLeft,
  Sun,
  Contrast,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Send,
  X,
  Sliders,
  Sparkles
} from 'lucide-react';
import { FilterType, ScannedDocument, ScreenState } from '../types';
import { processDocumentImage, exportToA4Pdf, getShamsiDate } from '../utils/documentProcessor';

// Sample documents for instant one-click testing
const SAMPLE_DOCS = [
  {
    title: 'کارت ملی و شناسنامه (نمونه قرارداد)',
    // An SVG data-url simulating a document with text, signature, blue stamp, and light shadows
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850"><rect width="600" height="850" fill="%23f2efe9"/><rect x="25" y="25" width="550" height="800" fill="%23fcfaf5" stroke="%23dfd8cb" stroke-width="1.5"/><text x="300" y="80" font-family="sans-serif" font-size="22" font-weight="bold" fill="%23222" text-anchor="middle">جمهوری اسلامی ایران - قرارداد رسمی اداری</text><line x1="80" y1="105" x2="520" y2="105" stroke="%23333" stroke-width="2"/><text x="500" y="150" font-family="sans-serif" font-size="16" fill="%23333" text-anchor="end">شماره پرونده: ۱۴۰۵/۲۸۸۹</text><text x="500" y="190" font-family="sans-serif" font-size="16" fill="%23333" text-anchor="end">نام متقاضی: محمد علیزاده</text><text x="500" y="230" font-family="sans-serif" font-size="16" fill="%23333" text-anchor="end">کد ملی: ۰۰۱۷۸۹۴۳۲۱</text><text x="500" y="270" font-family="sans-serif" font-size="16" fill="%23333" text-anchor="end">موضوع: تایید مدارک هویتی و ثبت شرکت با مسئولیت محدود</text><rect x="60" y="320" width="480" height="220" fill="%23faf8f2" stroke="%23bbb"/><text x="480" y="360" font-family="sans-serif" font-size="14" fill="%23444" text-anchor="end">ماده ۱- کلیه شرایط مندرج در توافقنامه حاضر به امضای طرفین رسید.</text><text x="480" y="400" font-family="sans-serif" font-size="14" fill="%23444" text-anchor="end">ماده ۲- اسناد و ضمائم پیوست دارای اعتبار قانونی برابر با اصل سند می‌باشند.</text><text x="480" y="440" font-family="sans-serif" font-size="14" fill="%23444" text-anchor="end">ماده ۳- هرگونه تغییر با توافق کتبی طرفین و اخذ استعلام انجام خواهد گرفت.</text><circle cx="160" cy="650" r="55" fill="none" stroke="%231e40af" stroke-width="3.5" stroke-dasharray="8 4"/><text x="160" y="645" font-family="sans-serif" font-size="13" font-weight="bold" fill="%231e40af" text-anchor="middle">مهر رسمی ثبت اسناد</text><text x="160" y="665" font-family="sans-serif" font-size="11" fill="%231e40af" text-anchor="middle">تایید اصل مدرک</text><path d="M 380 640 Q 420 610 450 640 T 490 630" fill="none" stroke="%23111827" stroke-width="3"/><text x="440" y="680" font-family="sans-serif" font-size="13" fill="%23555" text-anchor="middle">امضای متقاضی</text><rect x="0" y="0" width="600" height="850" fill="%23000" opacity="0.04"/></svg>'
  }
];

export const AndroidSimulator: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('HOME');
  const [documents, setDocuments] = useState<ScannedDocument[]>([
    {
      id: 'demo-1',
      title: 'مدرک_اسکن_شده_قرارداد_رسمی',
      imageUri: SAMPLE_DOCS[0].url,
      dateShamsi: getShamsiDate(),
      filterApplied: 'PHOTOCOPY',
      timestamp: Date.now() - 3600000,
      fileSizeBytes: 482000
    }
  ]);

  // Current active editing state
  const [sourceImage, setSourceImage] = useState<string>(SAMPLE_DOCS[0].url);
  const [processedImage, setProcessedImage] = useState<string>(SAMPLE_DOCS[0].url);
  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1);
  const [filter, setFilter] = useState<FilterType>('PHOTOCOPY');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Camera video stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Re-process when editor / filter state changes
  useEffect(() => {
    if (!sourceImage) return;

    let isMounted = true;
    setIsProcessing(true);

    processDocumentImage(sourceImage, filter, rotation, brightness, contrast)
      .then((res) => {
        if (isMounted) {
          setProcessedImage(res);
          setIsProcessing(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setIsProcessing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sourceImage, filter, rotation, brightness, contrast]);

  // Camera stream handler
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError('دسترسی به دوربین در این مرورگر مقدور نیست یا مسدود شده است. لطفاً از گالری انتخاب فرمایید.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      stopCamera();
      setSourceImage(dataUrl);
      setRotation(0);
      setBrightness(0);
      setContrast(1);
      setFilter('PHOTOCOPY');
      setScreen('EDITOR');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSourceImage(result);
      setRotation(0);
      setBrightness(0);
      setContrast(1);
      setFilter('PHOTOCOPY');
      setScreen('EDITOR');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveToGallery = () => {
    const newDoc: ScannedDocument = {
      id: `doc-${Date.now()}`,
      title: `مدرک_اسکن_شده_${Date.now() % 10000}`,
      imageUri: processedImage,
      dateShamsi: getShamsiDate(),
      filterApplied: filter,
      timestamp: Date.now(),
      fileSizeBytes: Math.floor(processedImage.length * 0.75)
    };

    setDocuments((prev) => [newDoc, ...prev]);

    // Download image to browser
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `${newDoc.title}.jpg`;
    link.click();

    showToast('تصویر با بالاترین کیفیت در حافظه دستگاه ذخیره شد.');
  };

  const handleExportPdf = async () => {
    showToast('در حال ایجاد سند استاندارد PDF اداری...');
    try {
      const pdfUrl = await exportToA4Pdf(processedImage, `اسکن_اداری_${Date.now() % 10000}`);
      showToast('فایل PDF اداری ایجاد و ذخیره شد.');
    } catch (e) {
      console.error(e);
      showToast('خطا در تولید PDF');
    }
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showToast('سند اسکن‌شده با موفقیت حذف گردید.');
  };

  return (
    <div className="relative w-full max-w-[430px] mx-auto bg-slate-900 rounded-[44px] p-2 sm:p-3 shadow-2xl border-[8px] border-slate-800 select-none overflow-hidden flex flex-col font-['Vazirmatn',sans-serif]">
      {/* Phone Camera Notch & Speaker */}
      <div className="w-1/3 h-6 bg-slate-800 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-2xl z-30 flex items-center justify-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-700"></div>
        <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
      </div>

      {/* Screen Inner Frame (Sleek Interface #F7F9FC Canvas) */}
      <div className="relative w-full h-[740px] bg-[#F7F9FC] rounded-[34px] overflow-hidden flex flex-col pt-6 text-slate-800">
        {/* Status Bar */}
        <div className="px-6 py-1 text-[11px] text-slate-500 flex items-center justify-between border-b border-slate-200/60 bg-[#F7F9FC]/90 z-20">
          <span className="font-semibold text-slate-700">۱۴:۴۵</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold">4G+</span>
            <div className="w-5 h-2.5 border border-slate-400 rounded-xs flex items-center p-0.5">
              <div className="w-full h-full bg-blue-600 rounded-xs"></div>
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-12 left-4 right-4 z-50 bg-slate-900/95 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 backdrop-blur-sm transition-all animate-bounce">
            <Check className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. HOME SCREEN (Sleek Interface Design) */}
        {screen === 'HOME' && (
          <div className="flex-1 flex flex-col overflow-y-auto bg-[#F7F9FC] p-4 space-y-4">
            {/* Top User Greeting Bar */}
            <div className="flex justify-between items-center pt-1 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/30 text-sm">
                  م
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-800">خوش آمدید، محمد</h1>
                  <p className="text-[10px] text-slate-500">{documents[0]?.dateShamsi || 'شنبه، ۱۵ مهر ۱۴۰۲'}</p>
                </div>
              </div>
              <div className="w-8 h-8 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center text-slate-600" title="تاریخچه">
                <FileText className="w-4 h-4 text-slate-600" />
              </div>
            </div>

            {/* Sleek Gradient Hero Banner */}
            <div className="bg-gradient-to-l from-blue-600 to-blue-500 rounded-2xl p-4 text-white shadow-lg shadow-blue-200">
              <p className="text-xs opacity-90 mb-1">آماده اسکن هستید؟</p>
              <h2 className="text-base font-bold mb-3">تبدیل سریع عکس به PDF اداری</h2>
              <div className="flex gap-2">
                <div className="bg-white/20 px-3 py-1.5 rounded-lg text-[11px] font-medium">۱۰۰٪ آفلاین</div>
                <div className="bg-white/20 px-3 py-1.5 rounded-lg text-[11px] font-medium">بدون نویز</div>
              </div>
            </div>

            {/* Sleek 2-Column Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  startCamera();
                  setScreen('CAMERA');
                }}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 group hover:border-blue-300 active:scale-[0.97] transition cursor-pointer text-center"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition shadow-xs">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-700">دوربین اسکنر</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 group hover:border-blue-300 active:scale-[0.97] transition cursor-pointer text-center"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition shadow-xs">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-700">انتخاب گالری</span>
              </button>
            </div>

            {/* Quick Sample Document Pill */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">تست فوری با سند نمونه:</span>
                <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-bold">۱ کلیک</span>
              </div>
              <button
                onClick={() => {
                  setSourceImage(SAMPLE_DOCS[0].url);
                  setRotation(0);
                  setBrightness(0);
                  setContrast(1);
                  setFilter('PHOTOCOPY');
                  setScreen('EDITOR');
                }}
                className="w-full text-xs bg-blue-50/70 hover:bg-blue-100 text-blue-700 border border-blue-200/80 py-2.5 px-3 rounded-xl flex items-center justify-between cursor-pointer transition font-medium"
              >
                <span>بارگذاری نمونه رسمی «قرارداد با مهر و امضا»</span>
                <Sparkles className="w-4 h-4 text-blue-600" />
              </button>
            </div>

            {/* Recent Scans Section */}
            <div className="pt-1 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800">اسکن‌های اخیر</h3>
                <span className="text-xs text-blue-600 font-semibold">{documents.length} سند</span>
              </div>

              {documents.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs shadow-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                  هنوز سندی اسکن نشده است.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white p-3 rounded-xl flex items-center gap-3 border border-slate-100 shadow-sm hover:border-blue-200 transition"
                    >
                      <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img
                          src={doc.imageUri}
                          alt={doc.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{doc.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {doc.dateShamsi} • {doc.filterApplied === 'PHOTOCOPY' ? 'فتوکپی سیاه و سفید' : doc.filterApplied === 'COLOR_SCAN' ? 'اسکن اداری رنگی' : 'سیاه و سفید پرینتر'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSourceImage(doc.imageUri);
                            setFilter(doc.filterApplied);
                            setScreen('PREVIEW');
                          }}
                          className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg cursor-pointer transition"
                          title="مشاهده و ویرایش"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg cursor-pointer transition"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sleek Bottom Navigation Bar with Floating Action Button */}
            <div className="bg-white border-t border-slate-100 h-16 -mx-4 -mb-4 flex items-center justify-around px-4 mt-auto relative shadow-xs">
              <button
                onClick={() => setScreen('HOME')}
                className="flex flex-col items-center gap-1 text-blue-600 cursor-pointer"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold">خانه</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="text-[10px]">اسناد</span>
              </button>

              {/* Centered Floating Quick Action Button */}
              <button
                onClick={() => {
                  startCamera();
                  setScreen('CAMERA');
                }}
                className="w-12 h-12 -mt-5 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-400/50 flex items-center justify-center text-white active:scale-95 transition cursor-pointer"
                title="اسکن جدید با دوربین"
              >
                <Camera className="w-6 h-6" />
              </button>

              <button
                onClick={() => {
                  if (documents.length > 0) {
                    setSourceImage(documents[0].imageUri);
                    setFilter(documents[0].filterApplied);
                    setScreen('PREVIEW');
                  } else {
                    showToast('ابتدا سندی اسکن کنید');
                  }
                }}
                className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span className="text-[10px]">خروجی</span>
              </button>

              <button
                onClick={() => showToast('نسخه ۱.۰.۰ آماده بیلد اندروید')}
                className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span className="text-[10px]">تنظیمات</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. CAMERA SCREEN */}
        {screen === 'CAMERA' && (
          <div className="flex-1 flex flex-col bg-black relative">
            <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between text-white">
              <button
                onClick={() => {
                  stopCamera();
                  setScreen('HOME');
                }}
                className="bg-black/60 backdrop-blur-md p-2 rounded-full cursor-pointer hover:bg-black/80 transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <span className="text-xs font-semibold bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full text-slate-100">
                کادر مدرک را تنظیم کنید
              </span>
            </div>

            {/* Video Viewport */}
            <div className="flex-1 flex items-center justify-center overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Overlay */}
              <div className="absolute inset-8 border-2 border-blue-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-t-3 border-r-3 border-blue-400"></div>
                  <div className="w-5 h-5 border-t-3 border-l-3 border-blue-400"></div>
                </div>
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-b-3 border-r-3 border-blue-400"></div>
                  <div className="w-5 h-5 border-b-3 border-l-3 border-blue-400"></div>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-6 bg-slate-900/90 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-xs text-rose-300 gap-3 backdrop-blur-xs">
                  <p>{cameraError}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold cursor-pointer transition shadow-md"
                  >
                    انتخاب از فایل‌های گالری
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Capture Bar */}
            <div className="h-24 bg-slate-900 px-6 flex items-center justify-around z-20 border-t border-slate-800">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-200 cursor-pointer transition"
                title="گالری"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              {/* Shutter Button */}
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition cursor-pointer shadow-lg shadow-blue-600/30"
                title="عکس‌برداری"
              >
                <div className="w-full h-full bg-blue-600 rounded-full"></div>
              </button>

              <button
                onClick={() => {
                  stopCamera();
                  setScreen('HOME');
                }}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-200 cursor-pointer transition"
                title="انصراف"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 3. EDITOR SCREEN (Rotation & Adjustments) */}
        {screen === 'EDITOR' && (
          <div className="flex-1 flex flex-col bg-[#F7F9FC] overflow-y-auto">
            {/* Top Bar */}
            <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
              <button
                onClick={() => setScreen('HOME')}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer font-medium"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
                <span>انصراف</span>
              </button>
              <h2 className="text-xs font-bold text-slate-800">تنظیم کادر و چرخش مدرک</h2>
              <button
                onClick={() => setScreen('PREVIEW')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold cursor-pointer shadow-sm shadow-blue-400/30 transition"
              >
                مرحله بعد
              </button>
            </div>

            {/* Image Canvas Preview */}
            <div className="flex-1 min-h-[340px] bg-[#F7F9FC] p-4 flex items-center justify-center relative">
              <div className="w-full h-full max-h-[330px] bg-white rounded-2xl shadow-md border border-slate-200 flex items-center justify-center overflow-hidden p-2">
                <img
                  src={processedImage}
                  alt="تنظیم سند"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-xs rounded-2xl">
                  <div className="bg-white text-blue-600 text-xs px-3 py-2 rounded-xl flex items-center gap-2 border border-slate-200 shadow-lg">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="font-bold">بهینه‌سازی کادر...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Controls Card */}
            <div className="p-4 bg-white border-t border-slate-100 space-y-3.5 shadow-xs">
              {/* 90-degree fast rotation */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRotation((r) => (r - 90) % 360)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition border border-slate-200 font-medium"
                >
                  <RotateCcw className="w-4 h-4 text-blue-600" />
                  <span>چرخش ۹۰° چپ</span>
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition border border-slate-200 font-medium"
                >
                  <RotateCw className="w-4 h-4 text-blue-600" />
                  <span>چرخش ۹۰° راست</span>
                </button>
              </div>

              {/* Sliders: Brightness & Contrast */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    روشنایی زمینه:
                  </span>
                  <span className="font-bold text-slate-800">{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />

                <div className="flex items-center justify-between text-xs text-slate-600 font-medium pt-1">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Contrast className="w-3.5 h-3.5 text-blue-500" />
                    کنتراست خطوط:
                  </span>
                  <span className="font-bold text-slate-800">{contrast.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.8"
                  step="0.1"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />

                <button
                  onClick={() => {
                    setRotation(0);
                    setBrightness(0);
                    setContrast(1);
                  }}
                  className="w-full text-[11px] text-slate-400 hover:text-slate-600 text-left pt-1 cursor-pointer flex items-center justify-end gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>بازنشانی تنظیمات نور</span>
                </button>
              </div>

              {/* Next Step Button */}
              <button
                onClick={() => setScreen('PREVIEW')}
                className="w-full bg-gradient-to-l from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 cursor-pointer active:scale-[0.98] transition"
              >
                <span>مرحله بعد: اعمال فیلتر هوشمند فتوکپی</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 4. PREVIEW & FILTER SCREEN */}
        {screen === 'PREVIEW' && (
          <div className="flex-1 flex flex-col bg-[#F7F9FC] overflow-y-auto">
            {/* Top Bar */}
            <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
              <button
                onClick={() => setScreen('EDITOR')}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer font-medium"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
                <span>ویرایش کادر</span>
              </button>
              <h2 className="text-xs font-bold text-slate-800">پیش‌نمایش و فیلترها</h2>
              <button
                onClick={() => setScreen('HOME')}
                className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer font-medium"
              >
                صفحه اصلی
              </button>
            </div>

            {/* Document Preview Display */}
            <div className="flex-1 min-h-[290px] bg-[#F7F9FC] p-3.5 flex items-center justify-center relative">
              <div className="w-full h-full max-h-[300px] bg-white rounded-2xl shadow-md border border-slate-200 flex items-center justify-center overflow-hidden p-2">
                <img
                  src={processedImage}
                  alt="سند اسکن شده"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-xs rounded-2xl">
                  <div className="bg-white text-blue-600 text-xs px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-200 shadow-lg">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="font-bold">اعمال الگوریتم فتوکپی...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Selector Tabs */}
            <div className="p-3.5 bg-white border-t border-slate-100 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">انتخاب فیلتر بومی:</span>
                <span className="text-[11px] text-blue-600 font-semibold">پردازش بدون افت کیفیت</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'PHOTOCOPY', label: 'فتوکپی شارپ', sub: 'سفید خالص و جوهر مشکی' },
                  { id: 'COLOR_SCAN', label: 'اسکن رنگی', sub: 'حفظ رنگ مهر و عکس' },
                  { id: 'BW_PRINTER', label: 'پرینتر B&W', sub: 'صرفه‌جویی کارتریج' },
                  { id: 'ORIGINAL', label: 'اصلی', sub: 'بدون فیلتر' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id as FilterType)}
                    className={`py-2 px-1 rounded-xl text-center text-xs font-medium cursor-pointer transition border ${
                      filter === item.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-400/30'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <p className="font-bold text-[11px] leading-tight">{item.label}</p>
                  </button>
                ))}
              </div>

              {/* Filter Explanation */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                {filter === 'PHOTOCOPY' && '⚡ فتوکپی شارپ: تبدیل کاغذ خاکستری به سفید ۱۰۰٪ خالص و متن‌ها به مشکی عمیق با آستانه‌گذاری روشنایی.'}
                {filter === 'COLOR_SCAN' && '🌈 اسکن رنگی اداری: تقویت کنتراست کاغذ و همزمان حفظ و درخشان کردن رنگ مهر آبی و قرمز و عکس پرسنلی.'}
                {filter === 'BW_PRINTER' && '🖨️ پرینتر B&W: خاکستری استاندارد و یکدست، طراحی‌شده برای چاپ کاغذی بدون هدررفت جوهر.'}
                {filter === 'ORIGINAL' && '📷 تصویر اولیه: عکس ثبت‌شده توسط دوربین بدون دستکاری رنگ.'}
              </div>

              {/* Export Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* Save Image */}
                <button
                  onClick={handleSaveToGallery}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-300/40 cursor-pointer active:scale-[0.98] transition"
                >
                  <Download className="w-4 h-4" />
                  <span>ذخیره عکس در گالری با بالاترین کیفیت</span>
                </button>

                {/* Export PDF */}
                <button
                  onClick={handleExportPdf}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.98] transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>خروجی به صورت فایل PDF اداری (A4)</span>
                </button>

                {/* Share Sheet Modal Trigger */}
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="w-full bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال مستقیم در پیام‌رسان‌ها (ایتا، بله، روبیکا، تلگرام، واتساپ)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Sheet Dialog */}
        {shareModalOpen && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-800">اشتراک‌گذاری سند در پیام‌رسان‌ها</span>
                <button onClick={() => setShareModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                در اپلیکیشن اندروید، این دکمه از Intent بومی Android FileProvider استفاده کرده و فایل سند را با یک کلیک مستقیماً به پیام‌رسان مورد نظر ارسال می‌کند:
              </p>

              <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                {[
                  { name: 'ایتا', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                  { name: 'بله', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                  { name: 'روبیکا', color: 'bg-purple-50 text-purple-600 border-purple-200' },
                  { name: 'تلگرام', color: 'bg-sky-50 text-sky-600 border-sky-200' },
                  { name: 'واتساپ', color: 'bg-green-50 text-green-600 border-green-200' }
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      setShareModalOpen(false);
                      showToast(`ارسال مستقیم سند به ${item.name} آغاز شد.`);
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition font-medium ${item.color}`}
                  >
                    <Send className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShareModalOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded-xl cursor-pointer transition font-medium"
              >
                بستن
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
