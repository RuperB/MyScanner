export type DocumentFilterType =
  | 'original'
  | 'grayscale'
  | 'bw'
  | 'bw_strict'
  | 'enhanced'
  | 'magic';

export type ScanMode = 'document' | 'id_card';

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface ScannedPage {
  id: string;
  uri: string;
  originalUri: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  filter: DocumentFilterType;
  cropRect?: CropRect;
  scanMode?: ScanMode;
  isIdCardBack?: boolean;
  capturedAt: number;
}

export type UploadStatus = 'local_only' | 'uploading' | 'synced' | 'error';

export interface ScannedDocument {
  id: string;
  title: string;
  docType: string;
  pages: ScannedPage[];
  pageCount: number;
  pdfUri: string;
  pdfFileName: string;
  pdfSize?: number;
  createdAt: number;
  updatedAt: number;
  phoneNumber: string;
  baseFolder: string;
  uploadStatus: UploadStatus;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveFolderHierarchy?: {
    baseFolderId?: string;
    phoneFolderId?: string;
    docTypeFolderId?: string;
  };
  errorMessage?: string;
}

export interface AppSettings {
  phoneNumber: string;
  baseFolderName: string;
  googleClientIdIos: string;
  googleClientIdAndroid: string;
  googleClientIdWeb: string;
  customDocTypes: string[];
  autoUploadToDrive: boolean;
  defaultFilter: DocumentFilterType;
  compressionQuality: number; // 0.1 to 1.0
  isFirstLaunch: boolean;
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  issuedAt: number;
}

export interface DriveFolderItem {
  id: string;
  name: string;
  mimeType: string;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  baseFolderId: string;
  phoneFolderId: string;
  docTypeFolderId: string;
}

export type UploadStep = 
  | 'idle'
  | 'generating_pdf'
  | 'verifying_auth'
  | 'resolving_base_folder'
  | 'resolving_phone_folder'
  | 'resolving_doctype_folder'
  | 'uploading_file'
  | 'completed'
  | 'error';
