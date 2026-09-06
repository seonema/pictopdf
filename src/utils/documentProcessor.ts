import { jsPDF } from 'jspdf';
import { FilterType } from '../types';

/**
 * Client-Side JavaScript mirror of com.example.docscanner.processing.ImageProcessor
 * Executes the exact same luminance thresholding and ColorMatrix logic using HTML5 Canvas.
 */
export async function processDocumentImage(
  imageSource: string,
  filter: FilterType,
  rotationDegrees: number = 0,
  brightness: number = 0,
  contrast: number = 1
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 1. Create canvas for rotation & basic adjustments
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return reject(new Error('Canvas context unavailable'));
      }

      const rad = (rotationDegrees * Math.PI) / 180;
      const isOrthogonal = Math.abs(rotationDegrees % 180) === 90;

      canvas.width = isOrthogonal ? img.height : img.width;
      canvas.height = isOrthogonal ? img.width : img.height;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const len = data.length;

      // 2. Adjust Brightness & Contrast
      if (brightness !== 0 || contrast !== 1) {
        for (let i = 0; i < len; i += 4) {
          // R, G, B
          for (let c = 0; c < 3; c++) {
            let val = data[i + c];
            val = (val - 128) * contrast + 128 + brightness;
            data[i + c] = Math.max(0, Math.min(255, val));
          }
        }
      }

      // 3. Apply Filter Algorithm
      if (filter === 'PHOTOCOPY') {
        // Sample average luminance for adaptive thresholding
        let totalLum = 0;
        let samples = 0;
        const step = Math.max(1, Math.floor(len / 4 / 4000));
        for (let i = 0; i < len; i += 4 * step) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          totalLum += lum;
          samples++;
        }
        const avgLum = samples > 0 ? totalLum / samples : 128;
        const threshold = Math.min(225, Math.max(105, avgLum * 0.92));

        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (lum >= threshold) {
            // Whitened pure paper background
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else {
            // Crisp deep black/dark charcoal ink
            const ink = Math.floor((lum * 255 / threshold) * 0.72);
            const clamped = Math.max(0, Math.min(255, ink));
            data[i] = clamped;
            data[i + 1] = clamped;
            data[i + 2] = clamped;
          }
        }
      } else if (filter === 'COLOR_SCAN') {
        // Enhance contrast, whiten dirty backgrounds, boost ink color saturation
        for (let i = 0; i < len; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Contrast boost
          const contrastK = 1.32;
          r = Math.min(255, Math.max(0, (r - 128) * contrastK + 128 + 25));
          g = Math.min(255, Math.max(0, (g - 128) * contrastK + 128 + 25));
          b = Math.min(255, Math.max(0, (b - 128) * contrastK + 128 + 25));

          // Saturation boost for stamps
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = Math.min(255, Math.max(0, gray + (r - gray) * 1.3));
          data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * 1.3));
          data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * 1.3));
        }
      } else if (filter === 'BW_PRINTER') {
        // High contrast grayscale for printer toner optimization
        for (let i = 0; i < len; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.45 + 128 + 20));
          data[i] = enhanced;
          data[i + 1] = enhanced;
          data[i + 2] = enhanced;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.onerror = (err) => reject(err);
    img.src = imageSource;
  });
}

/**
 * Exports document to standard A4 PDF (mirroring PdfExporter.kt)
 */
export async function exportToA4Pdf(imageDataUrl: string, title: string): Promise<string> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4', // 595.28 x 841.89 pt
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;

  const imgProps = pdf.getImageProperties(imageDataUrl);
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  const widthRatio = maxWidth / imgProps.width;
  const heightRatio = maxHeight / imgProps.height;
  const ratio = Math.min(widthRatio, heightRatio);

  const destWidth = imgProps.width * ratio;
  const destHeight = imgProps.height * ratio;

  const x = (pageWidth - destWidth) / 2;
  const y = (pageHeight - destHeight) / 2;

  pdf.addImage(imageDataUrl, 'JPEG', x, y, destWidth, destHeight);

  // Return blob URL and save
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);

  // Trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}.pdf`;
  link.click();

  return url;
}

/**
 * Returns current Persian / Shamsi date string
 */
export function getShamsiDate(): string {
  const today = new Date();
  const gYear = today.getFullYear();
  const gMonth = today.getMonth() + 1;
  const gDay = today.getDate();

  const gDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const jDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

  let gy = gYear - 1600;
  let gm = gMonth - 1;
  let gd = gDay - 1;

  let gDayNo = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);
  for (let i = 0; i < gm; ++i) gDayNo += gDays[i];
  if (gm > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) ++gDayNo;
  gDayNo += gd;

  let jDayNo = gDayNo - 79;
  const jNp = Math.floor(jDayNo / 12053);
  jDayNo %= 12053;

  let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
  jDayNo %= 1461;

  if (jDayNo >= 366) {
    jy += Math.floor((jDayNo - 1) / 365);
    jDayNo = (jDayNo - 1) % 365;
  }

  let jm = 0;
  for (let i = 0; i < 11 && jDayNo >= jDays[i]; ++i) {
    jDayNo -= jDays[i];
    jm = i + 1;
  }
  const jd = jDayNo + 1;

  const monthNames = [
    'فروردین', 'اردیبهشت', 'خرداد',
    'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر',
    'دی', 'بهمن', 'اسفند'
  ];

  return `${jd} ${monthNames[jm]} ${jy}`;
}
