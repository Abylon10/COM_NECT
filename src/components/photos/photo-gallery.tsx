import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Icons } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';

/** Horizontal strip of event photos; tapping one opens a full-screen viewer. */
export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  return (
    <>
      <FlatList
        horizontal
        data={photos}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => setOpenAt(index)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${title} photo ${index + 1} of ${photos.length}`}>
            <Image source={{ uri: item }} style={styles.thumb} contentFit="cover" />
          </Pressable>
        )}
      />
      <PhotoViewer photos={photos} index={openAt} onClose={() => setOpenAt(null)} />
    </>
  );
}

function PhotoViewer({ photos, index, onClose }: { photos: string[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);

  return (
    <Modal visible={index !== null} animationType="fade" onRequestClose={onClose} transparent>
      <View style={styles.viewer}>
        {index !== null && (
          <FlatList
            horizontal
            pagingEnabled
            data={photos}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            onLayout={() => setCurrent(index)}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={{ width, height }} contentFit="contain" />
            )}
          />
        )}
        <View style={[styles.viewerBar, { top: insets.top + Spacing.two }]}>
          <ThemedText type="smallBold" style={styles.white}>
            {current + 1} / {photos.length}
          </ThemedText>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close photos">
            <Icon name={Icons.close} size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: Spacing.two,
  },
  thumb: {
    width: 140,
    height: 100,
    borderRadius: Radius.md,
  },
  viewer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewerBar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  white: {
    color: '#FFFFFF',
  },
});
