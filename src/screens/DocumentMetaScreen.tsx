import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { AppButton, AppInput, AppCard } from '../components/UIComponents';
import { DriveHierarchyVisualizer } from '../components/DriveHierarchyVisualizer';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';
import { DEFAULT_DOC_TYPES } from '../constants/docTypes';
import { formatScanDate, sanitizeFileName } from '../services/pdfService';

export const DocumentMetaScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { activePages, settings, updateSettings, isAuthenticated } = useApp();

  const [documentTitle, setDocumentTitle] = useState<string>('Escaneo');
  const [selectedDocType, setSelectedDocType] = useState<string>('Facturas');
  const [customTypeInput, setCustomTypeInput] = useState<string>('');
  const [isAddingCustomType, setIsAddingCustomType] = useState<boolean>(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>(settings.phoneNumber || '');

  const dateFormatted = formatScanDate(new Date());
  const previewFileName = `${sanitizeFileName(documentTitle) || 'Documento'}_${dateFormatted}.pdf`;

  const allDocTypes = [
    ...DEFAULT_DOC_TYPES.map((d) => d.name),
    ...settings.customDocTypes,
  ];

  const handleAddCustomType = () => {
    const trimmed = customTypeInput.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Ingresa un nombre para el tipo documental.');
      return;
    }
    if (allDocTypes.includes(trimmed)) {
      setSelectedDocType(trimmed);
      setIsAddingCustomType(false);
      setCustomTypeInput('');
      return;
    }

    updateSettings({
      customDocTypes: [...settings.customDocTypes, trimmed],
    });
    setSelectedDocType(trimmed);
    setIsAddingCustomType(false);
    setCustomTypeInput('');
  };

  const handleStartUpload = () => {
    const cleanTitle = documentTitle.trim();
    if (!cleanTitle) {
      Alert.alert('Campo Requerido', 'Por favor ingresa un nombre para el documento.');
      return;
    }

    const cleanPhone = (phoneNumberInput || settings.phoneNumber).trim();
    if (!cleanPhone) {
      Alert.alert(
        'Número de Teléfono Requerido',
        'Es necesario registrar el número de celular del dispositivo para organizar las carpetas en Google Drive.'
      );
      return;
    }

    // Update settings if phone changed
    if (cleanPhone !== settings.phoneNumber) {
      updateSettings({ phoneNumber: cleanPhone });
    }

    // Navigate to Upload Progress
    navigation.navigate('UploadProgress', {
      title: cleanTitle,
      docType: selectedDocType,
      phoneNumber: cleanPhone,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimaryDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Datos del Documento</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card: Nombre del Documento */}
          <AppCard>
            <Text style={styles.cardTitle}>1. Asignar Nombre al Archivo</Text>
            <AppInput
              label="Nombre del Documento"
              placeholder="Ej: Factura_Internet, Contrato_Casa"
              value={documentTitle}
              onChangeText={setDocumentTitle}
              iconName="document-text-outline"
            />
            <Text style={styles.helpText}>
              Se añadirá automáticamente la fecha y hora al final del archivo.
            </Text>
          </AppCard>

          {/* Card: Teléfono del Dispositivo */}
          <AppCard>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>2. Celular del Dispositivo</Text>
              <Ionicons name="phone-portrait-outline" size={18} color={Colors.accent} />
            </View>
            <AppInput
              label="Número de Teléfono (Escáner)"
              placeholder="Ej: +573001234567"
              value={phoneNumberInput}
              onChangeText={setPhoneNumberInput}
              keyboardType="phone-pad"
              iconName="call-outline"
              helperText="Crea o localiza la carpeta correspondiente a este número en tu Drive."
            />
          </AppCard>

          {/* Card: Selector de Tipo Documental */}
          <AppCard>
            <View style={styles.cardHeaderRow}>
              <View style={styles.titleTextContainer}>
                <Text style={styles.cardTitle}>3. Seleccionar Tipo Documental</Text>
                <Text style={styles.cardSubtitle}>
                  Subcarpeta donde se guardará este documento
                </Text>
              </View>

              {!isAddingCustomType && (
                <TouchableOpacity
                  onPress={() => setIsAddingCustomType(true)}
                  style={styles.addTypeCircleBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="add" size={22} color={Colors.primaryLight} />
                </TouchableOpacity>
              )}
            </View>

            {isAddingCustomType && (
              <View style={styles.newTypeBox}>
                <View style={styles.newTypeHeader}>
                  <Ionicons name="folder-outline" size={18} color={Colors.primaryLight} />
                  <Text style={styles.newTypeTitle}>Crear Nueva Categoría</Text>
                </View>
                <AppInput
                  placeholder="Ej: Extractos Bancarios, Garantías..."
                  value={customTypeInput}
                  onChangeText={setCustomTypeInput}
                  iconName="folder-outline"
                  autoFocus
                />
                <View style={styles.newTypeActionsStack}>
                  <AppButton
                    title="Guardar y Seleccionar Categoría"
                    iconName="checkmark-circle"
                    size="lg"
                    variant="primary"
                    onPress={handleAddCustomType}
                    style={{ width: '100%', marginBottom: 6 }}
                  />
                  <AppButton
                    title="Cancelar"
                    variant="ghost"
                    size="md"
                    onPress={() => {
                      setIsAddingCustomType(false);
                      setCustomTypeInput('');
                    }}
                    style={{ width: '100%' }}
                  />
                </View>
              </View>
            )}

            <View style={styles.docTypesGrid}>
              {allDocTypes.map((type) => {
                const isSelected = selectedDocType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.docTypeChip,
                      isSelected && styles.docTypeChipSelected,
                    ]}
                    onPress={() => setSelectedDocType(type)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.chipIconContainer,
                        isSelected && styles.chipIconContainerSelected,
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'folder-open-outline'}
                        size={18}
                        color={isSelected ? Colors.white : Colors.textSecondaryDark}
                      />
                    </View>
                    <Text
                      style={[
                        styles.docTypeChipText,
                        isSelected && styles.docTypeChipTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </AppCard>

          {/* Drive Path Hierarchy Visualizer */}
          <DriveHierarchyVisualizer
            baseFolder={settings.baseFolderName}
            phoneNumber={phoneNumberInput || settings.phoneNumber}
            docType={selectedDocType}
            fileName={previewFileName}
          />

          {!isAuthenticated && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={20} color={Colors.warning} />
              <Text style={styles.warningText}>
                No has conectado tu cuenta de Google Drive aún. Podrás guardar el PDF localmente o conectar tu cuenta en la siguiente pantalla / Ajustes.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Action */}
        <View style={styles.footer}>
          <AppButton
            title="Generar y Guardar"
            iconName="cloud-upload-outline"
            size="lg"
            onPress={handleStartUpload}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDark,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.bgElevatedDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  titleTextContainer: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  cardTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  cardSubtitle: {
    color: Colors.textMutedDark,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  helpText: {
    color: Colors.textMutedDark,
    fontSize: Typography.fontSize.xs,
    marginTop: 4,
  },
  addTypeCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevatedDark,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  newTypeBox: {
    backgroundColor: Colors.bgElevatedDark,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  newTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  newTypeTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  newTypeActionsStack: {
    marginTop: Spacing.sm,
    width: '100%',
  },
  docTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: Spacing.xs,
  },
  docTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.md - 2,
    backgroundColor: Colors.bgElevatedDark,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
  },
  docTypeChipSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderColor: Colors.primary,
  },
  chipIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipIconContainerSelected: {
    backgroundColor: Colors.primary,
  },
  docTypeChipText: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  docTypeChipTextSelected: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningMuted,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginVertical: Spacing.sm,
  },
  warningText: {
    color: Colors.warning,
    fontSize: Typography.fontSize.xs,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.bgCardDark,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDark,
  },
});
