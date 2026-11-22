import { StyleSheet, View } from 'react-native';

import { SettingsScreen } from '@/components/settings-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { SUPPORT_EMAIL } from '@/constants/app';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Information we collect',
    body: [
      'Account details you give us: your name, email address, contact number, municipality and barangay, and an optional profile photo.',
      'Your activity in the app: events you save, your Going / Interested responses, your interests and notification settings.',
      'For organizer applications: organization details, contact information and the supporting documents you upload.',
    ],
  },
  {
    title: 'How we use your information',
    body: [
      'To show and recommend local events, remind you about events you are going to, and alert you when events you follow change.',
      'To verify organizations before they can publish events.',
      'To answer your questions, reports and feedback.',
    ],
  },
  {
    title: 'Event participation',
    body: [
      'Organizers see how many people are Going or Interested in their events, not who they are.',
      'Your saved events and responses are visible only to you.',
    ],
  },
  {
    title: 'How we protect your account',
    body: [
      'Passwords are stored hashed by our authentication provider, and all connections use encryption (HTTPS).',
      'Database rules make sure only you can see or change your own data, and only verified organizers can post events.',
    ],
  },
  {
    title: 'Data sharing',
    body: [
      'We do not sell your personal information. We share it only with service providers that run the app for us (such as hosting), or when required by law.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      'Under the Data Privacy Act of 2012 (Republic Act No. 10173) you may access, correct, or delete your personal information, and object to its processing.',
      'You can edit your profile anytime, and deactivate or permanently delete your account in Account & Security.',
    ],
  },
  {
    title: 'Contact',
    body: [`For privacy concerns, email ${SUPPORT_EMAIL}.`],
  },
];

export default function PrivacyScreen() {
  return (
    <SettingsScreen title="Privacy Policy">
      <ThemedText type="caption" themeColor="textSecondary">
        Draft policy for the Community Connect class project. To be reviewed before public release.
      </ThemedText>
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <ThemedText type="heading">{section.title}</ThemedText>
          {section.body.map((p, i) => (
            <ThemedText key={i} type="small" style={styles.paragraph}>
              {p}
            </ThemedText>
          ))}
        </View>
      ))}
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  paragraph: {
    lineHeight: 22,
  },
});
