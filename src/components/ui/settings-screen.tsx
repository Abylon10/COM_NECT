import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SettingsScreenProps = {
  title: string;
  children: ReactNode;
  /** Pinned to the bottom, e.g. a Save button. */
  footer?: ReactNode;
};

/** Stack screen layout used by the Profile & Settings pages. */
export function SettingsScreen({ title, children, footer }: SettingsScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScreenHeader title={title} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            !footer && { paddingBottom: insets.bottom + Spacing.five },
          ]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer && (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: theme.background,
                borderTopColor: theme.border,
                paddingBottom: insets.bottom + Spacing.two,
              },
            ]}>
            <View style={styles.footerInner}>{footer}</View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Heading + optional description for a group of settings. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <ThemedText type="subtitle">{title}</ThemedText>
        {description && (
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHead: {
    gap: Spacing.one,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  footerInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
  },
});
