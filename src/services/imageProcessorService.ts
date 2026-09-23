import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { CropRect, DocumentFilterType, ScannedPage } from '../types';

export const imageProcessorService = {
  /**
   * Calculate the crop rectangle on the raw photo corresponding to the on-screen viewfinder frame
   */
  calculateFrameCrop(
    photoWidth: number,
    photoHeight: number,
    screenWidth: number,
    screenHeight: number,
    frameX: number,
    frameY: number,
    frameWidth: number,
    frameHeight: number
  ): CropRect {
    // Normalize portrait orientation
    const isPortrait = photoHeight >= photoWidth;
    const pWidth = isPortrait ? photoWidth : photoHeight;
    const pHeight = isPortrait ? photoHeight : photoWidth;

    const screenAspect = screenWidth / screenHeight;
    const photoAspect = pWidth / pHeight;

    let scale: number;
    let offsetX = 0;
    let offsetY = 0;

    if (screenAspect < photoAspect) {
      // Screen is taller than photo aspect (typical on mobile portrait)
      // CameraView scales to cover the full screen height and overflows horizontally
      scale = screenHeight / pHeight;
      const renderedWidth = pWidth * scale;
      offsetX = (renderedWidth - screenWidth) / 2;
      offsetY = 0;
    } else {
      // Screen is wider than photo aspect
      // CameraView scales to cover the full screen width and overflows vertically
      scale = screenWidth / pWidth;
      const renderedHeight = pHeight * scale;
      offsetX = 0;
      offsetY = (renderedHeight - screenHeight) / 2;
    }

    // Map screen frame coordinates (plus excess offset) back to actual photo pixels
    const renderedFrameX = frameX + offsetX;
    const renderedFrameY = frameY + offsetY;

    const originX = Math.max(0, Math.min(pWidth - 25, Math.floor(renderedFrameX / scale)));
    const originY = Math.max(0, Math.min(pHeight - 25, Math.floor(renderedFrameY / scale)));
    const maxWidth = Math.max(20, pWidth - originX - 2);
    const maxHeight = Math.max(20, pHeight - originY - 2);
    const width = Math.max(20, Math.min(maxWidth, Math.floor(frameWidth / scale)));
    const height = Math.max(20, Math.min(maxHeight, Math.floor(frameHeight / scale)));

    return {
      originX,
      originY,
      width,
      height,
    };
  },

  /**
   * Applies rotation, crop and optimization to an image
   */
  async processPage(
    sourceUri: string,
    rotation: number = 0,
    filter: DocumentFilterType = 'original',
    quality: number = 0.85,
    cropRect?: CropRect
  ): Promise<{ uri: string; width: number; height: number }> {
    const actions: ImageManipulator.Action[] = [];

    // 1. Crop first if coordinates are provided
    if (cropRect && cropRect.width > 20 && cropRect.height > 20) {
      // Get real image dimensions to guarantee rect.maxX <= image.size.width
      const { imgWidth, imgHeight } = await new Promise<{ imgWidth: number; imgHeight: number }>((resolve) => {
        Image.getSize(
          sourceUri,
          (w, h) => resolve({ imgWidth: w, imgHeight: h }),
          () => resolve({ imgWidth: 4000, imgHeight: 4000 })
        );
      });

      // Strict boundary check: ensure originX + width <= imgWidth and originY + height <= imgHeight
      const originX = Math.max(0, Math.min(imgWidth - 25, Math.floor(cropRect.originX)));
      const originY = Math.max(0, Math.min(imgHeight - 25, Math.floor(cropRect.originY)));
      const maxWidth = Math.max(20, imgWidth - originX - 2);
      const maxHeight = Math.max(20, imgHeight - originY - 2);
      const width = Math.max(20, Math.min(maxWidth, Math.floor(cropRect.width)));
      const height = Math.max(20, Math.min(maxHeight, Math.floor(cropRect.height)));

      actions.push({
        crop: {
          originX,
          originY,
          width,
          height,
        },
      });
    }

    // 2. Rotation if applicable
    if (rotation !== 0) {
      actions.push({ rotate: rotation });
    }

    // 3. Resize to high-density document resolution (crisp text, optimized PDF file size)
    actions.push({ resize: { width: 1600 } });

    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      actions,
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  },

  /**
   * Rotate a scanned page by 90 degrees clockwise
   */
  async rotatePageClockwise(page: ScannedPage): Promise<ScannedPage> {
    const newRotation = (page.rotation + 90) % 360;
    const processed = await this.processPage(
      page.originalUri,
      newRotation,
      page.filter,
      0.85,
      page.cropRect
    );

    return {
      ...page,
      uri: processed.uri,
      width: processed.width,
      height: processed.height,
      rotation: newRotation,
    };
  },

  /**
   * Change page filter mode
   */
  async applyFilter(page: ScannedPage, filter: DocumentFilterType): Promise<ScannedPage> {
    const processed = await this.processPage(
      page.originalUri,
      page.rotation,
      filter,
      0.85,
      page.cropRect
    );

    return {
      ...page,
      uri: processed.uri,
      width: processed.width,
      height: processed.height,
      filter,
    };
  },

  /**
   * Apply manual crop rectangle to page
   */
  async applyCrop(page: ScannedPage, cropRect: CropRect): Promise<ScannedPage> {
    const processed = await this.processPage(
      page.originalUri,
      page.rotation,
      page.filter,
      0.85,
      cropRect
    );

    return {
      ...page,
      uri: processed.uri,
      width: processed.width,
      height: processed.height,
      cropRect,
    };
  },

  /**
   * Auto Trim Margins: Automatically crops out 5% border to eliminate table edges
   */
  async autoTrimMargins(page: ScannedPage): Promise<ScannedPage> {
    const marginX = page.width * 0.05;
    const marginY = page.height * 0.05;
    const cropRect: CropRect = {
      originX: marginX,
      originY: marginY,
      width: page.width - marginX * 2,
      height: page.height - marginY * 2,
    };

    return this.applyCrop(page, cropRect);
  },

  /**
   * Preset ratio crop (Letter/A4 or ID Card)
   */
  async applyPresetRatio(page: ScannedPage, ratio: 'letter' | 'id_card' | 'square'): Promise<ScannedPage> {
    let targetRatio = 1.0; // width / height
    if (ratio === 'letter') {
      targetRatio = 1 / 1.35; // Standard Document
    } else if (ratio === 'id_card') {
      targetRatio = 1.58 / 1; // ID Card horizontal
    } else if (ratio === 'square') {
      targetRatio = 1.0;
    }

    const currentRatio = page.width / page.height;
    let cropWidth = page.width;
    let cropHeight = page.height;
    let originX = 0;
    let originY = 0;

    if (currentRatio > targetRatio) {
      // Image is wider than target ratio
      cropWidth = page.height * targetRatio;
      originX = (page.width - cropWidth) / 2;
    } else {
      // Image is taller than target ratio
      cropHeight = page.width / targetRatio;
      originY = (page.height - cropHeight) / 2;
    }

    const cropRect: CropRect = {
      originX,
      originY,
      width: cropWidth,
      height: cropHeight,
    };

    return this.applyCrop(page, cropRect);
  },
};
