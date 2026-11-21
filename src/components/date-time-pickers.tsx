import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Chip } from '@/components/chip';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeOnly } from '@/utils/format';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

type DatePickerProps = {
  visible: boolean;
  /** "YYYY-MM-DD" */
  value: string;
  /** Days before this ("YYYY-MM-DD") can't be picked. */
  minDate?: string;
  onChange: (date: string) => void;
  onClose: () => void;
};

/** Month calendar in a bottom sheet. Works on Android, iOS and web without native modules. */
export function DatePickerSheet({ visible, value, minDate, onChange, onClose }: DatePickerProps) {
  return (
    <BottomSheet visible={visible} title="Pick a date" onClose={onClose}>
      {/* Mounted only while open so it starts on the selected month each time. */}
      {visible && <Calendar value={value} minDate={minDate} onChange={onChange} />}
    </BottomSheet>
  );
}

function Calendar({ value, minDate, onChange }: Omit<DatePickerProps, 'visible' | 'onClose'>) {
  const theme = useTheme();
  const [year, month] = value.split('-').map(Number);
  const [view, setView] = useState({ year, month: month - 1 });

  const firstWeekday = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const shift = (delta: number) => {
    const m = view.month + delta;
    setView({ year: view.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 });
  };

  return (
    <View style={styles.calendar}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityLabel="Previous month">
          <Icon name={Icons.chevronLeft} size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="heading">
          {MONTHS[view.month]} {view.year}
        </ThemedText>
        <Pressable onPress={() => shift(1)} hitSlop={12} accessibilityLabel="Next month">
          <Icon name={Icons.chevronRight} size={24} color={theme.text} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <ThemedText key={i} type="caption" themeColor="textSecondary" style={styles.cellText}>
            {d}
          </ThemedText>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.week}>
          {cells.slice(row * 7, row * 7 + 7).map((day, i) => {
            if (!day) return <View key={i} style={styles.cell} />;
            const date = `${view.year}-${pad(view.month + 1)}-${pad(day)}`;
            const selected = date === value;
            const disabled = !!minDate && date < minDate;
            return (
              <Pressable
                key={i}
                disabled={disabled}
                onPress={() => onChange(date)}
                accessibilityRole="button"
                accessibilityLabel={date}
                accessibilityState={{ selected, disabled }}
                style={styles.cell}>
                <View style={[styles.day, selected && { backgroundColor: theme.primary }]}>
                  <ThemedText
                    type="small"
                    style={{
                      color: selected ? theme.onPrimary : disabled ? theme.border : theme.text,
                      fontWeight: selected ? 700 : 500,
                    }}>
                    {day}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// Every 30 minutes from 5:00 AM to 11:30 PM.
const TIMES = Array.from({ length: 38 }, (_, i) => {
  const minutes = 5 * 60 + i * 30;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
});

type TimePickerProps = {
  visible: boolean;
  title: string;
  /** "HH:MM" */
  value: string;
  onChange: (time: string) => void;
  onClose: () => void;
};

export function TimePickerSheet({ visible, title, value, onChange, onClose }: TimePickerProps) {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.times}>
        {TIMES.map((time) => (
          <Chip
            key={time}
            label={formatTimeOnly(time)}
            selected={time === value}
            onPress={() => onChange(time)}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  calendar: {
    gap: Spacing.one,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  cellText: {
    flex: 1,
    textAlign: 'center',
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  times: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
});
