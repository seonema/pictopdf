export type FilterType = 'PHOTOCOPY' | 'COLOR_SCAN' | 'BW_PRINTER' | 'ORIGINAL';

export interface ScannedDocument {
  id: string;
  title: string;
  imageUri: string;
  pdfUri?: string;
  dateShamsi: string;
  filterApplied: FilterType;
  timestamp: number;
  fileSizeBytes: number;
}

export type ScreenState = 'HOME' | 'CAMERA' | 'EDITOR' | 'PREVIEW';
