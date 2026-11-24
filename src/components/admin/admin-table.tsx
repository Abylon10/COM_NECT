import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Below this width tables switch to stacked rows. */
const COMPACT = 720;

function useCompactTable() {
  return useWindowDimensions().width < COMPACT;
}

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------

export function Checkbox({
  checked,
  indeterminate = false,
  onPress,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onPress: () => void;
  label: string;
}) {
  const theme = useTheme();
  const on = checked || indeterminate;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: indeterminate ? 'mixed' : checked }}
      accessibilityLabel={label}
      style={[
        styles.checkbox,
        { borderColor: on ? theme.primary : theme.textSecondary },
        on && { backgroundColor: theme.primary },
      ]}>
      {checked && !indeterminate && <Icon name={Icons.check} size={14} color={theme.onPrimary} />}
      {indeterminate && <View style={[styles.dash, { backgroundColor: theme.onPrimary }]} />}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Row menu (⋮)
// ---------------------------------------------------------------------------

export type MenuAction = {
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
};

const MENU_WIDTH = 190;

/** ⋮ button that opens a small popover menu next to it. */
export function RowMenu({ actions, label }: { actions: MenuAction[]; label: string }) {
  const theme = useTheme();
  const window = useWindowDimensions();
  const ref = useRef<ComponentRef<typeof Pressable>>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const open = () => {
    ref.current?.measureInWindow((x: number, y: number, w: number, h: number) => {
      const height = actions.length * 44 + Spacing.two * 2;
      const below = y + h + 4;
      setPosition({
        top: below + height > window.height ? Math.max(8, y - height - 4) : below,
        left: Math.max(8, Math.min(x + w - MENU_WIDTH, window.width - MENU_WIDTH - 8)),
      });
    });
  };

  return (
    <>
      <Pressable
        ref={ref}
        onPress={open}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.menuButton, pressed && { backgroundColor: theme.backgroundSelected }]}>
        <Icon name={Icons.more} size={20} color={theme.textSecondary} />
      </Pressable>
      <Modal visible={position !== null} transparent animationType="fade" onRequestClose={() => setPosition(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setPosition(null)} accessibilityLabel="Close menu" />
        {position && (
          <View
            style={[
              styles.menu,
              { top: position.top, left: position.left, backgroundColor: theme.card, borderColor: theme.border },
            ]}
            accessibilityRole="menu">
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={() => {
                  setPosition(null);
                  a.onPress();
                }}
                accessibilityRole="menuitem"
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: theme.backgroundElement }]}>
                <Icon name={a.icon} size={18} color={a.destructive ? theme.danger : theme.text} />
                <ThemedText type="small" style={a.destructive && { color: theme.danger }}>
                  {a.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Toolbar: "All users 245" + search + filters
// ---------------------------------------------------------------------------

export function TableToolbar({
  title,
  count,
  search,
  onSearch,
  searchPlaceholder = 'Search',
  filterCount,
  onFilters,
}: {
  title: string;
  count: number;
  search?: string;
  onSearch?: (text: string) => void;
  searchPlaceholder?: string;
  /** Number of active filters; omit to hide the Filters button. */
  filterCount?: number;
  onFilters?: () => void;
}) {
  const theme = useTheme();
  const compact = useCompactTable();

  return (
    <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
      <View style={styles.toolbarTitle}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary" style={styles.light}>
          {count}
        </ThemedText>
      </View>
      <View style={[styles.toolbarRight, compact && styles.full]}>
        {onSearch && (
          <View
            style={[
              styles.search,
              compact && styles.flex,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}>
            <Icon name={Icons.search} size={18} color={theme.textSecondary} />
            <TextInput
              value={search}
              onChangeText={onSearch}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={searchPlaceholder}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
        )}
        {onFilters && (
          <Pressable
            onPress={onFilters}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            style={({ pressed }) => [
              styles.filters,
              { borderColor: theme.primary, backgroundColor: filterCount ? theme.primarySoft : theme.background },
              pressed && { opacity: 0.7 },
            ]}>
            <Icon name={Icons.filter} size={18} color={theme.primary} />
            <ThemedText type="smallBold" themeColor="primary">
              Filters{filterCount ? ` · ${filterCount}` : ''}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Data table
// ---------------------------------------------------------------------------

export type Column<T> = {
  key: string;
  title: string;
  /** Relative width in the wide layout. */
  flex?: number;
  render: (row: T) => ReactNode;
  /**
   * In the compact (phone) layout: `primary` is the main line, `meta`
   * values are listed under it, `hidden` is left out.
   */
  compact?: 'primary' | 'meta' | 'hidden';
  sortable?: boolean;
};

export type Sort = { key: string; direction: 'asc' | 'desc' };

type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  keyOf: (row: T) => string;
  /** Row label for screen readers and checkbox labels. */
  labelOf: (row: T) => string;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  sort?: Sort;
  onSort?: (key: string) => void;
  actions?: (row: T) => MenuAction[];
  onRowPress?: (row: T) => void;
  pageSize?: number;
  empty?: ReactNode;
  /** Phones: left indent of the second line, e.g. to line up with a name next to an avatar. */
  compactMetaIndent?: number;
};

/**
 * Table with optional checkboxes, sortable headers, a ⋮ menu per row and
 * pagination. On phones each row stacks into a compact card-like line.
 */
export function DataTable<T>({
  rows,
  columns,
  keyOf,
  labelOf,
  selected,
  onSelectedChange,
  sort,
  onSort,
  actions,
  onRowPress,
  pageSize = 8,
  empty,
  compactMetaIndent = 0,
}: DataTableProps<T>) {
  const theme = useTheme();
  const compact = useCompactTable();
  const [requestedPage, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  // Stay on a valid page when filters shrink the list.
  const page = Math.min(requestedPage, pages - 1);
  const visible = rows.slice(page * pageSize, page * pageSize + pageSize);

  const selectable = !!selected && !!onSelectedChange;
  const visibleKeys = visible.map(keyOf);
  const selectedOnPage = visibleKeys.filter((k) => selected?.has(k)).length;
  const allOnPage = visible.length > 0 && selectedOnPage === visible.length;

  const togglePage = () => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    visibleKeys.forEach((k) => (allOnPage ? next.delete(k) : next.add(k)));
    onSelectedChange(next);
  };
  const toggleRow = (key: string) => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectedChange(next);
  };

  const sortIcon = (key: string) =>
    sort?.key === key ? (sort.direction === 'asc' ? Icons.arrowUp : Icons.arrowDown) : null;

  const primary = columns.find((c) => c.compact === 'primary') ?? columns[0];
  const meta = columns.filter((c) => c !== primary && c.compact !== 'hidden');
  const sortable = columns.filter((c) => c.sortable);

  return (
    <View style={[styles.table, { backgroundColor: theme.background, borderColor: theme.border }]}>
      {/* Header */}
      <View style={[styles.headerRow, { backgroundColor: theme.backgroundSelected }]}>
        {selectable && (
          <Checkbox
            checked={allOnPage}
            indeterminate={selectedOnPage > 0 && !allOnPage}
            onPress={togglePage}
            label="Select all on this page"
          />
        )}
        {compact ? (
          <>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
              {selected && selected.size > 0 ? `${selected.size} selected` : selectable ? 'Select all' : primary.title}
            </ThemedText>
            {sortable.map((c) => (
              <SortButton key={c.key} title={c.title} icon={sortIcon(c.key)} onPress={() => onSort?.(c.key)} />
            ))}
          </>
        ) : (
          <>
            {columns.map((c) =>
              c.sortable ? (
                <View key={c.key} style={{ flex: c.flex ?? 1 }}>
                  <SortButton title={c.title} icon={sortIcon(c.key)} onPress={() => onSort?.(c.key)} />
                </View>
              ) : (
                <ThemedText key={c.key} type="caption" themeColor="textSecondary" style={{ flex: c.flex ?? 1 }}>
                  {c.title}
                </ThemedText>
              )
            )}
            {actions && <View style={styles.actionsCell} />}
          </>
        )}
      </View>

      {/* Rows */}
      {visible.length === 0 ? (
        <View style={styles.empty}>{empty}</View>
      ) : (
        visible.map((row) => {
          const key = keyOf(row);
          const checked = selected?.has(key) ?? false;
          const content = compact ? (
            <View style={styles.compactBody}>
              <View>{primary.render(row)}</View>
              <View style={[styles.metaRow, { paddingLeft: compactMetaIndent }]}>
                {meta.map((c) => (
                  <View key={c.key} style={styles.metaItem}>
                    {c.render(row)}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            columns.map((c) => (
              <View key={c.key} style={[styles.cell, { flex: c.flex ?? 1 }]}>
                {c.render(row)}
              </View>
            ))
          );
          return (
            <View
              key={key}
              style={[
                styles.row,
                { borderTopColor: theme.border },
                checked && { backgroundColor: theme.primarySoft },
              ]}>
              {selectable && (
                <Checkbox checked={checked} onPress={() => toggleRow(key)} label={`Select ${labelOf(row)}`} />
              )}
              {onRowPress ? (
                <Pressable
                  onPress={() => onRowPress(row)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${labelOf(row)}`}
                  style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.6 }]}>
                  {content}
                </Pressable>
              ) : (
                <View style={styles.rowMain}>{content}</View>
              )}
              {actions && (
                <View style={styles.actionsCell}>
                  <RowMenu actions={actions(row)} label={`Actions for ${labelOf(row)}`} />
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Footer */}
      {rows.length > 0 && (
        <View style={[styles.pager, { borderTopColor: theme.border }]}>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
            Showing {page * pageSize + 1}–{page * pageSize + visible.length} of {rows.length} results
          </ThemedText>
          {pages > 1 && (
            <View style={styles.pageButtons}>
              <PageButton icon={Icons.chevronLeft} label="Previous page" disabled={page === 0} onPress={() => setPage(page - 1)} />
              {Array.from({ length: pages }, (_, i) => (
                <PageButton key={i} text={String(i + 1)} label={`Page ${i + 1}`} active={i === page} onPress={() => setPage(i)} />
              ))}
              <PageButton
                icon={Icons.chevronRight}
                label="Next page"
                disabled={page === pages - 1}
                onPress={() => setPage(page + 1)}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function SortButton({ title, icon, onPress }: { title: string; icon: IconName | null; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Sort by ${title}`}
      style={styles.sortButton}>
      <ThemedText type="caption" style={{ color: icon ? theme.text : theme.textSecondary }}>
        {title}
      </ThemedText>
      {icon && <Icon name={icon} size={14} color={theme.text} />}
    </Pressable>
  );
}

function PageButton({
  text,
  icon,
  label,
  active = false,
  disabled = false,
  onPress,
}: {
  text?: string;
  icon?: IconName;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      style={[
        styles.pageButton,
        active && { backgroundColor: theme.primary },
        icon && !disabled && { backgroundColor: theme.text },
        disabled && { backgroundColor: theme.backgroundSelected },
      ]}>
      {icon ? (
        <Icon name={icon} size={16} color={disabled ? theme.textSecondary : theme.background} />
      ) : (
        <ThemedText type="caption" style={{ color: active ? theme.onPrimary : theme.text }}>
          {text}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  full: {
    width: '100%',
  },
  light: {
    fontWeight: '400',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dash: {
    width: 10,
    height: 2,
    borderRadius: 1,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    height: 44,
    paddingHorizontal: Spacing.three,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  toolbarCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  toolbarTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    height: 40,
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    outlineStyle: 'none',
  } as object,
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    height: 40,
  },
  table: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: 60,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  cell: {
    justifyContent: 'center',
  },
  compactBody: {
    flex: 1,
    gap: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.three,
    rowGap: Spacing.one,
  },
  metaItem: {
    flexShrink: 1,
  },
  actionsCell: {
    width: 32,
    alignItems: 'center',
  },
  empty: {
    padding: Spacing.four,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageButtons: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  pageButton: {
    minWidth: 28,
    height: 28,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
