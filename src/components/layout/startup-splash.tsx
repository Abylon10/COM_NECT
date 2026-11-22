import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { LoadingAnimation } from '@/components/ui/loading-animation';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** About one full loop of the animation (walk in, high-five, walk back). */
const SHOW_FOR_MS = 2600;

/** Branded loading screen shown over the app while it starts. */
export function StartupSplash() {
  const theme = useTheme();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(350)}
      style={[styles.overlay, { backgroundColor: theme.background }]}
      pointerEvents="none">
      <Image
        source={require('@/assets/images/brand/logo-mark.png')}
        style={styles.logo}
        contentFit="contain"
      />
      <ThemedText type="subtitle" style={{ color: theme.primary }}>
        Community Connect
      </ThemedText>
      <LoadingAnimation label="Connecting your community…" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    zIndex: 1000,
  },
  logo: {
    width: 72,
    height: 72,
  },
});
