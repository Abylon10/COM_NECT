import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, Icons } from '@/components/icon';
import { SettingsScreen, SettingsSection } from '@/components/settings-screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { INTEREST_OPTIONS, setMyInterests } from '@/data/interests';
import { useMyInterests } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

export default function InterestsScreen() {
  const theme = useTheme();
  const { interests } = useMyInterests();
  const [custom, setCustom] = useState('');

  // Changes save right away.
  const toggle = (id: string) =>
    setMyInterests({
      ...interests,
      selected: interests.selected.includes(id)
        ? interests.selected.filter((s) => s !== id)
        : [...interests.selected, id],
    });
  const addCustom = () => {
    if (!custom.trim()) return;
    setMyInterests({ ...interests, custom: [...interests.custom, custom] });
    setCustom('');
  };
  const removeCustom = (c: string) =>
    setMyInterests({ ...interests, custom: interests.custom.filter((x) => x !== c) });

  const picked = INTEREST_OPTIONS.filter((o) => interests.selected.includes(o.id));

  return (
    <SettingsScreen title="My Interests">
      <ThemedText type="small" themeColor="textSecondary">
        Browse shows events that match your interests first, under “Recommended for you”. You can
        still explore every category.
      </ThemedText>

      <SettingsSection title="Your interests" description={picked.length + interests.custom.length === 0 ? 'None yet. Tap suggestions below to add.' : 'Tap to remove'}>
        <View style={styles.chips}>
          {picked.map((o) => (
            <InterestChip key={o.id} label={`${o.emoji}  ${o.label}`} selected onPress={() => toggle(o.id)} />
          ))}
          {interests.custom.map((c) => (
            <InterestChip key={c} label={`✨  ${c}`} selected onPress={() => removeCustom(c)} />
          ))}
        </View>
      </SettingsSection>

      <SettingsSection title="Suggested interests" description="Tap to add">
        <View style={styles.chips}>
          {INTEREST_OPTIONS.filter((o) => !interests.selected.includes(o.id)).map((o) => (
            <InterestChip key={o.id} label={`${o.emoji}  ${o.label}`} onPress={() => toggle(o.id)} />
          ))}
        </View>
      </SettingsSection>

      <SettingsSection title="Add custom interest" description="Type your own interest; events that mention it are recommended.">
        <View style={styles.row}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            onSubmitEditing={addCustom}
            placeholder="e.g. Hiking, Cooking, Dancing…"
            placeholderTextColor={theme.textSecondary}
            maxLength={30}
            accessibilityLabel="Custom interest"
            style={[styles.input, { color: theme.text, borderColor: theme.primary }]}
          />
          <Button label="Add" icon={Icons.add} onPress={addCustom} disabled={!custom.trim()} style={styles.add} />
        </View>
      </SettingsSection>
    </SettingsScreen>
  );
}

function InterestChip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={selected ? `Remove ${label}` : `Add ${label}`}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.backgroundElement },
        pressed && { opacity: 0.7 },
      ]}>
      <ThemedText type="small" style={{ fontWeight: 600 }}>
        {label}
      </ThemedText>
      <Icon name={selected ? Icons.close : Icons.addCircle} size={18} color={theme.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    fontSize: 15,
  },
  add: {
    flex: 0,
    paddingHorizontal: Spacing.three,
  },
});
