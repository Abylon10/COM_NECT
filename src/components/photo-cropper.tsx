import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image as RNImage,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Source = { uri: string; width: number; height: number };

type CropOptions = {
  /** Width / height of the result. 1 = square. */
  aspect?: number;
  /** Circle guide for profile photos; the saved image is still square. */
  shape?: 'circle' | 'rect';
  /** Longest side of the saved image, in pixels. */
  outputWidth?: number;
};

/**
 * Picks one photo and lets the user crop it in the app (drag to move, pinch
 * or − / + to zoom, then Done). Replaces the phone's own crop screen, which
 * looks and behaves differently on every Android phone.
 *
 * Usage: `const photo = useCroppedPhotoPicker(...)`, call `photo.pick()`,
 * and render `photo.cropper` somewhere in the screen.
 */
export function useCroppedPhotoPicker(onPicked: (uri: string) => void, options: CropOptions = {}) {
  const [source, setSource] = useState<Source | null>(null);

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    let { width, height } = asset;
    if (!width || !height) {
      ({ width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) =>
        RNImage.getSize(asset.uri, (w, h) => resolve({ width: w, height: h }), reject)
      ));
    }
    setSource({ uri: asset.uri, width, height });
  };

  const cropper = (
    <PhotoCropper
      source={source}
      {...options}
      onCancel={() => setSource(null)}
      onDone={(uri) => {
        setSource(null);
        onPicked(uri);
      }}
    />
  );

  return { pick, cropper };
}

