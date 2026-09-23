import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib';
import { ScannedPage } from '../types';

/**
 * Converts a base64 string to a Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Format date to YYYY-MM-DD_HHmmss for filename consistency
 */
export function formatScanDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
}

/**
 * Cleans string for valid file naming
 */
export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_');
}

export const pdfService = {
  /**
   * Generates a clean multi-page PDF document from scanned pages (or single-page 2-sided ID Card)
   */
  async createPdfFromPages(
    pages: ScannedPage[],
    customTitle: string,
    scanDate: Date = new Date(),
    isIdCardSingleSheet: boolean = false
  ): Promise<{ uri: string; fileName: string; size: number }> {
    if (pages.length === 0) {
      throw new Error('No hay páginas seleccionadas para generar el PDF.');
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(customTitle);
    pdfDoc.setAuthor('MyScanner Mobile');
    pdfDoc.setProducer('MyScanner Mobile App (iOS / Android)');
    pdfDoc.setCreationDate(scanDate);

    // If 2 pages in ID Card mode, place both Front & Back on a single Letter page
    if (isIdCardSingleSheet && pages.length === 2) {
      const pageWidth = 612; // Letter width
      const pageHeight = 792; // Letter height
      const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

      for (let i = 0; i < 2; i++) {
        const page = pages[i];
        const base64Data = await FileSystem.readAsStringAsync(page.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const imageBytes = base64ToUint8Array(base64Data);
        let embeddedImage;
        try {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } catch {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        }

        const maxImgWidth = 420;
        const maxImgHeight = 270;
        const scale = Math.min(maxImgWidth / embeddedImage.width, maxImgHeight / embeddedImage.height);
        const drawWidth = embeddedImage.width * scale;
        const drawHeight = embeddedImage.height * scale;
        const posX = (pageWidth - drawWidth) / 2;
        // Front on upper half, Back on lower half
        const posY = i === 0 ? pageHeight * 0.55 : pageHeight * 0.12;

        pdfPage.drawImage(embeddedImage, {
          x: posX,
          y: posY,
          width: drawWidth,
          height: drawHeight,
        });
      }
    } else {
      // Standard Multi-Page Document
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        try {
          const base64Data = await FileSystem.readAsStringAsync(page.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const imageBytes = base64ToUint8Array(base64Data);
          let embeddedImage;

          try {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          } catch {
            // Fallback if image was saved as PNG
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          }

          const imgDims = embeddedImage.scale(1.0);

          const targetWidth = imgDims.width;
          const targetHeight = imgDims.height;

          const pdfPage = pdfDoc.addPage([targetWidth, targetHeight]);
          pdfPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: targetWidth,
            height: targetHeight,
          });
        } catch (pageError) {
          console.error(`Error processing page ${i + 1} into PDF:`, pageError);
          throw new Error(`Error al procesar la página ${i + 1} en el PDF: ${pageError}`);
        }
      }
    }

    const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: false });

    const safeTitle = sanitizeFileName(customTitle) || 'Documento';
    const dateFormatted = formatScanDate(scanDate);
    const fileName = `${safeTitle}_${dateFormatted}.pdf`;

    const docDirectory = FileSystem.documentDirectory || '';
    const fileUri = `${docDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size || 0 : 0;

    return {
      uri: fileUri,
      fileName,
      size: fileSize,
    };
  },
};
