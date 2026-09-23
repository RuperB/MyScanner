import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import { AppButton } from './UIComponents';
import { CropRect, ScannedPage } from '../types';
import { imageProcessorService } from '../services/imageProcessorService';

interface InteractiveCropOverlayProps {
  visible: boolean;
  page: ScannedPage | null;
  onClose: () => void;
  onApplyCroppedPage: (updatedPage: ScannedPage) => void;
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const FRAME_WIDTH = windowWidth * 0.92;
const FRAME_HEIGHT = windowHeight * 0.58;
const MIN_BOX_SIZE = 35;
const HANDLE_TOUCH_SIZE = 48;

interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const InteractiveCropOverlay: React.FC<InteractiveCropOverlayProps> = ({
  visible,
  page,
  onClose,
  onApplyCroppedPage,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<'custom' | 'auto' | 'letter' | 'id_card' | 'original'>('custom');

  // Exact real pixel dimensions of the raw source photo
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: page?.width || 1200,
    height: page?.height || 1600,
  });

  const targetSourceUri = page?.originalUri || page?.uri || '';

  // Fetch real image file pixel dimensions dynamically
  useEffect(() => {
    if (!targetSourceUri) return;
    Image.getSize(
      targetSourceUri,
      (w, h) => {
        if (w > 0 && h > 0) {
          setImageDimensions({ width: w, height: h });
        }
      },
      (err) => {
        console.warn('Image.getSize fallback used:', err);
        if (page?.width && page?.height) {
          setImageDimensions({ width: page.width, height: page.height });
        }
      }
    );
  }, [targetSourceUri, page?.width, page?.height]);

  // Compute exact rendered image layout inside container
  const { renderedWidth, renderedHeight, offsetX, offsetY, scale } = useMemo(() => {
    const imgW = imageDimensions.width;
    const imgH = imageDimensions.height;
    const imageAspect = imgW / imgH;
    const frameAspect = FRAME_WIDTH / FRAME_HEIGHT;

    let rW: number;
    let rH: number;
    let oX: number;
    let oY: number;

    if (imageAspect > frameAspect) {
      // Image fills container width
      rW = FRAME_WIDTH;
      rH = FRAME_WIDTH / imageAspect;
      oX = 0;
      oY = (FRAME_HEIGHT - rH) / 2;
    } else {
      // Image fills container height
      rH = FRAME_HEIGHT;
      rW = FRAME_HEIGHT * imageAspect;
      oX = (FRAME_WIDTH - rW) / 2;
      oY = 0;
    }

    const sc = imgW / rW;
    return { renderedWidth: rW, renderedHeight: rH, offsetX: oX, offsetY: oY, scale: sc };
  }, [imageDimensions]);

  // Active crop box in frame coordinates
  const [cropBox, setCropBox] = useState<BoxRect>({
    x: offsetX,
    y: offsetY,
    width: renderedWidth,
    height: renderedHeight,
  });

  // Reference for gesture drag calculations
  const startGestureBoxRef = useRef<BoxRect>(cropBox);
  const cropBoxRef = useRef<BoxRect>(cropBox);
  cropBoxRef.current = cropBox;

  // Initialize crop box to current page crop or full image when modal opens
  useEffect(() => {
    if (visible && scale > 0) {
      let initialBox: BoxRect;
      if (page?.cropRect && page.cropRect.width > 20 && page.cropRect.height > 20) {
        initialBox = {
          x: Math.max(offsetX, offsetX + page.cropRect.originX / scale),
          y: Math.max(offsetY, offsetY + page.cropRect.originY / scale),
          width: Math.min(renderedWidth, page.cropRect.width / scale),
          height: Math.min(renderedHeight, page.cropRect.height / scale),
        };
      } else {
        initialBox = {
          x: offsetX + 6,
          y: offsetY + 6,
          width: Math.max(MIN_BOX_SIZE, renderedWidth - 12),
          height: Math.max(MIN_BOX_SIZE, renderedHeight - 12),
        };
      }
      setCropBox(initialBox);
      startGestureBoxRef.current = initialBox;
      setActivePreset('custom');
    }
  }, [visible, offsetX, offsetY, renderedWidth, renderedHeight, scale, page?.cropRect]);

