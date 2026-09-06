import React, { useState } from 'react';
import { Smartphone, Code, Terminal, Sparkles, CheckCircle2, Download } from 'lucide-react';
import { AndroidSimulator } from './components/AndroidSimulator';
import { SourceCodeViewer } from './components/SourceCodeViewer';
import { downloadAndroidProjectZip } from './androidSources';

export default function App() {
  const [activeTab, setActiveTab] = useState<'SIMULATOR' | 'CODE' | 'GUIDE'>('SIMULATOR');
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const handleDownload = async () => {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Vazirmatn',sans-serif]">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">اسکنر و فتوکپی هوشمند مدارک</h1>
                <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full font-bold">
                  Android Native / Kotlin
                </span>
              </div>
              <p className="text-xs text-slate-400">Jetpack Compose + معماری تمیز + خروجی استاندارد گریدل</p>
            </div>
          </div>

          {/* Quick Actions & Navigation Tabs */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setActiveTab('SIMULATOR')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium cursor-pointer transition flex items-center gap-1.5 ${
                  activeTab === 'SIMULATOR'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>شبیه‌ساز تعاملی</span>
              </button>

              <button
                onClick={() => setActiveTab('CODE')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium cursor-pointer transition flex items-center gap-1.5 ${
                  activeTab === 'CODE'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>سورس‌کد کاتلین</span>
              </button>

              <button
                onClick={() => setActiveTab('GUIDE')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium cursor-pointer transition flex items-center gap-1.5 ${
                  activeTab === 'GUIDE'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>راهنمای بیلد</span>
              </button>
            </div>

            <button
              onClick={handleDownload}
              disabled={isZipping}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30 transition disabled:opacity-50"
              title="دانلود فایل ZIP پروژه کامل اندروید"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isZipping ? 'ایجاد...' : 'دانلود ZIP'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'SIMULATOR' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs shadow-xs">
              <div className="space-y-1">
                <p className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  شبیه‌ساز مستقیم عملکرد اپلیکیشن بومی اندروید
                </p>
                <p className="text-slate-400 leading-relaxed">
                  این شبیه‌ساز همان الگوریتم‌های ماتریس رنگ و آستانه‌گذاری روشنایی (Luminance Thresholding) موجود در <code>ImageProcessor.kt</code> را روی تصاویر اجرا می‌کند. می‌توانید عکس مدرک را بارگذاری کرده یا از دوربین استفاده کنید.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('CODE')}
                className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer shrink-0 transition"
              >
                مشاهده فایل‌های سورس کاتلین &larr;
              </button>
            </div>

            <AndroidSimulator />
          </div>
        )}

        {activeTab === 'CODE' && <SourceCodeViewer />}

        {activeTab === 'GUIDE' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-400" />
                <span>راهنمای بیلد ابری و اجرای محلی در Android Studio</span>
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                این پروژه با استاندارد کامل گریدل، کامپایلر Jetpack Compose، جاوا ۱۷ و گریدل ۸ پیکربندی شده است.
              </p>

              {/* Step 1 */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-200">روش اول: بیلد خودکار ابری با GitHub Actions (بدون نیاز به نصب نرم‌افزار)</h3>
                </div>
                <p className="text-xs text-slate-400 pr-6 leading-relaxed">
                  فایل <code className="text-blue-300 bg-slate-950 px-1.5 py-0.5 rounded">.github/workflows/build-apk.yml</code> در ریشه مخزن آماده است. با ایجاد مخزن در گیت‌هاب و ارسال (Push) پروژه:
                </p>
                <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 overflow-x-auto mr-6" dir="ltr">
                  git init<br />
                  git add .<br />
                  git commit -m "Initial commit for DocScanner Native App"<br />
                  git branch -M main<br />
                  git remote add origin &lt;YOUR_GITHUB_REPO_URL&gt;<br />
                  git push -u origin main
                </div>
                <p className="text-xs text-blue-300 pr-6">
                  پس از پوش، در تب <strong>Actions</strong> گیت‌هاب، فایل‌های <code className="bg-slate-950 px-1 rounded">app-release.apk</code> و <code className="bg-slate-950 px-1 rounded">app-release.aab</code> تولید شده و لینک دانلود مستقیم در اختیارتان قرار می‌گیرد.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-200">روش دوم: باز کردن و کامپایل در Android Studio</h3>
                </div>
                <p className="text-xs text-slate-400 pr-6 leading-relaxed">
                  پوشه <code className="text-blue-300 bg-slate-950 px-1.5 py-0.5 rounded">DocScannerApp</code> را در نرم‌افزار Android Studio باز کنید:
                </p>
                <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 overflow-x-auto mr-6" dir="ltr">
                  cd DocScannerApp<br />
                  # کامپایل نسخه Debug:<br />
                  ./gradlew assembleDebug<br />
                  <br />
                  # کامپایل نسخه Release نهایی:<br />
                  ./gradlew assembleRelease
                </div>
                <p className="text-xs text-slate-400 pr-6">
                  فایل نهایی در مسیر <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded" dir="ltr">app/build/outputs/apk/release/app-release.apk</code> ذخیره خواهد شد.
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-200">مشخصات کلیدی پروژه</h3>
                </div>
                <ul className="text-xs text-slate-400 pr-6 space-y-1 list-disc list-inside">
                  <li><strong>زبان رسمی:</strong> Kotlin 1.9.23 با کامپایلر مدرن Jetpack Compose 1.5.11</li>
                  <li><strong>هدف‌گذاری سیستم عامل:</strong> CompileSdk 34 (اندروید ۱۴) و MinSdk 24 (اندروید ۷ به بالا)</li>
                  <li><strong>وابستگی هوش مصنوعی:</strong> صفر (Zero AI Dependency) با حجم خروجی APK زیر ۱۰ مگابایت</li>
                  <li><strong>الگوریتم‌های گرافیکی:</strong> پردازش بومی مستقیم با Bitmap، Canvas، ColorMatrix و آستانه‌گذاری روشنایی</li>
                  <li><strong>خروجی اسناد:</strong> کتابخانه استاندارد بومی <code>android.graphics.pdf.PdfDocument</code> در ابعاد استاندارد A4 اداری</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleDownload}
                  disabled={isZipping}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs cursor-pointer shadow-md shadow-blue-500/25 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>{isZipping ? 'در حال ایجاد...' : 'دانلود فایل کامل ZIP پروژه'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
