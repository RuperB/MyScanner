import React, { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { AppButton, AppCard, AppInput } from '../components/UIComponents';
import { DriveHierarchyVisualizer } from '../components/DriveHierarchyVisualizer';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    userProfile,
    isAuthenticated,
    loginWithGoogle,
    loginWithManualToken,
    logout,
  } = useApp();

  const [phoneInput, setPhoneInput] = useState<string>(settings.phoneNumber || '');
  const [baseFolderInput, setBaseFolderInput] = useState<string>(settings.baseFolderName || 'MyScanner_Documents');
  const [clientIdInput, setClientIdInput] = useState<string>(settings.googleClientIdWeb || '');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const handleSaveGeneral = async () => {
    try {
      setIsSaving(true);
      await updateSettings({
        phoneNumber: phoneInput.trim(),
        baseFolderName: baseFolderInput.trim() || 'MyScanner_Documents',
        googleClientIdWeb: clientIdInput.trim(),
      });
      Alert.alert('Éxito', 'Configuración guardada correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      await loginWithGoogle();
      Alert.alert('¡Conectado!', 'Sesión iniciada con Google. Tu cuenta se renovará automáticamente.');
    } catch (error: any) {
      if (!error.message?.includes('cancelado')) {
        Alert.alert('Error de Google', error.message || 'No se pudo iniciar sesión con Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleConnectToken = async () => {
    if (!tokenInput.trim()) {
      Alert.alert('Error', 'Por favor ingresa un token de acceso válido.');
      return;
    }

    try {
      setIsSaving(true);
      await loginWithManualToken(tokenInput.trim());
      setTokenInput('');
      setShowTokenModal(false);
      Alert.alert('¡Conectado!', 'Tu cuenta de Google Drive ha sido vinculada.');
    } catch (error: any) {
      console.error('Error connecting with token:', error);
      Alert.alert('Error de Autenticación', error.message || 'Token inválido o expirado.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Desconectar Google Drive',
      '¿Estás seguro de que deseas cerrar sesión de Google?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Sesión Cerrada', 'Se ha desconectado tu cuenta de Google.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ajustes y Configuración</Text>
        <Text style={styles.headerSubtitle}>
          Configura tu número, directorio base y cuenta de Google Drive
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Cuenta de Google Drive (Login Automático con Refresh Token) */}
        <AppCard>
          <View style={styles.cardHeader}>
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={styles.cardTitle}>Cuenta de Google Drive</Text>
          </View>

          {isAuthenticated && userProfile ? (
            <View style={styles.profileContainer}>
              {userProfile.picture ? (
                <Image source={{ uri: userProfile.picture }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
                  <Text style={styles.profileAvatarText}>
                    {userProfile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userProfile.name}</Text>
                <Text style={styles.profileEmail}>{userProfile.email}</Text>
                <View style={styles.connectedBadge}>
                  <Ionicons name="shield-checkmark" size={14} color={Colors.accent} />
                  <Text style={styles.connectedText}>Sincronización permanente activa</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.notConnectedContainer}>
              <Text style={styles.notConnectedText}>
                Inicia sesión con tu cuenta de Google para habilitar la subida automática y permanente sin vencimiento de tokens.
              </Text>

              {/* Botón Principal de Inicio con Google */}
              <TouchableOpacity
                style={styles.googleLoginBtn}
                onPress={handleGoogleSignIn}
                disabled={isLoggingIn}
                activeOpacity={0.85}
              >
                <View style={styles.googleIconCircle}>
                  <Ionicons name="logo-google" size={18} color="#4285F4" />
                </View>
                <Text style={styles.googleLoginBtnText}>
                  {isLoggingIn ? 'Conectando con Google...' : 'Iniciar Sesión con Google'}
                </Text>
              </TouchableOpacity>

              {/* Acordeón Opcional para Token Manual */}
              <TouchableOpacity
                style={styles.manualTokenToggle}
                onPress={() => setShowTokenModal((prev) => !prev)}
              >
                <Ionicons name="key-outline" size={14} color={Colors.textMutedDark} />
                <Text style={styles.manualTokenToggleText}>
                  {showTokenModal ? 'Ocultar conexión manual' : 'Opciones avanzadas / Token manual'}
                </Text>
              </TouchableOpacity>

              {showTokenModal && (
                <View style={styles.tokenBox}>
                  <Text style={styles.tokenHelpText}>
                    Opción A: Pegar Access Token directo de Google (OAuth Playground o Bearer token):
                  </Text>
                  <AppInput
                    placeholder="Pega aquí tu Bearer Token (ya29...)"
                    value={tokenInput}
                    onChangeText={setTokenInput}
                    multiline
                    numberOfLines={3}
                    style={{ height: 75 }}
                  />
                  <AppButton
                    title="Validar y Conectar Cuenta"
                    iconName="shield-checkmark-outline"
                    variant="accent"
                    onPress={handleConnectToken}
                    isLoading={isSaving}
                    style={{ marginTop: 6, marginBottom: 12 }}
                  />

                  <Text style={styles.tokenHelpText}>
                    Opción B: Tu Google Client ID Web (Google Cloud Console):
                  </Text>
                  <AppInput
                    placeholder="Ej: xxx.apps.googleusercontent.com"
                    value={clientIdInput}
                    onChangeText={setClientIdInput}
                    iconName="key-outline"
                  />
                  <AppButton
                    title="Guardar Client ID"
                    iconName="save-outline"
                    variant="outline"
                    size="sm"
                    onPress={handleSaveGeneral}
                    isLoading={isSaving}
                    style={{ marginTop: 4 }}
                  />
                </View>
              )}
            </View>
          )}
        </AppCard>

        {/* 2. Datos Esenciales de Escaneo */}
        <AppCard>
          <View style={styles.cardHeader}>
            <Ionicons name="options-outline" size={20} color={Colors.primaryLight} />
            <Text style={styles.cardTitle}>Configuración de Directorios</Text>
          </View>

          <AppInput
            label="Número Celular del Dispositivo"
            placeholder="Ej: +573001234567"
            value={phoneInput}
            onChangeText={setPhoneInput}
            keyboardType="phone-pad"
            iconName="call-outline"
            helperText="Se utilizará para crear la subcarpeta de este escáner en Drive."
          />

          <AppInput
            label="Nombre del Directorio Base en Drive"
            placeholder="Ej: MyScanner_Documents o Mis Escaneos"
            value={baseFolderInput}
            onChangeText={setBaseFolderInput}
            iconName="folder-outline"
            helperText="Carpeta principal en tu Google Drive donde se alojarán los escaneos."
          />

          <AppButton
            title="Guardar Parámetros"
            iconName="checkmark"
            onPress={handleSaveGeneral}
            isLoading={isSaving}
            style={{ marginTop: Spacing.sm }}
          />
        </AppCard>

        {/* 3. Vista Previa de la Jerarquía en Drive */}
        <DriveHierarchyVisualizer
          baseFolder={baseFolderInput || settings.baseFolderName}
          phoneNumber={phoneInput || settings.phoneNumber}
          docType="[Tipo_Documental]"
          fileName="[Nombre]_[Fecha].pdf"
        />
      </ScrollView>
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
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.md,
  },
  profileAvatarFallback: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: Colors.white,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  profileEmail: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.xs,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  connectedText: {
    color: Colors.accent,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  logoutButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.bgElevatedDark,
    borderRadius: BorderRadius.full,
  },
  notConnectedContainer: {
    gap: Spacing.sm,
  },
  notConnectedText: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  googleLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleLoginBtnText: {
    color: '#1F2937',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  manualTokenToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  manualTokenToggleText: {
    color: Colors.textMutedDark,
    fontSize: Typography.fontSize.xs,
  },
  tokenBox: {
    backgroundColor: Colors.bgElevatedDark,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    marginTop: Spacing.xs,
  },
  tokenHelpText: {
    color: Colors.textMutedDark,
    fontSize: Typography.fontSize.xs,
    marginBottom: 6,
  },
});
