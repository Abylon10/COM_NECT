import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { MAX_EVENT_PHOTOS } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

type PhotoPickerProps = {
  photos: string[];
  onChange: (photos: string[]) => void;
};

/** Grid of event photos: add from the library, remove, or tap to make one the cover. */
export function PhotoPicker({ photos, onChange }: PhotoPickerProps) {
  const theme = useTheme();
  const remaining = MAX_EVENT_PHOTOS - photos.length;

  const add = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (!result.canceled) {
      onChange([...photos, ...result.assets.map((a) => a.uri)].slice(0, MAX_EVENT_PHOTOS));
    }
  };

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <ThemedText type="smallBold">Photos</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {photos.length}/{MAX_EVENT_PHOTOS} · the first is the cover
        </ThemedText>
      </View>
      <View style={styles.grid}>
        {photos.map((uri, i) => (
          <View key={`${uri}-${i}`} style={styles.tile}>
            <Pressable
              onPress={() => i > 0 && onChange([uri, ...photos.filter((_, j) => j !== i)])}
              accessibilityRole="button"
              accessibilityLabel={i === 0 ? 'Cover photo' : `Photo ${i + 1}. Make cover`}
              style={styles.fill}>
              <Image source={{ uri }} style={styles.fill} contentFit="cover" />
            </Pressable>
            {i === 0 && (
              <View style={[styles.coverTag, { backgroundColor: theme.primary }]}>
                <ThemedText type="caption" style={styles.coverText}>
                  Cover
                </ThemedText>
              </View>
            )}
            <Pressable
              onPress={() => onChange(photos.filter((_, j) => j !== i))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${i + 1}`}
              style={styles.remove}>
              <Icon name={Icons.close} size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
        {remaining > 0 && (
          <Pressable
            onPress={add}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={({ pressed }) => [
              styles.tile,
              styles.addTile,
              { borderColor: theme.primary, backgroundColor: theme.primarySoft },
              pressed && { opacity: 0.7 },
            ]}>
            <Icon name={Icons.camera} size={24} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: 600 }}>
              Add photos
            </ThemedText>
          </Pressable>
        )}
      </View>
      {photos.length > 1 && (
        <ThemedText type="caption" themeColor="textSecondary">
          Tap a photo to make it the cover.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    width: 104,
    height: 104,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  addTile: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  coverTag: {
    position: 'absolute',
    left: Spacing.one,
    bottom: Spacing.one,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
  },
  coverText: {
    color: '#FFFFFF',
    fontWeight: 700,
  },
  remove: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
