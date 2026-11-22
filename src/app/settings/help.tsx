import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/form-field';
import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { SettingsScreen, SettingsSection } from '@/components/ui/settings-screen';
import { ThemedText } from '@/components/ui/themed-text';
import { SUPPORT_EMAIL } from '@/constants/app';
import { Spacing } from '@/constants/theme';
import { submitFeedback } from '@/data/account';
import type { FeedbackKind } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

const FAQS: { q: string; a: string }[] = [
  { q: 'How do I find events near me?', a: 'Open Browse and search, or tap a category. Use the filter button to narrow by date, location or organizer. Events that match your interests appear under "Recommended for you".' },
  { q: 'How do I join or register for an event?', a: 'Open the event and read "How to join". Each organizer explains how to register, what to bring and any fees. Tap Going so you get a reminder.' },
  { q: 'How do I save an event?', a: 'Tap the bookmark on the event picture. Saved events are in the Saved tab, and you get alerts if they change.' },
  { q: "What's the difference between Going and Interested?", a: "Going means you plan to attend; you'll get a reminder the day before. Interested means you're thinking about it. Both appear on your Map and in the Saved tab." },
  { q: 'How do I become an organizer?', a: 'Go to Profile → Become an Organizer, fill in your organization details and attach supporting documents. An administrator reviews it; once approved, Organizer Tools appear in your profile.' },
  { q: 'Why did I get a notification?', a: 'You get alerts when an event you saved or responded to changes, reminders for events you are going to, and recommendations. Choose which ones in Profile → Notifications.' },
  { q: 'How do I report a misleading event?', a: 'Open the event, scroll down and tap "Report this event". Administrators review every report.' },
];

const KINDS: { id: FeedbackKind; label: string }[] = [
  { id: 'issue', label: 'Report an issue' },
  { id: 'suggestion', label: 'Suggestion' },
  { id: 'question', label: 'Question' },
];

/** Help & Feedback: FAQ, contact email and the feedback form (read by admins). */
export default function HelpScreen() {
  const theme = useTheme();
  const [open, setOpen] = useState<number | null>(null);
  const [kind, setKind] = useState<FeedbackKind>('issue');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const send = async () => {
    setError('');
    try {
      await submitFeedback(kind, message);
      setSent(true);
      setMessage('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <SettingsScreen title="Help & Feedback">
      <SettingsSection title="Frequently asked questions">
        <View>
          {FAQS.map((f, i) => (
            <View key={f.q} style={[styles.faq, { borderBottomColor: theme.border }]}>
              <Pressable
                onPress={() => setOpen(open === i ? null : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open === i }}
                style={styles.faqHead}>
                <ThemedText type="smallBold" style={styles.flex}>
                  {f.q}
                </ThemedText>
                <Icon name={open === i ? Icons.chevronUp : Icons.chevronDown} size={20} color={theme.text} />
              </Pressable>
              {open === i && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.answer}>
                  {f.a}
                </ThemedText>
              )}
            </View>
          ))}
        </View>
      </SettingsSection>

      <SettingsSection title="Contact us" description="We're here to help with any questions or concerns.">
        <ContactRow icon={Icons.mail} label="Email" value={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
      </SettingsSection>

      <SettingsSection title="Send feedback" description="Report a problem or suggest an improvement. Administrators read every message.">
        <View style={styles.chips}>
          {KINDS.map((k) => (
            <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => setKind(k.id)} />
          ))}
        </View>
        <TextField
          label="Message"
          value={message}
          onChangeText={(t) => {
            setMessage(t);
            setSent(false);
          }}
          placeholder={kind === 'issue' ? 'What happened? What did you expect?' : 'Tell us more'}
          multiline
          maxLength={1000}
          error={error || undefined}
        />
        {sent && (
          <ThemedText type="small" themeColor="success">
            Thanks! Your message was sent to the administrators.
          </ThemedText>
        )}
        <Button label="Send" icon={Icons.check} onPress={send} style={styles.send} />
      </SettingsSection>
    </SettingsScreen>
  );
}

function ContactRow({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => [styles.contact, pressed && { opacity: 0.7 }]}>
      <View style={[styles.contactIcon, { backgroundColor: theme.backgroundElement }]}>
        <Icon name={icon} size={20} color={theme.text} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold">{value}</ThemedText>
      </View>
      <Icon name={Icons.chevronRight} size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  faq: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  answer: {
    paddingBottom: Spacing.three,
    lineHeight: 21,
  },
  flex: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  send: {
    flex: 0,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
  },
});
