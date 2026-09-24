import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { AppButton, AppCard } from '../components/UIComponents';
import { DriveHierarchyVisualizer } from '../components/DriveHierarchyVisualizer';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';
import { ScannedDocument, UploadStep } from '../types';
import { pdfService } from '../services/pdfService';
import { googleDriveService } from '../services/googleDriveService';
import { googleAuthService } from '../services/googleAuthService';

type RouteParams = {
  UploadProgress: {
    title: string;
    docType: string;
    phoneNumber: string;
  };
};

export const UploadProgressScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'UploadProgress'>>();
  const { title, docType, phoneNumber } = route.params;

  const {
    activePages,
    settings,
    accessToken,
    isAuthenticated,
    saveScannedDocument,
    clearActiveSession,
  } = useApp();

  const [currentStep, setCurrentStep] = useState<UploadStep>('generating_pdf');
  const [stepDetail, setStepDetail] = useState<string>('Generando archivo PDF...');
  const [createdDoc, setCreatedDoc] = useState<ScannedDocument | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function executeProcess() {
      try {
        // 1. Generar archivo PDF local
        setCurrentStep('generating_pdf');
        setStepDetail(`Ensamblando ${activePages.length} página(s) en PDF...`);

        const scanDate = new Date();
        const isIdCardMode =
          activePages.length === 2 &&
          (activePages.some((p) => p.scanMode === 'id_card') || docType.toLowerCase().includes('cédula') || docType.toLowerCase().includes('cedula'));

        const pdfResult = await pdfService.createPdfFromPages(
          activePages,
          title,
          scanDate,
          isIdCardMode
        );

        const newDoc: ScannedDocument = {
          id: 'doc_' + Date.now(),
          title,
          docType,
          pages: [...activePages],
          pageCount: activePages.length,
          pdfUri: pdfResult.uri,
          pdfFileName: pdfResult.fileName,
          pdfSize: pdfResult.size,
          createdAt: scanDate.getTime(),
          updatedAt: scanDate.getTime(),
          phoneNumber,
          baseFolder: settings.baseFolderName,
          uploadStatus: 'local_only',
        };

        // 2. Subida a Google Drive (si está autenticado)
        const validToken = accessToken || (await googleAuthService.getValidAccessToken());

        if (validToken && validToken.trim().length > 10) {
          try {
            setCurrentStep('resolving_base_folder');
            const driveResult = await googleDriveService.executeFullUploadFlow(
              pdfResult.uri,
              pdfResult.fileName,
              settings.baseFolderName,
              phoneNumber,
              docType,
              validToken.trim(),
              (step, details) => {
                if (isMounted) {
                  setCurrentStep(step);
                  setStepDetail(details);
                }
              }
            );

            newDoc.uploadStatus = 'synced';
            newDoc.driveFileId = driveResult.fileId;
            newDoc.driveWebViewLink = driveResult.webViewLink;
            newDoc.driveFolderHierarchy = {
              baseFolderId: driveResult.baseFolderId,
              phoneFolderId: driveResult.phoneFolderId,
              docTypeFolderId: driveResult.docTypeFolderId,
            };
          } catch (driveError: any) {
            console.error('Error during Google Drive upload:', driveError);
            newDoc.uploadStatus = 'error';
            const rawMsg = driveError.message || '';
            const isAuthError = rawMsg.includes('401') || rawMsg.includes('UNAUTHENTICATED') || rawMsg.includes('Invalid Credentials');
            
            const userFriendlyMsg = isAuthError
              ? 'Tu token de Google Drive ha expirado (duran 1 hora) o es inválido. El PDF se guardó en tu Historial local. Ve a Ajustes e ingresa un nuevo token de acceso para subirlo.'
              : rawMsg || 'Error al conectar con Google Drive';

            newDoc.errorMessage = userFriendlyMsg;
            if (isMounted) {
              setErrorMessage(userFriendlyMsg);
            }
          }
        } else {
          setStepDetail('Guardado localmente. Conecta tu cuenta en Ajustes para sincronizar.');
        }

        // 3. Guardar documento en BD local
        await saveScannedDocument(newDoc);
        if (isMounted) {
          setCreatedDoc(newDoc);
          setCurrentStep('completed');
          clearActiveSession();
        }
      } catch (err: any) {
        console.error('Fatal error during PDF generation/upload:', err);
        if (isMounted) {
          setCurrentStep('error');
          setErrorMessage(err.message || 'Ocurrió un error inesperado.');
        }
      }
    }

    executeProcess();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleShare = async () => {
    if (!createdDoc?.pdfUri) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(createdDoc.pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir PDF',
        });
      } else if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.href = createdDoc.pdfUri;
        link.download = createdDoc.pdfFileName || `${title}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Alert.alert('Aviso', 'La función de compartir no está disponible en este dispositivo.');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
    }
  };

  const handleOpenInDrive = () => {
    if (createdDoc?.driveWebViewLink) {
      Linking.openURL(createdDoc.driveWebViewLink);
    }
  };

  const handleDone = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const getActiveStepVisual = (): 'base' | 'phone' | 'doctype' | 'file' | null => {
    switch (currentStep) {
      case 'resolving_base_folder':
        return 'base';
      case 'resolving_phone_folder':
        return 'phone';
      case 'resolving_doctype_folder':
        return 'doctype';
      case 'uploading_file':
      case 'completed':
        return 'file';
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Status */}
        <View style={styles.statusHeader}>
          {currentStep === 'completed' ? (
            <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
              <Ionicons name="checkmark-done" size={42} color={Colors.accent} />
            </View>
          ) : currentStep === 'error' ? (
            <View style={[styles.iconCircle, styles.iconCircleError]}>
              <Ionicons name="alert-circle" size={42} color={Colors.danger} />
            </View>
          ) : (
            <View style={styles.iconCircle}>
              <ActivityIndicator size="large" color={Colors.primaryLight} />
            </View>
          )}

          <Text style={styles.statusTitle}>
            {currentStep === 'completed'
              ? createdDoc?.uploadStatus === 'synced'
                ? '¡Sincronizado con Google Drive!'
                : '¡PDF Guardado en tu Celular!'
              : currentStep === 'error'
              ? 'Error en el proceso'
              : 'Procesando Documento'}
          </Text>

          <Text style={styles.statusSubtitle}>{stepDetail}</Text>
        </View>

        {/* Tree hierarchy animation/viewer */}
        <DriveHierarchyVisualizer
          baseFolder={settings.baseFolderName}
          phoneNumber={phoneNumber}
          docType={docType}
          fileName={createdDoc?.pdfFileName || `${title}.pdf`}
          activeStep={getActiveStepVisual()}
        />

        {/* Error Details Card if needed */}
        {errorMessage && (
          <AppCard style={styles.errorCard}>
            <View style={styles.errorRow}>
              <Ionicons name="warning" size={20} color={Colors.danger} />
              <Text style={styles.errorTitle}>Detalle del Error:</Text>
            </View>
            <Text style={styles.errorMessageText}>{errorMessage}</Text>
            <Text style={styles.errorAdviceText}>
              El PDF quedó guardado localmente en tu historial para reenviarlo cuando lo desees.
            </Text>
          </AppCard>
        )}

        {/* Success Card */}
        {currentStep === 'completed' && (
          <AppCard>
            <Text style={styles.cardSectionTitle}>Resumen del Documento</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Archivo:</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {createdDoc?.pdfFileName}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Páginas:</Text>
              <Text style={styles.metaValue}>{createdDoc?.pageCount} pág.</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Tamaño:</Text>
              <Text style={styles.metaValue}>
                {createdDoc?.pdfSize
                  ? `${(createdDoc.pdfSize / 1024).toFixed(1)} KB`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Estado:</Text>
              <Text
                style={[
                  styles.metaValue,
                  {
                    color:
                      createdDoc?.uploadStatus === 'synced'
                        ? Colors.accent
                        : Colors.warning,
                  },
                ]}
              >
                {createdDoc?.uploadStatus === 'synced'
                  ? 'Subido a Google Drive'
                  : 'Guardado Local'}
              </Text>
            </View>
          </AppCard>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {currentStep === 'completed' && (
          <>
            {createdDoc?.driveWebViewLink && (
              <AppButton
                title="Abrir en Google Drive"
                iconName="open-outline"
                variant="accent"
                onPress={handleOpenInDrive}
                style={styles.actionBtn}
              />
            )}
            <AppButton
              title="Compartir Archivo PDF"
              iconName="share-social-outline"
              variant="secondary"
              onPress={handleShare}
              style={styles.actionBtn}
            />
            <AppButton
              title="Escanear Otro Documento"
              iconName="scan-outline"
              variant="primary"
              onPress={handleDone}
              style={styles.actionBtn}
            />
          </>
        )}

        {currentStep === 'error' && (
          <AppButton
            title="Volver al Inicio"
            iconName="home-outline"
            variant="primary"
            onPress={handleDone}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statusHeader: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircleSuccess: {
    backgroundColor: Colors.accentMuted,
  },
  iconCircleError: {
    backgroundColor: Colors.dangerMuted,
  },
  statusTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: 6,
  },
  statusSubtitle: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    maxWidth: 320,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  errorTitle: {
    color: Colors.danger,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  errorMessageText: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.xs,
    marginBottom: 8,
  },
  errorAdviceText: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.xs,
  },
  cardSectionTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metaLabel: {
    color: Colors.textMutedDark,
    fontSize: Typography.fontSize.sm,
  },
  metaValue: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    maxWidth: '65%',
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.bgCardDark,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDark,
    gap: Spacing.sm,
  },
  actionBtn: {
    marginBottom: 2,
  },
});
