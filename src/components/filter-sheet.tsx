import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { DateRange } from '@/data/events';
import { useLocations, useOrganizations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

export type SheetFilters = {
  dateRange: DateRange;
  location?: string;
  organizationId?: string;
};

export const DEFAULT_SHEET_FILTERS: SheetFilters = { dateRange: 'any' };

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'any', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Next 7 days' },
  { id: 'month', label: 'Next 30 days' },
];

type FilterSheetProps = {
  visible: boolean;
  filters: SheetFilters;
  onApply: (filters: SheetFilters) => void;
  onClose: () => void;
};

/** Bottom sheet for filtering events by date, location, and organizer. */
export function FilterSheet({ visible, filters, onApply, onClose }: FilterSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Mounting the content only while visible resets the draft each time it opens. */}
      {visible && <FilterSheetContent filters={filters} onApply={onApply} onClose={onClose} />}
    </Modal>
  );
}

function FilterSheetContent({ filters, onApply, onClose }: Omit<FilterSheetProps, 'visible'>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const locations = useLocations();
  const organizations = useOrganizations();
  const [draft, setDraft] = useState(filters);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close filters" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Filters</ThemedText>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Icon name={Icons.close} size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Section title="When">
            {DATE_RANGES.map((range) => (
              <Chip
                key={range.id}
                label={range.label}
                selected={draft.dateRange === range.id}
                onPress={() => setDraft({ ...draft, dateRange: range.id })}
              />
            ))}
          </Section>

          <Section title="Location">
            <Chip
              label="All locations"
              selected={!draft.location}
              onPress={() => setDraft({ ...draft, location: undefined })}
            />
            {locations.map((location) => (
              <Chip
                key={location}
                label={location}
                selected={draft.location === location}
                onPress={() => setDraft({ ...draft, location })}
              />
            ))}
          </Section>

          <Section title="Organizer">
            <Chip
              label="All organizers"
              selected={!draft.organizationId}
              onPress={() => setDraft({ ...draft, organizationId: undefined })}
            />
            {organizations.map((org) => (
              <Chip
                key={org.id}
                label={org.name}
                selected={draft.organizationId === org.id}
                onPress={() => setDraft({ ...draft, organizationId: org.id })}
              />
            ))}
          </Section>
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label="Reset"
            variant="outline"
            onPress={() => setDraft(DEFAULT_SHEET_FILTERS)}
          />
          <Button label="Show events" onPress={() => onApply(draft)} />
        </View>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

export function countActiveFilters(filters: SheetFilters) {
  return (
    (filters.dateRange !== 'any' ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (filters.organizationId ? 1 : 0)
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: Radius.lg + 8,
    borderTopRightRadius: Radius.lg + 8,
    paddingTop: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
});
