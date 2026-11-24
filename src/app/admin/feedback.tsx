import { StyleSheet, View } from 'react-native';

import { AdminCard } from '@/components/admin/admin-ui';
import { EmptyState } from '@/components/ui/empty-state';
import { Icons } from '@/components/ui/icon';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { AdminShell } from '@/components/admin/admin-shell';
import { Tag } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import type { FeedbackKind } from '@/data/types';
import { useFeedback } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/utils/format';

const KIND_LABEL: Record<FeedbackKind, string> = {
  issue: 'Problem',
  suggestion: 'Suggestion',
  question: 'Question',
};

/** Admin: messages sent from Help & Feedback. */
export default function AdminFeedbackScreen() {
  const theme = useTheme();
  const { feedback, loading } = useFeedback();
  const color: Record<FeedbackKind, string> = {
    issue: theme.danger,
    suggestion: theme.primary,
    question: theme.warning,
  };

  return (
    <AdminShell active="feedback" title="Feedback" subtitle="Problems, suggestions and questions from Help & Feedback">
      {loading ? (
        <LoadingAnimation label="Loading feedback…" scale={0.8} />
      ) : feedback.length === 0 ? (
        <EmptyState
          icon={Icons.chat}
          title="No feedback yet"
          message="Messages sent from Profile › Help & Feedback appear here."
        />
      ) : (
        <View style={styles.list}>
          {feedback.map((f) => (
            <AdminCard key={f.id}>
              <View style={styles.top}>
                <Tag label={KIND_LABEL[f.kind]} color={color[f.kind]} />
                <ThemedText type="caption" themeColor="textSecondary">
                  {timeAgo(f.createdAt)}
                </ThemedText>
              </View>
              <ThemedText type="small">{f.message}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                From {f.senderName}
              </ThemedText>
            </AdminCard>
          ))}
        </View>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
