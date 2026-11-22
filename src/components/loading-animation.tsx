import { useEffect } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// One loop: walk in → raise arms → high-five + heart → lower arms → step back.
const WALK = 600;
const RAISE = 350;
const HOLD = 650;
const ease = Easing.inOut(Easing.quad);

/**
 * Two people (man and woman pictograms) walking up to each other and
 * high-fiving, with a heart popping between them. Used while things load.
 */
export function LoadingAnimation({ label, scale = 1 }: { label?: string; scale?: number }) {
  const theme = useTheme();
  const step = useSharedValue(0); // 0 = apart, 1 = together
  const arm = useSharedValue(0); // 0 = down, 1 = raised
  const heart = useSharedValue(0);

  useEffect(() => {
    const pause = (ms: number) => withTiming(0, { duration: ms });
    step.value = withRepeat(
      withSequence(
        withTiming(1, { duration: WALK, easing: ease }),
        withTiming(1, { duration: RAISE * 2 + HOLD }),
        withTiming(0, { duration: WALK, easing: ease })
      ),
      -1
    );
    arm.value = withRepeat(
      withSequence(
        pause(WALK),
        withTiming(1, { duration: RAISE, easing: Easing.out(Easing.back(1.6)) }),
        withTiming(1, { duration: HOLD }),
        withTiming(0, { duration: RAISE, easing: ease }),
        pause(WALK)
      ),
      -1
    );
    heart.value = withRepeat(
      withSequence(
        pause(WALK + RAISE),
        withTiming(1, { duration: 250, easing: Easing.out(Easing.back(2.5)) }),
        withTiming(1, { duration: HOLD - 250 }),
        withTiming(0, { duration: 200 }),
        pause(RAISE - 200 + WALK)
      ),
      -1
    );
  }, [step, arm, heart]);

  // Gentle bob while walking (peaks mid-step).
  const bob = (v: number) => -Math.sin(v * Math.PI) * 4;

  const manStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: step.value * 14 }, { translateY: bob(step.value) }],
  }));
  const womanStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -step.value * 14 }, { translateY: bob(step.value) }],
  }));
  // Inner arms swing up and meet above the middle.
  const manArm = useAnimatedStyle(() => ({ transform: [{ rotate: `${-arm.value * 150}deg` }] }));
  const womanArm = useAnimatedStyle(() => ({ transform: [{ rotate: `${arm.value * 150}deg` }] }));
  const heartStyle = useAnimatedStyle(() => ({
    opacity: heart.value,
    transform: [{ translateY: -heart.value * 10 }, { scale: 0.4 + heart.value * 0.6 }],
  }));

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <View style={[styles.stage, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.heart, heartStyle]}>
          <ThemedText style={[styles.heartText, { color: theme.danger }]}>♥</ThemedText>
        </Animated.View>
        <Animated.View style={manStyle}>
          <Man color={theme.primary} armStyle={manArm} />
        </Animated.View>
        <Animated.View style={womanStyle}>
          <Woman color={theme.warning} armStyle={womanArm} />
        </Animated.View>
      </View>
      {label && (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
    </View>
  );
}

type FigureProps = { color: ColorValue; armStyle: ReturnType<typeof useAnimatedStyle> };

/** Man pictogram. His right arm (toward the woman) is animated. */
function Man({ color, armStyle }: FigureProps) {
  return (
    <View style={styles.figure}>
      <View style={[styles.head, { backgroundColor: color }]} />
      <View style={styles.upper}>
        <View style={[styles.arm, { backgroundColor: color }]} />
        <View style={[styles.torso, { backgroundColor: color }]} />
        <Animated.View style={[styles.arm, { backgroundColor: color }, styles.shoulder, armStyle]} />
      </View>
      <View style={styles.legs}>
        <View style={[styles.leg, { backgroundColor: color }]} />
        <View style={[styles.leg, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Woman pictogram (dress). Her left arm (toward the man) is animated. */
function Woman({ color, armStyle }: FigureProps) {
  return (
    <View style={styles.figure}>
      <View style={[styles.head, { backgroundColor: color }]} />
      <View style={styles.upper}>
        <Animated.View style={[styles.arm, { backgroundColor: color }, styles.shoulder, armStyle]} />
        <View style={[styles.dress, { borderBottomColor: color }]} />
        <View style={[styles.arm, { backgroundColor: color }]} />
      </View>
      <View style={[styles.legs, styles.womanLegs]}>
        <View style={[styles.leg, styles.womanLeg, { backgroundColor: color }]} />
        <View style={[styles.leg, styles.womanLeg, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 28,
    height: 120,
    paddingTop: 22,
  },
  heart: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  heartText: {
    fontSize: 22,
    lineHeight: 24,
  },
  figure: {
    alignItems: 'center',
    width: 48,
  },
  head: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginBottom: 3,
  },
  upper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
  },
  torso: {
    width: 22,
    height: 36,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  dress: {
    // Trapezoid: 18px wide at the shoulders, 32px at the hem.
    width: 18,
    height: 0,
    borderBottomWidth: 38,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  arm: {
    width: 7,
    height: 30,
    borderRadius: 3.5,
    marginTop: 1,
  },
  shoulder: {
    transformOrigin: '50% 3.5px',
  },
  legs: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  leg: {
    width: 10,
    height: 38,
    borderRadius: 5,
  },
  womanLegs: {
    gap: 4,
  },
  womanLeg: {
    width: 8,
    height: 30,
  },
});
