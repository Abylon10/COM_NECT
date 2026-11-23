import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';

/** Thin bar across the top of the web link, so visitors know it is a demo with sample data. */
export function DemoBanner() {
  return (
    <View style={styles.bar} accessibilityRole="alert">
      <ThemedText type="small" style={styles.text}>
        Demo version for class presentation · sample data only, changes reset when the page reloads
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#F5A524',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#12201F',
    textAlign: 'center',
    fontWeight: '600',
  },
});
