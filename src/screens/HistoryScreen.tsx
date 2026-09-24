import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { AppButton, AppCard, AppInput, StatusBadge } from '../components/UIComponents';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';
import { ScannedDocument } from '../types';
import { googleDriveService } from '../services/googleDriveService';

export const HistoryScreen: React.FC = () => {
  const {
    documents,
    deleteScannedDocument,
    saveScannedDocument,
    settings,
    accessToken,
    isAuthenticated,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilterType, setSelectedFilterType] = useState<string>('Todos');
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  const filterCategories = [
    'Todos',
    ...Array.from(new Set(documents.map((d) => d.docType))).filter(Boolean),
  ];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.pdfFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.docType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedFilterType === 'Todos' || doc.docType === selectedFilterType;

    return matchesSearch && matchesType;
  });

  const handleShare = async (doc: ScannedDocument) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && doc.pdfUri) {
        await Sharing.shareAsync(doc.pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Compartir ${doc.title}`,
        });
      } else if (Platform.OS === 'web' && typeof document !== 'undefined' && doc.pdfUri) {
        const link = document.createElement('a');
        link.href = doc.pdfUri;
        link.download = doc.pdfFileName || `${doc.title}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Alert.alert('Aviso', 'Función de compartir no disponible.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleOpenDrive = (doc: ScannedDocument) => {
    if (doc.driveWebViewLink) {
      Linking.openURL(doc.driveWebViewLink);
    }
  };

  const handleRetryUpload = async (doc: ScannedDocument) => {
    if (!isAuthenticated || !accessToken) {
      Alert.alert(
        'Cuenta de Google no conectada',
        'Ve a la pestaña de "Ajustes" para conectar tu cuenta de Google Drive.'
      );
      return;
    }

    try {
      setUploadingDocId(doc.id);
      const driveResult = await googleDriveService.executeFullUploadFlow(
        doc.pdfUri,
        doc.pdfFileName,
        settings.baseFolderName,
        doc.phoneNumber || settings.phoneNumber,
        doc.docType,
        accessToken
      );

      const updated: ScannedDocument = {
        ...doc,
        uploadStatus: 'synced',
        driveFileId: driveResult.fileId,
        driveWebViewLink: driveResult.webViewLink,
        driveFolderHierarchy: {
          baseFolderId: driveResult.baseFolderId,
          phoneFolderId: driveResult.phoneFolderId,
          docTypeFolderId: driveResult.docTypeFolderId,
        },
      };

      await saveScannedDocument(updated);
      Alert.alert('Éxito', '¡Documento subido a Google Drive correctamente!');
    } catch (error: any) {
      console.error('Error uploading doc:', error);
      Alert.alert('Error', error.message || 'No se pudo subir a Google Drive.');
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleDelete = (doc: ScannedDocument) => {
    Alert.alert(
      'Eliminar Documento',
      `¿Deseas eliminar "${doc.title}" del historial local?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteScannedDocument(doc.id),
        },
      ]
    );
  };

  const renderDocumentItem = ({ item }: { item: ScannedDocument }) => {
    const dateFormatted = new Date(item.createdAt).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isUploadingThis = uploadingDocId === item.id;

    return (
      <AppCard style={styles.docCard}>
        {/* Card Header */}
        <View style={styles.docCardHeader}>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.docDate}>{dateFormatted}</Text>
          </View>
          <StatusBadge status={item.uploadStatus} />
        </View>

        {/* Doc Metadata Details */}
        <View style={styles.docMetaGrid}>
          <View style={styles.docMetaItem}>
            <Ionicons name="folder-outline" size={14} color={Colors.textSecondaryDark} />
            <Text style={styles.docMetaText}>{item.docType}</Text>
          </View>
          <View style={styles.docMetaItem}>
            <Ionicons name="documents-outline" size={14} color={Colors.textSecondaryDark} />
            <Text style={styles.docMetaText}>{item.pageCount} pág.</Text>
          </View>
          <View style={styles.docMetaItem}>
            <Ionicons name="call-outline" size={14} color={Colors.textSecondaryDark} />
            <Text style={styles.docMetaText}>{item.phoneNumber || 'Sin cel'}</Text>
          </View>
          {item.pdfSize ? (
            <View style={styles.docMetaItem}>
              <Ionicons name="document-text-outline" size={14} color={Colors.textSecondaryDark} />
              <Text style={styles.docMetaText}>{(item.pdfSize / 1024).toFixed(0)} KB</Text>
            </View>
          ) : null}
        </View>

        {/* Actions Row */}
        <View style={styles.docActionsRow}>
          {item.uploadStatus === 'synced' ? (
            <TouchableOpacity
              style={[styles.actionChip, styles.actionChipDrive]}
              onPress={() => handleOpenDrive(item)}
            >
              <Ionicons name="logo-google" size={14} color="#4285F4" />
              <Text style={styles.actionChipText}>Ver en Drive</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionChip, styles.actionChipUpload]}
              onPress={() => handleRetryUpload(item)}
              disabled={isUploadingThis}
            >
              <Ionicons
                name={isUploadingThis ? 'refresh' : 'cloud-upload-outline'}
                size={14}
                color={Colors.warning}
              />
              <Text style={[styles.actionChipText, { color: Colors.warning }]}>
                {isUploadingThis ? 'Subiendo...' : 'Subir a Drive'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionChip}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="share-outline" size={14} color={Colors.textPrimaryDark} />
            <Text style={styles.actionChipText}>Compartir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionChip, styles.actionChipDelete]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={14} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Historial de Escaneos</Text>
          <Text style={styles.headerSubtitle}>
            {documents.length} {documents.length === 1 ? 'documento guardado' : 'documentos guardados'}
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <AppInput
          placeholder="Buscar por nombre o tipo..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          iconName="search-outline"
        />
      </View>

      {/* Filter Categories */}
      {filterCategories.length > 1 && (
        <View style={styles.filtersWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterCategories}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filtersList}
            renderItem={({ item }) => {
              const isSelected = selectedFilterType === item;
              return (
                <TouchableOpacity
                  style={[styles.filterTab, isSelected && styles.filterTabActive]}
                  onPress={() => setSelectedFilterType(item)}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      isSelected && styles.filterTabTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Documents List */}
      <FlatList
        data={filteredDocs}
        keyExtractor={(item) => item.id}
        renderItem={renderDocumentItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={Colors.textMutedDark} />
            <Text style={styles.emptyTitle}>No hay documentos</Text>
            <Text style={styles.emptySubtitle}>
              Los documentos que escanees se guardarán aquí automáticamente.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  headerTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
  },
  headerSubtitle: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  filtersWrapper: {
    marginBottom: Spacing.xs,
  },
  filtersList: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.bgCardDark,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  filterTabText: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  filterTabTextActive: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  docCard: {
    marginVertical: 4,
    padding: Spacing.md,
  },
  docCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  docTitleBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  docTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  docDate: {
    color: Colors.textMutedDark,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  docMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: Spacing.xs,
  },
  docMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docMetaText: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.xs,
  },
  docActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: Spacing.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bgElevatedDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  actionChipDrive: {
    borderColor: 'rgba(66, 133, 244, 0.4)',
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
  },
  actionChipUpload: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: Colors.warningMuted,
  },
  actionChipDelete: {
    paddingHorizontal: Spacing.sm + 2,
  },
  actionChipText: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    color: Colors.textMutedDark,
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    maxWidth: 260,
    marginTop: 4,
  },
});
