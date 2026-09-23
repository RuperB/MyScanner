import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { AppButton } from '../components/UIComponents';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';
import { imageProcessorService } from '../services/imageProcessorService';
import { InteractiveCropOverlay } from '../components/InteractiveCropOverlay';

const { width } = Dimensions.get('window');
const PREVIEW_WIDTH = width * 0.85;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.35;

export const ReviewCropScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { activePages, updateScannedPage, removeScannedPage } = useApp();
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);

  const currentPage = activePages[currentPageIndex] || activePages[0];

  const handleRotate = async () => {
    if (!currentPage || isProcessing) return;
    try {
      setIsProcessing(true);
      const updated = await imageProcessorService.rotatePageClockwise(currentPage);
      updateScannedPage(updated);
    } catch (error) {
      console.error('Error rotating page:', error);
      Alert.alert('Error', 'No se pudo rotar la página.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePage = () => {
    if (!currentPage) return;

    Alert.alert(
      'Eliminar Página',
      `¿Deseas eliminar la página ${currentPageIndex + 1}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            removeScannedPage(currentPage.id);
            if (activePages.length <= 1) {
              navigation.goBack();
            } else if (currentPageIndex >= activePages.length - 1) {
              setCurrentPageIndex(activePages.length - 2);
            }
          },
        },
      ]
    );
  };

  const handleAddMorePages = () => {
    navigation.goBack();
  };

  const handleProceedToMetadata = () => {
    if (activePages.length === 0) {
      Alert.alert('Aviso', 'No hay páginas para generar el documento.');
      return;
    }
    navigation.navigate('DocumentMeta');
  };

  if (!currentPage) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay páginas en esta sesión.</Text>
        <AppButton title="Regresar a la Cámara" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar (Icons + Minimalist Counter) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimaryDark} />
        </TouchableOpacity>

        <View style={styles.pageIndicatorContainer}>
          <Text style={styles.pageIndicatorText}>
            {currentPageIndex + 1} / {activePages.length}
          </Text>
        </View>

        <TouchableOpacity style={styles.topBarButtonDanger} onPress={handleDeletePage}>
          <Ionicons name="trash-outline" size={22} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Main Page Preview */}
      <View style={styles.previewContainer}>
        <View style={styles.imageCard}>
          <Image
            source={{ uri: currentPage.uri }}
            style={styles.imagePreview}
            resizeMode="contain"
          />
        </View>

        {/* Previous / Next Chevron Navigation */}
        {activePages.length > 1 && (
          <View style={styles.navArrowsContainer}>
            <TouchableOpacity
              style={[styles.arrowButton, currentPageIndex === 0 && styles.arrowDisabled]}
              disabled={currentPageIndex === 0}
              onPress={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
            >
              <Ionicons
                name="chevron-back"
                size={26}
                color={currentPageIndex === 0 ? Colors.borderDark : Colors.white}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.arrowButton,
                currentPageIndex === activePages.length - 1 && styles.arrowDisabled,
              ]}
              disabled={currentPageIndex === activePages.length - 1}
              onPress={() =>
                setCurrentPageIndex((prev) => Math.min(activePages.length - 1, prev + 1))
              }
            >
              <Ionicons
                name="chevron-forward"
                size={26}
                color={
                  currentPageIndex === activePages.length - 1
                    ? Colors.borderDark
                    : Colors.white
                }
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Action Controls */}
      <View style={styles.bottomControls}>
        {/* Quick Tools Row (Crop, Rotate, Add) - Clean Icon Buttons */}
        <View style={styles.toolsRow}>
          {/* Crop / Adjust Edges */}
          <TouchableOpacity
            style={[styles.toolCircleBtn, styles.toolCircleBtnCrop]}
            onPress={() => setShowCropModal(true)}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Ionicons name="crop" size={24} color={Colors.guideColor} />
          </TouchableOpacity>

          {/* Rotate 90° */}
          <TouchableOpacity
            style={styles.toolCircleBtn}
            onPress={handleRotate}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color={Colors.textPrimaryDark} />
          </TouchableOpacity>

          {/* Add Page / Camera */}
          <TouchableOpacity
            style={[styles.toolCircleBtn, styles.toolCircleBtnAdd]}
            onPress={handleAddMorePages}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={24} color={Colors.primaryLight} />
          </TouchableOpacity>
        </View>

        {/* Primary Proceed Button */}
        <AppButton
          title="Continuar"
          iconName="arrow-forward"
          iconPosition="right"
          size="lg"
          onPress={handleProceedToMetadata}
          style={styles.nextButton}
        />
      </View>

      {/* Interactive Crop Modal */}
      <InteractiveCropOverlay
        visible={showCropModal}
        page={currentPage}
        onClose={() => setShowCropModal(false)}
        onApplyCroppedPage={(updated) => updateScannedPage(updated)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgDark,
    padding: Spacing.xl,
  },
  emptyText: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.md,
    marginBottom: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDark,
  },
  topBarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgElevatedDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  topBarButtonDanger: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  pageIndicatorContainer: {
    backgroundColor: Colors.bgCardDark,
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  pageIndicatorText: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: Spacing.sm,
  },
  imageCard: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    backgroundColor: Colors.bgCardDark,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderDark,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  navArrowsContainer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    pointerEvents: 'box-none',
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(19, 27, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  arrowDisabled: {
    backgroundColor: 'rgba(19, 27, 42, 0.3)',
    borderColor: 'transparent',
  },
  bottomControls: {
    backgroundColor: Colors.bgCardDark,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDark,
    gap: Spacing.md,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  toolCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.bgElevatedDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
  },
  toolCircleBtnCrop: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  toolCircleBtnAdd: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderColor: 'rgba(96, 165, 250, 0.5)',
  },
  nextButton: {
    marginTop: Spacing.xs,
  },
});