const INITIAL_VIEW = { zoom: 1, x: 0, y: 0, baseX: 0, baseY: 0, baseZoom: 1, pinch: 0 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function PhotoCropper({
  source,
  aspect = 1,
  shape = 'rect',
  outputWidth = 800,
  onCancel,
  onDone,
}: CropOptions & {
  source: Source | null;
  onCancel: () => void;
  onDone: (uri: string) => void;
}) {
  const theme = useTheme();
  const window = useWindowDimensions();
  // zoom / x / y are what's shown; base* and pinch track the current gesture.
  const [view, setView] = useState(INITIAL_VIEW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Frame size on screen.
  const frameW = Math.min(window.width - Spacing.four * 2, 380);
  const frameH = frameW / aspect;
  const srcW = source?.width ?? 0;
  const srcH = source?.height ?? 0;

  // Scale at zoom 1 makes the photo just cover the frame.
  const baseScale = source ? Math.max(frameW / srcW, frameH / srcH) : 1;

  /** Keeps the photo covering the frame at the given zoom. */
  const fit = useCallback(
    (zoom: number, x: number, y: number) => {
      const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
      const s = baseScale * z;
      const mx = Math.max(0, (srcW * s - frameW) / 2);
      const my = Math.max(0, (srcH * s - frameH) / 2);
      return { zoom: z, x: clamp(x, -mx, mx), y: clamp(y, -my, my) };
    },
    [baseScale, srcW, srcH, frameW, frameH]
  );

  const { zoom, x, y } = view;
  const scale = baseScale * zoom;
  const shownW = srcW * scale;
  const shownH = srcH * scale;

  const setZoomClamped = (next: number) => setView((v) => ({ ...v, ...fit(next, v.x, v.y) }));

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () =>
          setView((v) => ({ ...v, baseX: v.x, baseY: v.y, baseZoom: v.zoom, pinch: 0 })),
        onPanResponderMove: (evt, g) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            // Pinch to zoom.
            const [a, b] = touches;
            const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            setView((v) => {
              if (!v.pinch) return { ...v, pinch: distance, baseZoom: v.zoom };
              const next = fit((v.baseZoom * distance) / v.pinch, v.x, v.y);
              // Re-anchor the drag so lifting one finger doesn't jump.
              return { ...v, ...next, baseX: next.x - g.dx, baseY: next.y - g.dy };
            });
            return;
          }
          setView((v) => ({ ...v, ...fit(v.zoom, v.baseX + g.dx, v.baseY + g.dy), pinch: 0 }));
        },
      }),
    [fit]
  );

  const reset = () => {
    setView(INITIAL_VIEW);
    setError('');
  };

  const done = async () => {
    if (!source) return;
    setSaving(true);
    setError('');
    try {
      // Visible frame → rectangle in the original photo's pixels.
      const width = Math.min(source.width, Math.round(frameW / scale));
      const height = Math.min(source.height, Math.round(frameH / scale));
      const originX = clamp(Math.round((shownW / 2 - x - frameW / 2) / scale), 0, source.width - width);
      const originY = clamp(Math.round((shownH / 2 - y - frameH / 2) / scale), 0, source.height - height);
      const context = ImageManipulator.manipulate(source.uri).crop({ originX, originY, width, height });
      if (width > outputWidth) context.resize({ width: outputWidth });
      const image = await context.renderAsync();
      const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
      reset();
      onDone(result.uri);
    } catch {
      setError('Couldn’t crop this photo. Try another one.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    reset();
    onCancel();
  };

  const stageH = frameH + Spacing.five * 2;
  const dim = 'rgba(0,0,0,0.55)';

  return (
    <Modal visible={source !== null} animationType="slide" onRequestClose={cancel} statusBarTranslucent>
      <SafeAreaView style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable onPress={cancel} hitSlop={10} accessibilityRole="button" style={styles.topButton}>
            <ThemedText style={styles.light}>Cancel</ThemedText>
          </Pressable>
          <ThemedText type="smallBold" style={[styles.light, styles.title]}>
            Crop photo
          </ThemedText>
          <Pressable
            onPress={done}
            disabled={saving}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={[styles.doneButton, { backgroundColor: theme.primary }]}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.onPrimary} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                Done
              </ThemedText>
            )}
          </Pressable>
        </View>

        <View style={styles.middle}>
          <View
            style={[styles.stage, { height: stageH }]}
            {...responder.panHandlers}
            accessibilityLabel="Drag to move the photo, pinch to zoom">
            {source && (
              <Image
                source={{ uri: source.uri }}
                style={{
                  position: 'absolute',
                  width: shownW,
                  height: shownH,
                  left: (window.width - shownW) / 2,
                  top: (stageH - shownH) / 2,
                  transform: [{ translateX: x }, { translateY: y }],
                }}
                contentFit="fill"
              />
            )}
            {/* Dim everything outside the frame. */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={{ height: (stageH - frameH) / 2, backgroundColor: dim }} />
              <View style={{ height: frameH, flexDirection: 'row' }}>
                <View style={{ flex: 1, backgroundColor: dim }} />
                <View
                  style={{
                    width: frameW,
                    height: frameH,
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                    borderRadius: shape === 'circle' ? frameW / 2 : Radius.sm,
                  }}
                />
                <View style={{ flex: 1, backgroundColor: dim }} />
              </View>
              <View style={{ flex: 1, backgroundColor: dim }} />
            </View>
          </View>
        </View>

        <View style={styles.controls}>
          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : (
            <ThemedText type="caption" style={styles.hint}>
              Drag to move · pinch or use − / + to zoom
            </ThemedText>
          )}
          <View style={styles.zoomRow}>
            <ZoomButton label="Zoom out" text="−" onPress={() => setZoomClamped(zoom - 0.25)} disabled={zoom <= MIN_ZOOM} />
            <View style={styles.zoomTrack}>
              <View
                style={[
                  styles.zoomFill,
                  { width: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%`, backgroundColor: theme.primary },
                ]}
              />
            </View>
            <ZoomButton label="Zoom in" text="+" onPress={() => setZoomClamped(zoom + 0.25)} disabled={zoom >= MAX_ZOOM} />
          </View>
          <Pressable onPress={reset} accessibilityRole="button" hitSlop={8} style={styles.reset}>
            <Icon name={Icons.history} size={16} color="#FFFFFF" />
            <ThemedText type="small" style={styles.light}>
              Reset
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ZoomButton({
  label,
  text,
  onPress,
  disabled,
}: {
  label: string;
  text: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.zoomButton, disabled && { opacity: 0.35 }]}>
      <ThemedText style={[styles.light, styles.zoomText]}>{text}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 56,
  },
  topButton: {
    minWidth: 72,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  doneButton: {
    minWidth: 72,
    height: 36,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: {
    color: '#FFFFFF',
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  stage: {
    width: '100%',
    overflow: 'hidden',
  },
  controls: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: 360,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    fontSize: 22,
    lineHeight: 26,
  },
  zoomTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  zoomFill: {
    height: '100%',
  },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
