import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

interface DriveHierarchyVisualizerProps {
  baseFolder: string;
  phoneNumber: string;
  docType: string;
  fileName?: string;
  activeStep?: 'base' | 'phone' | 'doctype' | 'file' | null;
}

export const DriveHierarchyVisualizer: React.FC<DriveHierarchyVisualizerProps> = ({
  baseFolder,
  phoneNumber,
  docType,
  fileName,
  activeStep = null,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="logo-google" size={18} color="#4285F4" />
        <Text style={styles.title}>Ruta en Google Drive</Text>
      </View>

      <View style={styles.treeContainer}>
        {/* Nivel 0: Mi Unidad */}
        <View style={styles.treeRow}>
          <Ionicons name="cloud-outline" size={16} color={Colors.textSecondaryDark} />
          <Text style={styles.rootText}>Mi Unidad (Google Drive)</Text>
        </View>

        {/* Nivel 1: Carpeta Base */}
        <View style={[styles.treeRow, styles.indent1, activeStep === 'base' && styles.activeRow]}>
          <Text style={styles.treeBranch}>└──</Text>
          <Ionicons
            name="folder"
            size={18}
            color={activeStep === 'base' ? Colors.warning : Colors.primaryLight}
          />
          <View style={styles.nodeTextContainer}>
            <Text style={styles.nodeLabel}>1. Directorio Base:</Text>
            <Text style={styles.nodeValue}>{baseFolder || 'Sin configurar'}</Text>
          </View>
        </View>

        {/* Nivel 2: Carpeta Teléfono */}
        <View style={[styles.treeRow, styles.indent2, activeStep === 'phone' && styles.activeRow]}>
          <Text style={styles.treeBranch}>└──</Text>
          <Ionicons
            name="call"
            size={16}
            color={activeStep === 'phone' ? Colors.warning : Colors.accent}
          />
          <View style={styles.nodeTextContainer}>
            <Text style={styles.nodeLabel}>2. Celular del Dispositivo:</Text>
            <Text style={styles.nodeValue}>{phoneNumber || 'No especificado'}</Text>
          </View>
        </View>

        {/* Nivel 3: Carpeta Tipo Documental */}
        <View style={[styles.treeRow, styles.indent3, activeStep === 'doctype' && styles.activeRow]}>
          <Text style={styles.treeBranch}>└──</Text>
          <Ionicons
            name="folder-open"
            size={16}
            color={activeStep === 'doctype' ? Colors.warning : '#A855F7'}
          />
          <View style={styles.nodeTextContainer}>
            <Text style={styles.nodeLabel}>3. Tipo Documental:</Text>
            <Text style={styles.nodeValue}>{docType || 'Sin clasificar'}</Text>
          </View>
        </View>

        {/* Nivel 4: Archivo PDF final */}
        {fileName ? (
          <View style={[styles.treeRow, styles.indent4, activeStep === 'file' && styles.activeRow]}>
            <Text style={styles.treeBranch}>└──</Text>
            <Ionicons
              name="document-text"
              size={16}
              color={activeStep === 'file' ? Colors.accent : Colors.danger}
            />
            <View style={styles.nodeTextContainer}>
              <Text style={styles.nodeLabel}>4. Archivo PDF:</Text>
              <Text style={[styles.nodeValue, styles.fileNameText]} numberOfLines={1}>
                {fileName}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgElevatedDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  treeContainer: {
    gap: 8,
  },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.sm,
  },
  activeRow: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  indent1: {
    marginLeft: 10,
  },
  indent2: {
    marginLeft: 24,
  },
  indent3: {
    marginLeft: 38,
  },
  indent4: {
    marginLeft: 52,
  },
  treeBranch: {
    color: Colors.textMutedDark,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  rootText: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  nodeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  nodeLabel: {
    color: Colors.textMutedDark,
    fontSize: Typography.fontSize.xs,
  },
  nodeValue: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  fileNameText: {
    color: '#38BDF8',
  },
});
