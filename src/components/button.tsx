import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `solid` is filled teal; `outline` is a teal border. */
  variant?: 'solid' | 'outline';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'solid',
  icon,
  disabled = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const solid = variant === 'solid';
  const color = disabled ? theme.textSecondary : solid ? theme.onPrimary : theme.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: solid }}
      style={({ pressed }) => [
        styles.button,
        disabled
          ? { backgroundColor: theme.backgroundElement, borderColor: theme.border }
          : solid
            ? { backgroundColor: theme.primary, borderColor: theme.primary }
            : { backgroundColor: 'transparent', borderColor: theme.primary },
        pressed && styles.pressed,
        style,
      ]}>
      <View style={styles.content}>
        {icon && <Icon name={icon} size={16} color={color} />}
        <ThemedText type="smallBold" style={{ color }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.75,
  },
});
