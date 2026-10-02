import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onFilterPress?: () => void;
  /** Shows a dot on the filter button when filters are applied. */
  filtersActive?: boolean;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onFilterPress,
  filtersActive = false,
}: SearchBarProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.field, { borderColor: theme.border }]}>
        <Icon name={Icons.search} size={18} color={theme.textSecondary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>
      {onFilterPress && (
        <Pressable
          onPress={onFilterPress}
          accessibilityLabel="Filters"
          style={({ pressed }) => [
            styles.filterButton,
            { borderColor: filtersActive ? theme.primary : theme.border },
            pressed && styles.pressed,
          ]}>
          <Icon
            name={Icons.filter}
            size={20}
            color={filtersActive ? theme.primary : theme.textSecondary}
          />
          {filtersActive && <View style={[styles.dot, { backgroundColor: theme.primary }]} />}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
