import { DriveFolderItem, DriveUploadResult, UploadStep } from '../types';
import { cleanGoogleToken, googleAuthService } from './googleAuthService';
import { readUriAsBytes } from './pdfService';

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,parents';

export const googleDriveService = {
  /**
   * Performs an authenticated fetch to Google Drive, automatically auto-refreshing expired tokens
   */
  async fetchWithAuth(url: string, options: RequestInit, rawToken: string): Promise<Response> {
    let token = cleanGoogleToken(rawToken);
    let res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    // If 401 Unauthenticated, attempt automatic background token refresh and retry
    if (res.status === 401) {
      const freshToken = await googleAuthService.getValidAccessToken(true);
      if (freshToken) {
        token = freshToken;
        res = await fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });
      }
    }

    return res;
  },

  /**
   * Search for an active folder by name and optional parentId.
   * If not found, create it with mimeType application/vnd.google-apps.folder
   */
  async findOrCreateFolder(
    folderName: string,
    parentFolderId: string | null,
    rawAccessToken: string
  ): Promise<DriveFolderItem> {
    const cleanName = folderName.trim();
    if (!cleanName) {
      throw new Error('El nombre de la carpeta no puede estar vacío.');
    }

    // Escape single quotes for Google Drive search query
    const escapedName = cleanName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and trashed = false`;
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const searchUrl = `${DRIVE_FILES_ENDPOINT}?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents)&spaces=drive`;

    const searchRes = await this.fetchWithAuth(searchUrl, {}, rawAccessToken);

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      throw new Error(`Error al buscar carpeta "${cleanName}" en Google Drive (${searchRes.status}): ${errText}`);
    }

    const searchData = await searchRes.json();

    // If folder exists, return it
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0];
    }

    // Create folder
    const createBody: { name: string; mimeType: string; parents?: string[] } = {
      name: cleanName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
      createBody.parents = [parentFolderId];
    }

    const createRes = await this.fetchWithAuth(
      DRIVE_FILES_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBody),
      },
      rawAccessToken
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Error al crear carpeta "${cleanName}" en Google Drive (${createRes.status}): ${errText}`);
    }

    const createdFolder = await createRes.json();
    return createdFolder;
  },

  /**
   * Validates and builds the full 3-level folder hierarchy:
   * Level 1: Base Folder (e.g. "MyScanner_Documents")
   * Level 2: Phone Number Folder (e.g. "+573001234567")
   * Level 3: Document Type Folder (e.g. "Facturas")
   */
  async resolveHierarchy(
    baseFolderName: string,
    phoneNumber: string,
    docType: string,
    accessToken: string,
    onStepChange?: (step: UploadStep, details: string) => void
  ): Promise<{
    baseFolderId: string;
    phoneFolderId: string;
    docTypeFolderId: string;
  }> {
    // 1. Base Folder
    onStepChange?.('resolving_base_folder', `Verificando carpeta base: "${baseFolderName}"`);
    const baseFolder = await this.findOrCreateFolder(baseFolderName, null, accessToken);

    // 2. Phone Folder inside Base Folder
    const cleanPhone = phoneNumber.trim() || 'Dispositivo_Sin_Numero';
    onStepChange?.('resolving_phone_folder', `Verificando carpeta del teléfono: "${cleanPhone}"`);
    const phoneFolder = await this.findOrCreateFolder(cleanPhone, baseFolder.id, accessToken);

    // 3. Document Type Folder inside Phone Folder
    const cleanDocType = docType.trim() || 'General';
    onStepChange?.('resolving_doctype_folder', `Verificando tipo documental: "${cleanDocType}"`);
    const docTypeFolder = await this.findOrCreateFolder(cleanDocType, phoneFolder.id, accessToken);

    return {
      baseFolderId: baseFolder.id,
      phoneFolderId: phoneFolder.id,
      docTypeFolderId: docTypeFolder.id,
    };
  },

  /**
   * Uploads the generated PDF file directly into the resolved Document Type Folder
   */
  async uploadPdfFile(
    pdfUri: string,
    fileName: string,
    targetFolderId: string,
    rawAccessToken: string,
    onStepChange?: (step: UploadStep, details: string) => void
  ): Promise<{ fileId: string; fileName: string; webViewLink: string }> {
    onStepChange?.('uploading_file', `Subiendo archivo "${fileName}" a Google Drive...`);

    const pdfBytes = await readUriAsBytes(pdfUri);

    const metadata = JSON.stringify({
      name: fileName,
      parents: [targetFolderId],
      mimeType: 'application/pdf',
    });

    const boundary = '-------MyScannerBoundary' + Date.now();
    const encoder = new TextEncoder();

    const part1Str =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/pdf\r\n\r\n`;

    const part3Str = `\r\n--${boundary}--`;

    const part1Bytes = encoder.encode(part1Str);
    const part3Bytes = encoder.encode(part3Str);

    const fullBody = new Uint8Array(part1Bytes.length + pdfBytes.length + part3Bytes.length);
    fullBody.set(part1Bytes, 0);
    fullBody.set(pdfBytes, part1Bytes.length);
    fullBody.set(part3Bytes, part1Bytes.length + pdfBytes.length);

    const uploadRes = await this.fetchWithAuth(
      DRIVE_UPLOAD_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(fullBody.length),
        },
        body: fullBody,
      },
      rawAccessToken
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Error al subir el archivo PDF a Google Drive (${uploadRes.status}): ${errText}`);
    }

    const result = await uploadRes.json();

    return {
      fileId: result.id,
      fileName: result.name || fileName,
      webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    };
  },

  /**
   * Complete workflow: Verify hierarchy & Upload PDF
   */
  async executeFullUploadFlow(
    pdfUri: string,
    fileName: string,
    baseFolderName: string,
    phoneNumber: string,
    docType: string,
    accessToken: string,
    onStepChange?: (step: UploadStep, details: string) => void
  ): Promise<DriveUploadResult> {
    const hierarchy = await this.resolveHierarchy(
      baseFolderName,
      phoneNumber,
      docType,
      accessToken,
      onStepChange
    );

    const upload = await this.uploadPdfFile(
      pdfUri,
      fileName,
      hierarchy.docTypeFolderId,
      accessToken,
      onStepChange
    );

    onStepChange?.('completed', '¡Documento subido con éxito a Google Drive!');

    return {
      fileId: upload.fileId,
      fileName: upload.fileName,
      webViewLink: upload.webViewLink,
      baseFolderId: hierarchy.baseFolderId,
      phoneFolderId: hierarchy.phoneFolderId,
      docTypeFolderId: hierarchy.docTypeFolderId,
    };
  },
};