  // Convert current on-screen cropBox back to actual photo pixel CropRect
  const computePixelCropRect = (box: BoxRect): CropRect => {
    const rawOriginX = (box.x - offsetX) * scale;
    const rawOriginY = (box.y - offsetY) * scale;
    const rawWidth = box.width * scale;
    const rawHeight = box.height * scale;

    const imgW = imageDimensions.width;
    const imgH = imageDimensions.height;

    const originX = Math.max(0, Math.min(imgW - 20, Math.round(rawOriginX)));
    const originY = Math.max(0, Math.min(imgH - 20, Math.round(rawOriginY)));
    const width = Math.max(20, Math.min(imgW - originX, Math.round(rawWidth)));
    const height = Math.max(20, Math.min(imgH - originY, Math.round(rawHeight)));

    return { originX, originY, width, height };
  };

  // 1. PanResponder: Move Whole Box (1:1 Tracking)
  const boxPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startGestureBoxRef.current = { ...cropBoxRef.current };
          setActivePreset('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          const start = startGestureBoxRef.current;
          const maxX = offsetX + renderedWidth - start.width;
          const maxY = offsetY + renderedHeight - start.height;

          const newX = Math.max(offsetX, Math.min(maxX, start.x + gestureState.dx));
          const newY = Math.max(offsetY, Math.min(maxY, start.y + gestureState.dy));

          setCropBox({
            ...start,
            x: newX,
            y: newY,
          });
        },
      }),
    [offsetX, offsetY, renderedWidth, renderedHeight]
  );

  // 2. PanResponder: Top-Left Corner (TL)
  const tlPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startGestureBoxRef.current = { ...cropBoxRef.current };
          setActivePreset('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          const start = startGestureBoxRef.current;
          const rightEdge = start.x + start.width;
          const bottomEdge = start.y + start.height;

          const proposedX = start.x + gestureState.dx;
          const proposedY = start.y + gestureState.dy;

          const newX = Math.max(offsetX, Math.min(rightEdge - MIN_BOX_SIZE, proposedX));
          const newY = Math.max(offsetY, Math.min(bottomEdge - MIN_BOX_SIZE, proposedY));

          setCropBox({
            x: newX,
            y: newY,
            width: rightEdge - newX,
            height: bottomEdge - newY,
          });
        },
      }),
    [offsetX, offsetY]
  );

  // 3. PanResponder: Top-Right Corner (TR)
  const trPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startGestureBoxRef.current = { ...cropBoxRef.current };
          setActivePreset('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          const start = startGestureBoxRef.current;
          const bottomEdge = start.y + start.height;

          const proposedY = start.y + gestureState.dy;
          const proposedW = start.width + gestureState.dx;

          const maxW = offsetX + renderedWidth - start.x;
          const newY = Math.max(offsetY, Math.min(bottomEdge - MIN_BOX_SIZE, proposedY));
          const newW = Math.max(MIN_BOX_SIZE, Math.min(maxW, proposedW));

          setCropBox({
            x: start.x,
            y: newY,
            width: newW,
            height: bottomEdge - newY,
          });
        },
      }),
    [offsetX, offsetY, renderedWidth]
  );

  // 4. PanResponder: Bottom-Left Corner (BL)
  const blPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startGestureBoxRef.current = { ...cropBoxRef.current };
          setActivePreset('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          const start = startGestureBoxRef.current;
          const rightEdge = start.x + start.width;

          const proposedX = start.x + gestureState.dx;
          const proposedH = start.height + gestureState.dy;

          const maxH = offsetY + renderedHeight - start.y;
          const newX = Math.max(offsetX, Math.min(rightEdge - MIN_BOX_SIZE, proposedX));
          const newH = Math.max(MIN_BOX_SIZE, Math.min(maxH, proposedH));

          setCropBox({
            x: newX,
            y: start.y,
            width: rightEdge - newX,
            height: newH,
          });
        },
      }),
    [offsetX, offsetY, renderedHeight]
  );

  // 5. PanResponder: Bottom-Right Corner (BR)
  const brPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startGestureBoxRef.current = { ...cropBoxRef.current };
          setActivePreset('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          const start = startGestureBoxRef.current;
          const maxW = offsetX + renderedWidth - start.x;
          const maxH = offsetY + renderedHeight - start.y;

          const newW = Math.max(MIN_BOX_SIZE, Math.min(maxW, start.width + gestureState.dx));
          const newH = Math.max(MIN_BOX_SIZE, Math.min(maxH, start.height + gestureState.dy));

          setCropBox({
            x: start.x,
            y: start.y,
            width: newW,
            height: newH,
          });
        },
      }),
    [offsetX, offsetY, renderedWidth, renderedHeight]
  );

  // 6. PanResponder: Top Edge
  const topEdgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startGestureBoxRef.current = { ...cropBoxRef.current };
          setActivePreset('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          const start = startGestureBoxRef.current;
          const bottomEdge = start.y + start.height;
          const proposedY = start.y + gestureState.dy;
          const newY = Math.max(offsetY, Math.min(bottomEdge - MIN_BOX_SIZE, proposedY));
          setCropBox({
            ...start,
            y: newY,
            height: bottomEdge - newY,
          });
        },
      }),
    [offsetY]
  );

  // 7. PanResponder: Bottom Edge
  const bottomEdgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startGestureBoxRef.current = { ...cropBoxRef.current };
          setActivePreset('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          const start = startGestureBoxRef.current;
          const maxH = offsetY + renderedHeight - start.y;
          const proposedH = start.height + gestureState.dy;
          const newH = Math.max(MIN_BOX_SIZE, Math.min(maxH, proposedH));
          setCropBox({
            ...start,
            height: newH,
          });
        },
      }),
    [offsetY, renderedHeight]
  );

  // 8. PanResponder: Left Edge
  const leftEdgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startGestureBoxRef.current = { ...cropBoxRef.current };
          setActivePreset('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          const start = startGestureBoxRef.current;
          const rightEdge = start.x + start.width;
          const proposedX = start.x + gestureState.dx;
          const newX = Math.max(offsetX, Math.min(rightEdge - MIN_BOX_SIZE, proposedX));
          setCropBox({
            ...start,
            x: newX,
            width: rightEdge - newX,
          });
        },
      }),
    [offsetX]
  );

  // 9. PanResponder: Right Edge
  const rightEdgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startGestureBoxRef.current = { ...cropBoxRef.current };
          setActivePreset('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          const start = startGestureBoxRef.current;
          const maxW = offsetX + renderedWidth - start.x;
          const proposedW = start.width + gestureState.dx;
          const newW = Math.max(MIN_BOX_SIZE, Math.min(maxW, proposedW));
          setCropBox({
            ...start,
            width: newW,
          });
        },
      }),
    [offsetX, renderedWidth]
  );

  if (!page) return null;

  // Preset Handlers
  const handleApplyPreset = (preset: 'auto' | 'letter' | 'id_card' | 'original') => {
    setActivePreset(preset);

    if (preset === 'original') {
      const box = {
        x: offsetX,
        y: offsetY,
        width: renderedWidth,
        height: renderedHeight,
      };
      setCropBox(box);
      startGestureBoxRef.current = box;
      return;
    }

    if (preset === 'auto') {
      const padX = renderedWidth * 0.05;
      const padY = renderedHeight * 0.05;
      const box = {
        x: offsetX + padX,
        y: offsetY + padY,
        width: renderedWidth - padX * 2,
        height: renderedHeight - padY * 2,
      };
      setCropBox(box);
      startGestureBoxRef.current = box;
      return;
    }

    let targetRatio = 1.0;
    if (preset === 'letter') targetRatio = 1 / 1.38;
    if (preset === 'id_card') targetRatio = 1.58;

    let targetW = renderedWidth * 0.9;
    let targetH = targetW / targetRatio;

    if (targetH > renderedHeight * 0.9) {
      targetH = renderedHeight * 0.9;
      targetW = targetH * targetRatio;
    }

    const box = {
      x: offsetX + (renderedWidth - targetW) / 2,
      y: offsetY + (renderedHeight - targetH) / 2,
      width: targetW,
      height: targetH,
    };
    setCropBox(box);
    startGestureBoxRef.current = box;
  };

  const handleApplyCrop = async () => {
    try {
      setIsProcessing(true);
      const pixelCrop = computePixelCropRect(cropBox);
      const updatedPage = await imageProcessorService.applyCrop(page, pixelCrop);
      onApplyCroppedPage(updatedPage);
      onClose();
    } catch (e) {
      console.error('Error applying manual crop:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>

        {/* Interactive Cropping Workspace */}
        <View style={styles.previewWrapper}>
          <View style={styles.imageFrame}>
            {/* Background Raw Image explicitly positioned to match scale math */}
            <Image
              source={{ uri: targetSourceUri }}
              style={{
                position: 'absolute',
                left: offsetX,
                top: offsetY,
                width: renderedWidth,
                height: renderedHeight,
              }}
              resizeMode="stretch"
            />

            {/* Dimmed Overlay Outside Crop Box (Spotlight Effect) */}
            {/* Top Dim */}
            <View
              style={[
                styles.dimOverlay,
                { top: 0, left: 0, right: 0, height: Math.max(0, cropBox.y) },
              ]}
              pointerEvents="none"
            />
            {/* Bottom Dim */}
            <View
              style={[
                styles.dimOverlay,
                {
                  top: cropBox.y + cropBox.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
              pointerEvents="none"
            />
            {/* Left Dim */}
            <View
              style={[
                styles.dimOverlay,
                {
                  top: cropBox.y,
                  left: 0,
                  width: Math.max(0, cropBox.x),
                  height: cropBox.height,
                },
              ]}
              pointerEvents="none"
            />
            {/* Right Dim */}
            <View
              style={[
                styles.dimOverlay,
                {
                  top: cropBox.y,
                  left: cropBox.x + cropBox.width,
                  right: 0,
                  height: cropBox.height,
                },
              ]}
              pointerEvents="none"
            />

            {/* Moveable & Resizable Crop Box (Center Body Drag) */}
            <View
              style={[
                styles.activeCropBox,
                {
                  left: cropBox.x,
                  top: cropBox.y,
                  width: cropBox.width,
                  height: cropBox.height,
                },
              ]}
              {...boxPanResponder.panHandlers}
            >
              {/* Rule of Thirds Alignment Grid */}
              <View style={styles.gridLineH1} pointerEvents="none" />
              <View style={styles.gridLineH2} pointerEvents="none" />
              <View style={styles.gridLineV1} pointerEvents="none" />
              <View style={styles.gridLineV2} pointerEvents="none" />

              {/* Visual Corner Brackets */}
              <View style={[styles.cornerVisual, styles.cornerTL]} pointerEvents="none" />
              <View style={[styles.cornerVisual, styles.cornerTR]} pointerEvents="none" />
              <View style={[styles.cornerVisual, styles.cornerBL]} pointerEvents="none" />
              <View style={[styles.cornerVisual, styles.cornerBR]} pointerEvents="none" />
            </View>

            {/* 4 Edge Drag Bars (for easy 1-axis stretching) */}
            {/* Top Edge */}
            <View
              style={[
                styles.edgeHandleH,
                {
                  left: cropBox.x + 20,
                  width: Math.max(10, cropBox.width - 40),
                  top: cropBox.y - 14,
                },
              ]}
              {...topEdgePanResponder.panHandlers}
            >
              <View style={styles.edgePillH} />
            </View>

            {/* Bottom Edge */}
            <View
              style={[
                styles.edgeHandleH,
                {
                  left: cropBox.x + 20,
                  width: Math.max(10, cropBox.width - 40),
                  top: cropBox.y + cropBox.height - 14,
                },
              ]}
              {...bottomEdgePanResponder.panHandlers}
            >
              <View style={styles.edgePillH} />
            </View>

            {/* Left Edge */}
            <View
              style={[
                styles.edgeHandleV,
                {
                  top: cropBox.y + 20,
                  height: Math.max(10, cropBox.height - 40),
                  left: cropBox.x - 14,
                },
              ]}
              {...leftEdgePanResponder.panHandlers}
            >
              <View style={styles.edgePillV} />
            </View>

            {/* Right Edge */}
            <View
              style={[
                styles.edgeHandleV,
                {
                  top: cropBox.y + 20,
                  height: Math.max(10, cropBox.height - 40),
                  left: cropBox.x + cropBox.width - 14,
                },
              ]}
              {...rightEdgePanResponder.panHandlers}
            >
              <View style={styles.edgePillV} />
            </View>

            {/* 4 Corner Touch Handles (Pixel-Accurate 1:1 Tracking) */}
            {/* TL Handle */}
            <View
              style={[
                styles.touchHandle,
                {
                  left: cropBox.x - HANDLE_TOUCH_SIZE / 2,
                  top: cropBox.y - HANDLE_TOUCH_SIZE / 2,
                },
              ]}
              {...tlPanResponder.panHandlers}
            >
              <View style={styles.handleCircle} />
            </View>

            {/* TR Handle */}
            <View
              style={[
                styles.touchHandle,
                {
                  left: cropBox.x + cropBox.width - HANDLE_TOUCH_SIZE / 2,
                  top: cropBox.y - HANDLE_TOUCH_SIZE / 2,
                },
              ]}
              {...trPanResponder.panHandlers}
            >
              <View style={styles.handleCircle} />
            </View>

            {/* BL Handle */}
            <View
              style={[
                styles.touchHandle,
                {
                  left: cropBox.x - HANDLE_TOUCH_SIZE / 2,
                  top: cropBox.y + cropBox.height - HANDLE_TOUCH_SIZE / 2,
                },
              ]}
              {...blPanResponder.panHandlers}
            >
              <View style={styles.handleCircle} />
            </View>

            {/* BR Handle */}
            <View
              style={[
                styles.touchHandle,
                {
                  left: cropBox.x + cropBox.width - HANDLE_TOUCH_SIZE / 2,
                  top: cropBox.y + cropBox.height - HANDLE_TOUCH_SIZE / 2,
                },
              ]}
              {...brPanResponder.panHandlers}
            >
              <View style={styles.handleCircle} />
            </View>
          </View>
        </View>

        {/* Bottom Preset Controls & Done Button */}
        <View style={styles.bottomSection}>
          <View style={styles.presetButtonsRow}>
            {/* 1. Quitar Fondo (Auto Trim) */}
            <TouchableOpacity
              style={[
                styles.presetCircleBtn,
                activePreset === 'auto' && styles.presetCircleBtnActive,
              ]}
              onPress={() => handleApplyPreset('auto')}
              disabled={isProcessing}
            >
              <Ionicons
                name="sparkles"
                size={22}
                color={activePreset === 'auto' ? Colors.white : Colors.accent}
              />
            </TouchableOpacity>

            {/* 2. Formato Documento Carta / A4 */}
            <TouchableOpacity
              style={[
                styles.presetCircleBtn,
                activePreset === 'letter' && styles.presetCircleBtnActive,
              ]}
              onPress={() => handleApplyPreset('letter')}
              disabled={isProcessing}
            >
              <Ionicons
                name="document-text-outline"
                size={22}
                color={activePreset === 'letter' ? Colors.white : Colors.primaryLight}
              />
            </TouchableOpacity>

            {/* 3. Formato Cédula / Carnet */}
            <TouchableOpacity
              style={[
                styles.presetCircleBtn,
                activePreset === 'id_card' && styles.presetCircleBtnActive,
              ]}
              onPress={() => handleApplyPreset('id_card')}
              disabled={isProcessing}
            >
              <Ionicons
                name="id-card-outline"
                size={22}
                color={activePreset === 'id_card' ? Colors.white : '#C084FC'}
              />
            </TouchableOpacity>

            {/* 4. Restablecer Original */}
            <TouchableOpacity
              style={[
                styles.presetCircleBtn,
                activePreset === 'original' && styles.presetCircleBtnActive,
              ]}
              onPress={() => handleApplyPreset('original')}
              disabled={isProcessing}
            >
              <Ionicons name="reload-outline" size={22} color={Colors.textSecondaryDark} />
            </TouchableOpacity>
          </View>

          {/* Action Footer Button */}
          <View style={styles.actionsFooter}>
            <AppButton
              title="Aplicar Recorte"
              iconName="checkmark-done"
              size="lg"
              variant="primary"
              onPress={handleApplyCrop}
              isLoading={isProcessing}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDark,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgElevatedDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  headerSpacer: {
    width: 44,
  },
  previewWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  imageFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    backgroundColor: '#05070B',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  dimOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  activeCropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.guideColor,
    backgroundColor: 'transparent',
  },
  gridLineH1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
  },
  gridLineH2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
  },
  gridLineV1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
  },
  gridLineV2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
  },
  cornerVisual: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: Colors.guideColor,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  edgeHandleH: {
    position: 'absolute',
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  edgePillH: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.guideColor,
  },
  edgeHandleV: {
    position: 'absolute',
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  edgePillV: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: Colors.guideColor,
  },
  touchHandle: {
    position: 'absolute',
    width: HANDLE_TOUCH_SIZE,
    height: HANDLE_TOUCH_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  handleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.guideColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },
  bottomSection: {
    backgroundColor: Colors.bgCardDark,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDark,
    gap: Spacing.md,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  presetCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgElevatedDark,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
  },
  presetCircleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  actionsFooter: {
    marginTop: Spacing.xs,
  },
});
