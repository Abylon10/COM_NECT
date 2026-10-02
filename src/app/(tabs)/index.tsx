import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { EventCard } from '@/components/event-card';
import {
  countActiveFilters,
  DEFAULT_SHEET_FILTERS,
  FilterSheet,
  type SheetFilters,
} from '@/components/filter-sheet';
import { Icons } from '@/components/icon';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { CATEGORIES, type Category } from '@/data/events';
import { useEvents } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

export default function BrowseScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | undefined>();
  const [sheetFilters, setSheetFilters] = useState<SheetFilters>(DEFAULT_SHEET_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { events, loading } = useEvents({ query, category, ...sheetFilters });
  const activeFilterCount = countActiveFilters(sheetFilters);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.container}>
        <AppHeader />

        <View style={styles.controls}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search events, organizers, venues"
            onFilterPress={() => setSheetOpen(true)}
            filtersActive={activeFilterCount > 0}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}>
            <Chip label="All" selected={!category} onPress={() => setCategory(undefined)} />
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                selected={category === c.id}
                onPress={() => setCategory(category === c.id ? undefined : c.id)}
              />
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <ThemedText type="caption" themeColor="textSecondary">
              {loading
                ? 'Loading events…'
                : `${events.length} ${events.length === 1 ? 'event' : 'events'}`}
            </ThemedText>
          }
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                icon={Icons.search}
                title="No events found"
                message="Try a different search, category, or filter."
              />
            )
          }
        />
      </View>

      <FilterSheet
        visible={sheetOpen}
        filters={sheetFilters}
        onClose={() => setSheetOpen(false)}
        onApply={(filters) => {
          setSheetFilters(filters);
          setSheetOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  controls: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  chips: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  list: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
