import React from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {brand, brandColors} from '../theme/tokens';

/**
 * 버튼 톤 (01-style-guide.md 4절) — pill 모양, 1차 CTA는 Dusk Coral 채움, 2차는 outline.
 */
interface ButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
}

export function PrimaryButton({label, loading, style, disabled, ...rest}: ButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled || loading}
      style={[styles.base, {backgroundColor: brand.primary, opacity: disabled ? 0.5 : 1}, style]}
      {...rest}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function SecondaryButton({label, loading, style, disabled, ...rest}: ButtonProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled || loading}
      style={[
        styles.base,
        styles.outline,
        {borderColor: theme.border, backgroundColor: theme.bgElevated, opacity: disabled ? 0.5 : 1},
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={theme.text} />
      ) : (
        <Text style={[styles.secondaryText, {color: theme.text}]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function SpotifyButton({label, loading, style, disabled, ...rest}: ButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled || loading}
      style={[styles.base, {backgroundColor: brandColors.spotifyGreen, opacity: disabled ? 0.5 : 1}, style]}
      {...rest}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {borderWidth: 1.5},
  primaryText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
  secondaryText: {fontSize: 16, fontWeight: '700'},
});
