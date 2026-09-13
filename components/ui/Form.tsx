import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type PressableProps,
} from 'react-native';

import Colors, { Brand } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useColorScheme } from '@/components/useColorScheme';

type ButtonProps = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function Button({
  title,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      style={(state) => {
        const { pressed } = state;
        const baseStyles = [
          styles.button,
          isPrimary
            ? { backgroundColor: Brand.accent }
            : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          (disabled || loading) && styles.buttonDisabled,
          pressed && !disabled && !loading && styles.buttonPressed,
        ];
        if (typeof style === 'function') {
          return [...baseStyles, style(state)];
        }
        return [...baseStyles, style];
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFF' : Brand.accent} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: isPrimary ? '#FFF' : colors.text },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextArea({ label, error, style, ...props }: InputProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.textArea,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            color: colors.text,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
    </>
  );
}

export function Input({ label, error, style, ...props }: InputProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            color: colors.text,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.bodyLarge,
  },
  textArea: {
    minHeight: 100,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.bodyLarge,
  },
  error: {
    fontSize: FontSize.caption,
    marginTop: Spacing.xs,
  },
});
