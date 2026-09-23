import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';
import { ScanMode, ScannedPage } from '../types';

export interface FrameLayoutInfo {
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  screenWidth: number;
  screenHeight: number;
}

interface CameraOverlayProps {
  flashMode: 'off' | 'on';
  onToggleFlash: () => void;
  scanMode?: ScanMode;
  onToggleScanMode?: () => void;
  pages: ScannedPage[];
  onCapture: () => void;
  onReview: () => void;
  onDeletePage: (pageId: string, pageIndex: number) => void;
  onDeleteLastPage?: () => void;
  onFrameLayout?: (info: FrameLayoutInfo) => void;
  isCapturing: boolean;
}

const windowDim = Dimensions.get('window');

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  flashMode,
  onToggleFlash,
  scanMode = 'document',
  onToggleScanMode,
  pages,
  onCapture,
  onReview,
  onDeletePage,
  onDeleteLastPage,
  onFrameLayout,
  isCapturing,
}) => {
  const isIdCard = scanMode === 'id_card';
  const pageCount = pages.length;

  const [containerDim, setContainerDim] = useState({
    width: windowDim.width,
    height: windowDim.height,
  });

  const [centerLayout, setCenterLayout] = useState({
    y: 80,
    height: windowDim.height - 200,
  });

  const frameWidth = containerDim.width * 0.9;
  const rawFrameHeight = isIdCard ? frameWidth * 0.63 : frameWidth * 1.38;
  const maxAllowedHeight = Math.max(120, centerLayout.height - 20);
  const frameHeight = Math.min(rawFrameHeight, maxAllowedHeight);

  // Compute and notify parent of frame coordinates whenever dimensions or mode change
  useEffect(() => {
    const screenWidth = containerDim.width;
    const screenHeight = containerDim.height;
    const frameX = (screenWidth - frameWidth) / 2;
    const frameY = centerLayout.y + (centerLayout.height - frameHeight) / 2;

    onFrameLayout?.({
      frameX,
      frameY,
      frameWidth,
      frameHeight,
      screenWidth,
      screenHeight,
    });
  }, [
    containerDim.width,
    containerDim.height,
    centerLayout.y,
    centerLayout.height,
    frameWidth,
    frameHeight,
    onFrameLayout,
  ]);

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) {
      setContainerDim({ width: w, height: h });
    }
  };

  const handleCenterLayout = (e: LayoutChangeEvent) => {
    const { y, height: h } = e.nativeEvent.layout;
    if (h > 0) {
      setCenterLayout({ y, height: h });
    }
  };

  return (
    <View
      style={styles.container}
      pointerEvents="box-none"
      onLayout={handleContainerLayout}
    >
      {/* Top Floating Controls Bar (Icons Only) */}
      <View style={styles.topBar}>
        {/* Mode Toggle Button: Document vs ID Card */}
        <TouchableOpacity
          style={[styles.iconButton, isIdCard && styles.iconButtonIdActive]}
          onPress={onToggleScanMode}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isIdCard ? 'id-card' : 'document-text-outline'}
            size={24}
            color={isIdCard ? '#C084FC' : Colors.white}
          />
        </TouchableOpacity>

        {/* Flash Toggle Button */}
        <TouchableOpacity
          style={[styles.iconButton, flashMode === 'on' && styles.iconButtonFlashActive]}
          onPress={onToggleFlash}
          activeOpacity={0.7}
        >
          <Ionicons
            name={flashMode === 'on' ? 'flash' : 'flash-off'}
            size={22}
            color={flashMode === 'on' ? '#FACC15' : Colors.white}
          />
        </TouchableOpacity>
      </View>

      {/* Center Viewfinder Guide (100% Unobstructed - No Text) */}
      <View
        style={styles.centerContainer}
        pointerEvents="none"
        onLayout={handleCenterLayout}
      >
        <View
          style={[
            styles.documentFrame,
            { width: frameWidth, height: frameHeight },
          ]}
        >
          {/* Neon Corner Brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      {/* Bottom Section: Scanned Mini-Thumbnails & Action Buttons */}
      <View style={styles.bottomSection}>
        {/* Horizontal Scanned Pages Carousel with Delete Buttons */}
        {pageCount > 0 && (
          <View style={styles.thumbnailCarouselContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList}
            >
              {pages.map((page, index) => (
                <View key={page.id} style={styles.thumbnailCard}>
                  <Image source={{ uri: page.uri }} style={styles.thumbnailImage} />

                  {/* Page Index Badge */}
                  <View style={styles.thumbnailBadge}>
                    <Text style={styles.thumbnailBadgeText}>{index + 1}</Text>
                  </View>

                  {/* Direct Delete Button */}
                  <TouchableOpacity
                    style={styles.deleteThumbnailBtn}
                    onPress={() => onDeletePage(page.id, index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={16} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom Shutter & Controls Row (Clean Icons Only) */}
        <View style={styles.bottomBar}>
          {/* Left Action: Quick Delete / Discard Last Button */}
          {pageCount > 0 && onDeleteLastPage ? (
            <TouchableOpacity
              style={styles.discardCircleBtn}
              onPress={onDeleteLastPage}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={24} color={Colors.danger} />
            </TouchableOpacity>
          ) : (
            <View style={styles.sideControlSlot} />
          )}

          {/* Center Action: Camera Shutter Button */}
          <TouchableOpacity
            style={[styles.shutterOuter, isCapturing && styles.shutterCapturing]}
            onPress={onCapture}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            <View style={styles.shutterInner}>
              <Ionicons name="camera" size={32} color={Colors.primaryDark} />
            </View>
          </TouchableOpacity>

          {/* Right Action: Continue / Review Button with Badge */}
          {pageCount > 0 ? (
            <TouchableOpacity
              style={styles.reviewCircleBtn}
              onPress={onReview}
              activeOpacity={0.8}
            >
              <View style={styles.pageBadge}>
                <Text style={styles.pageBadgeText}>{pageCount}</Text>
              </View>
              <Ionicons name="arrow-forward" size={22} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.sideControlSlot} />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + 20,
    backgroundColor: 'transparent',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  iconButtonIdActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.35)',
    borderColor: '#C084FC',
  },
  iconButtonFlashActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.3)',
    borderColor: '#FACC15',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentFrame: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.45)',
    backgroundColor: 'rgba(56, 189, 248, 0.02)',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: Colors.guideColor,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: BorderRadius.md,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: BorderRadius.md,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: BorderRadius.md,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: BorderRadius.md,
  },
  bottomSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingTop: Spacing.sm,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  thumbnailCarouselContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  thumbnailList: {
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  thumbnailCard: {
    width: 58,
    height: 78,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.bgCardDark,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  deleteThumbnailBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl + 10,
    paddingTop: Spacing.sm,
  },
  sideControlSlot: {
    width: 56,
    height: 56,
  },
  discardCircleBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
  },
  shutterCapturing: {
    transform: [{ scale: 0.92 }],
    borderColor: Colors.primaryLight,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewCircleBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  pageBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.white,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  pageBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: Typography.fontWeight.heavy,
  },
});
