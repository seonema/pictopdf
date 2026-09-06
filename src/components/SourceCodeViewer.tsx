import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  FolderTree,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Code2
} from 'lucide-react';
import { ANDROID_FILES, AndroidFileRecord, downloadAndroidProjectZip } from '../androidSources';

export const SourceCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<AndroidFileRecord>(ANDROID_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadAndroidProjectZip();
    } catch (e) {
      console.error(e);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner with 1-Click ZIP Download */}
      <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-900 border border-blue-800/60 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
              ساختار ۱۰۰٪ استاندارد گریدل اندروید
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
              کاتلین و جت‌پک کامپوز
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">پروژه بومی «اسکنر و فتوکپی هوشمند مدارک»</h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            تمام فایل‌های پروژه با معماری تمیز (Clean Architecture) در پوشه <code className="text-blue-300 bg-slate-950 px-1.5 py-0.5 rounded">DocScannerApp</code> ذخیره شده‌اند. می‌توانید کل پروژه را با یک کلیک به صورت فایل ZIP دانلود کرده و مستقیماً در <strong>Android Studio</strong> باز و کامپایل نمایید.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold px-5 py-3.5 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-blue-500/25 transition cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Download className="w-5 h-5 text-white" />
          <span>{isZipping ? 'در حال ایجاد فایل ZIP...' : 'دانلود سورس کامل پروژه (ZIP)'}</span>
        </button>
      </div>

      {/* Main File Explorer & Code Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: File Tree List */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <FolderTree className="w-4 h-4 text-blue-400" />
              <span>فایل‌های پروژه اندروید</span>
            </div>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-medium">
              {ANDROID_FILES.length} فایل
            </span>
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {ANDROID_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-right p-2.5 rounded-xl transition flex flex-col gap-1 cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-950/80 border-blue-600/80 text-blue-100 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold font-mono truncate">{file.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        file.category === 'kotlin'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : file.category === 'gradle'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : file.category === 'workflow'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {file.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{file.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Code Viewer */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          {/* Header with Path and Copy */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs font-mono text-slate-300 truncate" dir="ltr">
                {selectedFile.path}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shrink-0 border border-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>کپی کد</span>
                </>
              )}
            </button>
          </div>

          {/* Description banner */}
          <div className="bg-slate-900/90 px-4 py-2 text-xs text-blue-300 border-b border-slate-800/80 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{selectedFile.description}</span>
          </div>

          {/* Code Text Area */}
          <div className="p-4 bg-[#0d1117] overflow-x-auto max-h-[560px] font-mono text-xs leading-relaxed text-slate-200 select-text">
            <pre dir="ltr" className="whitespace-pre">
              {selectedFile.content}
            </pre>
          </div>
        </div>
      </div>

      {/* Technical Highlights Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">هسته پردازش بومی (Zero AI)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            الگوریتم‌های فتوکپی شارپ و اسکن رنگی بدون هیچ مدل هوش مصنوعی سنگین و صرفاً با متدهای خالص <code>Bitmap</code> و <code>ColorMatrix</code> با سرعتی کمتر از ۱۰۰ میلی‌ثانیه و حجم APK زیر ۱۰ مگابایت اجرا می‌شوند.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
            <Terminal className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">اتوماسیون گیت‌هاب اکشنز (CI/CD)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            تنظیمات کامل بیلد در فایل <code>.github/workflows/build-apk.yml</code> گنجانده شده تا با هر Push به مخزن، فایل‌های <code>app-release.apk</code> و <code>app-release.aab</code> خودکار کامپایل و آماده دانلود شوند.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">متریال ۳ و چیدمان ۱۰۰٪ RTL</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            تمام صفحات و ناوبری با Jetpack Compose و رعایت کامل راست‌چین (RTL) به زبان فارسی پیاده‌سازی شده و از فایل پرووایدر امن برای ارسال مستقیم به ایتا، بله، روبیکا، تلگرام و واتساپ بهره می‌برد.
          </p>
        </div>
      </div>
    </div>
  );
};
