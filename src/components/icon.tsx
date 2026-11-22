import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

export type IconName = { ios: SFSymbol; md: AndroidSymbol };

type IconProps = {
  name: IconName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ViewStyle>;
};

/** SF Symbol on iOS, Material Symbol on Android and web. */
export function Icon({ name, size = 20, color, style }: IconProps) {
  return (
    <SymbolView
      name={{ ios: name.ios, android: name.md, web: name.md }}
      size={size}
      tintColor={color}
      style={style}
    />
  );
}

export const Icons = {
  search: { ios: 'magnifyingglass', md: 'search' },
  filter: { ios: 'line.3.horizontal.decrease', md: 'tune' },
  bell: { ios: 'bell', md: 'notifications' },
  calendar: { ios: 'calendar', md: 'calendar_today' },
  clock: { ios: 'clock', md: 'schedule' },
  venue: { ios: 'building.2', md: 'apartment' },
  location: { ios: 'mappin.and.ellipse', md: 'location_on' },
  bookmark: { ios: 'bookmark', md: 'bookmark_border' },
  bookmarkFilled: { ios: 'bookmark.fill', md: 'bookmark_added' },
  verified: { ios: 'checkmark.seal.fill', md: 'verified' },
  interested: { ios: 'star', md: 'star' },
  going: { ios: 'checkmark.circle', md: 'check_circle' },
  back: { ios: 'chevron.left', md: 'arrow_back' },
  chevronRight: { ios: 'chevron.right', md: 'chevron_right' },
  info: { ios: 'info.circle', md: 'info' },
  person: { ios: 'person', md: 'person' },
  close: { ios: 'xmark', md: 'close' },
  eventBusy: { ios: 'calendar.badge.exclamationmark', md: 'event_busy' },
  edit: { ios: 'pencil', md: 'edit' },
  heart: { ios: 'heart', md: 'favorite' },
  megaphone: { ios: 'megaphone', md: 'campaign' },
  privacy: { ios: 'hand.raised', md: 'privacy_tip' },
  help: { ios: 'questionmark.circle', md: 'help' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', md: 'logout' },
  add: { ios: 'plus', md: 'add' },
  chevronLeft: { ios: 'chevron.left', md: 'chevron_left' },
  check: { ios: 'checkmark', md: 'check' },
  editCalendar: { ios: 'calendar.badge.clock', md: 'edit_calendar' },
  switchAccount: { ios: 'arrow.left.arrow.right', md: 'swap_horiz' },
  bellActive: { ios: 'bell.badge', md: 'notifications_active' },
  lock: { ios: 'lock', md: 'lock' },
  history: { ios: 'clock.arrow.circlepath', md: 'history' },
  mail: { ios: 'envelope', md: 'mail' },
  phone: { ios: 'phone', md: 'call' },
  camera: { ios: 'camera', md: 'photo_camera' },
  document: { ios: 'doc', md: 'description' },
  flag: { ios: 'flag', md: 'flag' },
  map: { ios: 'map', md: 'map' },
  attach: { ios: 'paperclip', md: 'attach_file' },
  chevronDown: { ios: 'chevron.down', md: 'expand_more' },
  chevronUp: { ios: 'chevron.up', md: 'expand_less' },
  addCircle: { ios: 'plus.circle', md: 'add_circle' },
  sun: { ios: 'sun.max', md: 'light_mode' },
  moon: { ios: 'moon', md: 'dark_mode' },
  appearance: { ios: 'circle.lefthalf.filled', md: 'contrast' },
} satisfies Record<string, IconName>;
