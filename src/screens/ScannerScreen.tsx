import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { CameraOverlay, FrameLayoutInfo } from '../components/CameraOverlay';
import { AppButton } from '../components/UIComponents';
import { Colors, Spacing, Typography } from '../constants/theme';
import { CropRect, ScanMode, ScannedPage } from '../types';
import { imageProcessorService } from '../services/imageProcessorService';

export const ScannerScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const frameLayoutRef = useRef<FrameLayoutInfo | null>(null);

  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [scanMode, setScanMode] = useState<ScanMode>('document');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const { activePages, addScannedPage, removeScannedPage, settings } = useApp();

  const handleFrameLayout = useCallback((info: FrameLayoutInfo) => {
    frameLayoutRef.current = info;
  }, []);

  const handleDeletePage = (pageId: string, pageIndex: number) => {
    const isId = scanMode === 'id_card';
    const label = isId
      ? pageIndex === 0
        ? 'Frente de la cédula'
        : 'Reverso de la cédula'
      : `página ${pageIndex + 1}`;

    Alert.alert(
      'Eliminar Imagen',
      `¿Deseas eliminar la ${label} de la lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => removeScannedPage(pageId),
        },
      ]
    );
  };

  const handleDeleteLastPage = () => {
    if (activePages.length === 0) return;
    const lastIndex = activePages.length - 1;
    const lastPage = activePages[lastIndex];
    handleDeletePage(lastPage.id, lastIndex);
  };

  const handleToggleFlash = () => {
    setFlashMode((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  const handleToggleScanMode = () => {
    setScanMode((prev) => (prev === 'document' ? 'id_card' : 'document'));
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: settings.compressionQuality || 0.85,
        skipProcessing: false,
      });

      if (photo && photo.uri) {
        const isIdCard = scanMode === 'id_card';
        const defaultFilter = isIdCard ? 'magic' : (settings.defaultFilter || 'enhanced');

        // Automatically crop the photo to EXACTLY what was framed inside the viewfinder
        let cropRect: CropRect | undefined = undefined;
        if (frameLayoutRef.current && photo.width && photo.height) {
          const layout = frameLayoutRef.current;
          cropRect = imageProcessorService.calculateFrameCrop(
            photo.width,
            photo.height,
            layout.screenWidth,
            layout.screenHeight,
            layout.frameX,
            layout.frameY,
            layout.frameWidth,
            layout.frameHeight
          );
        }

        const processed = await imageProcessorService.processPage(
          photo.uri,
          0,
          defaultFilter,
          settings.compressionQuality || 0.85,
          cropRect
        );

        const newPage: ScannedPage = {
          id: 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          uri: processed.uri,
          originalUri: photo.uri,
          width: processed.width,
          height: processed.height,
          rotation: 0,
          filter: defaultFilter,
          cropRect,
          scanMode,
          isIdCardBack: isIdCard && activePages.length === 1,
          capturedAt: Date.now(),
        };

        addScannedPage(newPage);

        // Friendly guidance for ID Card
        if (isIdCard && activePages.length === 0) {
          Alert.alert('¡Frente Capturado!', 'Ahora gira la cédula y captura el REVERSO.');
        }
      }
    } catch (error) {
      console.error('Error capturing document page:', error);
      Alert.alert('Error', 'No se pudo capturar la página. Intenta nuevamente.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleReview = () => {
    if (activePages.length === 0) {
      Alert.alert('Aviso', 'Escanea al menos una página para continuar.');
      return;
    }
    navigation.navigate('ReviewCrop');
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Verificando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIconCircle}>
            <Ionicons name="camera-outline" size={48} color={Colors.primaryLight} />
          </View>
          <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
          <Text style={styles.permissionDescription}>
            MyScanner necesita acceso a la cámara de tu dispositivo para escanear y digitalizar tus documentos en alta resolución.
          </Text>
          <AppButton
            title="Conceder Permiso de Cámara"
            iconName="checkmark-circle-outline"
            size="lg"
            onPress={requestPermission}
            style={styles.permissionButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashMode === 'on'}
      />

      <CameraOverlay
        flashMode={flashMode}
        onToggleFlash={handleToggleFlash}
        scanMode={scanMode}
        onToggleScanMode={handleToggleScanMode}
        pages={activePages}
        onCapture={handleCapture}
        onReview={handleReview}
        onDeletePage={handleDeletePage}
        onDeleteLastPage={handleDeleteLastPage}
        onFrameLayout={handleFrameLayout}
        isCapturing={isCapturing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgDark,
  },
  loadingText: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.md,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionContent: {
    alignItems: 'center',
    maxWidth: 340,
  },
  permissionIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  permissionTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  permissionDescription: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    width: '100%',
  },
});
