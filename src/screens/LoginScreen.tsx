import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { AppButton, AppInput } from '../components/UIComponents';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

const { width } = Dimensions.get('window');

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { loginWithGoogle, loginWithManualToken, isAuthenticated, userProfile } = useApp();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigation.navigate('MainTabs');
    }
  }, [isAuthenticated, navigation]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await loginWithGoogle();
      navigation.navigate('MainTabs');
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      if (!error.message?.includes('cancelado') && !error.message?.includes('cancel')) {
        Alert.alert(
          'Conexión Google Drive',
          error.message || 'No se pudo iniciar sesión. Puedes ingresar tu token directamente o continuar en modo local.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTokenSubmit = async () => {
    if (!tokenInput.trim()) {
      Alert.alert('Error', 'Ingresa un token de acceso válido de Google OAuth.');
      return;
    }
    try {
      setIsLoading(true);
      await loginWithManualToken(tokenInput.trim());
      Alert.alert('¡Conectado!', 'Cuenta de Google Drive vinculada exitosamente.', [
        {
          text: 'Continuar a la App',
          onPress: () => navigation.navigate('MainTabs'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error de Autenticación', error.message || 'Token inválido o expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipLogin = () => {
    navigation.navigate('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Logo & App Branding */}
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="scan" size={48} color={Colors.primaryLight} />
            <View style={styles.badgeSparkle}>
              <Ionicons name="sparkles" size={16} color="#FACC15" />
            </View>
          </View>

          <Text style={styles.appTitle}>MyScanner</Text>
          <Text style={styles.appSubtitle}>
            Digitalización móvil de alta fidelidad con sincronización en Google Drive
          </Text>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Ionicons name="crop" size={24} color={Colors.guideColor} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Recorte y Realce Inteligente</Text>
              <Text style={styles.featureDesc}>
                Detecta y recorta bordes automáticamente con filtros de alto contraste.
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="id-card" size={24} color="#C084FC" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Modo Cédula / Carnet (2 Caras)</Text>
              <Text style={styles.featureDesc}>
                Captura frente y reverso y genera un PDF en una sola hoja estándar.
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="cloud-upload" size={24} color={Colors.accent} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Sincronización Permanente en Drive</Text>
              <Text style={styles.featureDesc}>
                Subida automática con estructura dinámica por teléfono y tipo documental.
              </Text>
            </View>
          </View>
        </View>

        {/* Actions Area */}
        <View style={styles.actionsContainer}>
          {/* Main Google Sign In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.primaryDark} size="small" />
            ) : (
              <>
                <View style={styles.googleIconCircle}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                </View>
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Manual Token Option (Direct connect) */}
          <TouchableOpacity
            style={styles.manualTokenToggle}
            onPress={() => setShowTokenInput((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons name="key-outline" size={14} color={Colors.textMutedDark} />
            <Text style={styles.manualTokenToggleText}>
              {showTokenInput ? 'Ocultar conexión por Token' : '¿Tienes un Token OAuth / Playground? Conectar aquí'}
            </Text>
          </TouchableOpacity>

          {showTokenInput && (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenHelpText}>
                Pega tu Access Token de Google Drive (OAuth 2.0 Playground o Bearer token):
              </Text>
              <AppInput
                placeholder="Pega aquí tu Bearer token (ya29...)"
                value={tokenInput}
                onChangeText={setTokenInput}
                multiline
                numberOfLines={3}
                style={{ height: 70 }}
              />
              <AppButton
                title="Vincular Cuenta con Token"
                iconName="shield-checkmark"
                variant="accent"
                size="md"
                onPress={handleManualTokenSubmit}
                isLoading={isLoading}
                style={{ marginTop: 6 }}
              />
            </View>
          )}

          {/* Offline / Local Mode Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipLogin}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Continuar en Modo Local / Sin Cuenta</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.textSecondaryDark} />
          </TouchableOpacity>
        </View>

        {/* Privacy & Security Note */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textMutedDark} />
          <Text style={styles.footerNoteText}>
            Tus credenciales y documentos están protegidos y viajan cifrados.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.bgElevatedDark,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  badgeSparkle: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.bgCardDark,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  appTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.hero,
    fontWeight: Typography.fontWeight.heavy,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  appSubtitle: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  featuresContainer: {
    gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCardDark,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    gap: Spacing.md,
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 2,
  },
  featureDesc: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
  actionsContainer: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  googleIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: Typography.fontSize.md,
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
    textAlign: 'center',
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
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 4,
    gap: 6,
  },
  skipButtonText: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
  },
  footerNoteText: {
    color: Colors.textMutedDark,
    fontSize: Typography.fontSize.xs,
  },
});
