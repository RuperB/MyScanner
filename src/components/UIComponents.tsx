import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';
import { UploadStatus } from '../types';

// ==================== BUTTON ====================
interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  iconName?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  iconName,
  iconPosition = 'left',
  isLoading = false,
  style,
  disabled,
  ...props
}) => {
  const getBackgroundColor = () => {
    if (disabled) return Colors.borderDark;
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'secondary':
        return Colors.bgElevatedDark;
      case 'accent':
        return Colors.accent;
      case 'danger':
        return Colors.danger;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return Colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return Colors.textMutedDark;
    switch (variant) {
      case 'outline':
        return Colors.primaryLight;
      case 'ghost':
        return Colors.textSecondaryDark;
      default:
        return Colors.white;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md };
      case 'lg':
        return { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl };
      default:
        return { paddingVertical: Spacing.sm + 4, paddingHorizontal: Spacing.lg };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.buttonBase,
        { backgroundColor: getBackgroundColor() },
        getPadding(),
        variant === 'outline' && styles.buttonOutline,
        style,
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={styles.buttonContent}>
          {iconName && iconPosition === 'left' && (
            <Ionicons name={iconName} size={size === 'sm' ? 16 : 20} color={getTextColor()} />
          )}
          <Text
            style={[
              styles.buttonText,
              { color: getTextColor() },
              size === 'sm' && styles.buttonTextSm,
              size === 'lg' && styles.buttonTextLg,
            ]}
          >
            {title}
          </Text>
          {iconName && iconPosition === 'right' && (
            <Ionicons name={iconName} size={size === 'sm' ? 16 : 20} color={getTextColor()} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ==================== INPUT ====================
interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  helperText?: string;
  containerStyle?: ViewProps['style'];
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  iconName,
  helperText,
  containerStyle,
  style,
  ...props
}) => {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : null,
        ]}
      >
        {iconName && (
          <Ionicons
            name={iconName}
            size={20}
            color={error ? Colors.danger : Colors.textSecondaryDark}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          placeholderTextColor={Colors.textMutedDark}
          style={[styles.inputField, style]}
          {...props}
        />
      </View>
      {helperText && !error && <Text style={styles.inputHelper}>{helperText}</Text>}
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
};

// ==================== CARD ====================
export const AppCard: React.FC<ViewProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

// ==================== STATUS BADGE ====================
export const StatusBadge: React.FC<{ status: UploadStatus }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          label: 'Sincronizado',
          icon: 'checkmark-circle' as const,
          color: Colors.accent,
          bg: Colors.accentMuted,
        };
      case 'uploading':
        return {
          label: 'Subiendo...',
          icon: 'cloud-upload' as const,
          color: Colors.warning,
          bg: Colors.warningMuted,
        };
      case 'error':
        return {
          label: 'Error al subir',
          icon: 'alert-circle' as const,
          color: Colors.danger,
          bg: Colors.dangerMuted,
        };
      case 'local_only':
      default:
        return {
          label: 'Guardado Local',
          icon: 'save-outline' as const,
          color: Colors.textSecondaryDark,
          bg: 'rgba(148, 163, 184, 0.1)',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg, borderColor: config.color }]}>
      <Ionicons name={config.icon} size={14} color={config.color} />
      <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Button
  buttonBase: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  buttonTextSm: {
    fontSize: Typography.fontSize.xs,
  },
  buttonTextLg: {
    fontSize: Typography.fontSize.lg,
  },

  // Input
  inputContainer: {
    marginVertical: Spacing.xs + 2,
  },
  inputLabel: {
    color: Colors.textSecondaryDark,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevatedDark,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  inputWrapperError: {
    borderColor: Colors.danger,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  inputField: {
    flex: 1,
    color: Colors.textPrimaryDark,
    fontSize: Typography.fontSize.md,
    paddingVertical: Spacing.md,
  },
  inputHelper: {
    color: Colors.textMutedDark,
    fontSize: Typography.fontSize.xs,
    marginTop: 4,
  },
  inputError: {
    color: Colors.danger,
    fontSize: Typography.fontSize.xs,
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: Colors.bgCardDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    marginVertical: Spacing.sm,
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
});
