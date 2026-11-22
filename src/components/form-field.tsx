import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function Label({ label, error }: { label: string; error?: string }) {
  return (
    <View style={styles.labelRow}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {error && (
        <ThemedText type="caption" style={styles.errorText} themeColor="danger">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
  error,
  secureTextEntry,
  keyboardType,
}: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <Label label={label} error={error} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' || secureTextEntry ? 'none' : undefined}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={label}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: theme.text, borderColor: error ? theme.danger : theme.border },
        ]}
      />
    </View>
  );
}

type PickerFieldProps = {
  label: string;
  value: string;
  icon: IconName;
  onPress: () => void;
  error?: string;
};

/** Looks like an input; opens a picker when tapped. */
export function PickerField({ label, value, icon, onPress, error }: PickerFieldProps) {
  const theme = useTheme();

  return (
    <View style={[styles.field, styles.flex]}>
      <Label label={label} error={error} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        style={({ pressed }) => [
          styles.input,
          styles.picker,
          { borderColor: error ? theme.danger : theme.border },
          pressed && { backgroundColor: theme.backgroundElement },
        ]}>
        <Icon name={icon} size={18} color={theme.textSecondary} />
        <ThemedText type="small" numberOfLines={1} style={styles.flex}>
          {value}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  errorText: {
    flexShrink: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    fontSize: 15,
  },
  multiline: {
    minHeight: 96,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
