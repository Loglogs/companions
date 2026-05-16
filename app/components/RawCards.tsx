import React from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Theme } from '../lib/theme';

interface RawEntry {
  name: string;
  path: string;
  mtime: string;
  preview?: string;
  isPending?: boolean;
}

interface Props {
  entries: RawEntry[];
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (entry: RawEntry) => void;
  theme: Theme;
  accent: string;
}

function cardColor(isDark: boolean): string {
  return isDark ? '#1e1e1e' : '#f7f4ef';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export default function RawCards({ entries, refreshing, onRefresh, onOpen, theme, accent }: Props) {
  const isDark = theme.bg === '#111111' || theme.bg < '#888888';

  const renderCard = ({ item, index }: { item: RawEntry; index: number }) => {
    const bg = cardColor(isDark);
    const isLeft = index % 2 === 0;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: bg, marginLeft: isLeft ? 0 : 4, marginRight: isLeft ? 4 : 0 }]}
        onPress={() => onOpen(item)}
        activeOpacity={0.8}
      >
        {item.isPending && (
          <View style={[styles.pendingDot, { backgroundColor: accent }]} />
        )}
        {item.preview ? (
          <Text style={[styles.preview, { color: theme.textDim }]} numberOfLines={6}>
            {item.preview}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: theme.textFaint }]}>
          {formatDate(item.mtime)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.path}
      renderItem={renderCard}
      numColumns={2}
      columnWrapperStyle={styles.row}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textDim} />}
      contentContainerStyle={entries.length === 0 ? styles.empty : styles.content}
      ListEmptyComponent={
        <View style={styles.emptyInner}>
          <Text style={{ color: theme.textDim, textAlign: 'center' }}>No raw files yet</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 8, paddingBottom: 100 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyInner: { alignItems: 'center', padding: 32 },
  row: { marginBottom: 8 },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
  },
  pendingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    position: 'absolute',
    top: 10,
    right: 10,
  },
  preview: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  date: {
    fontSize: 11,
    marginTop: 'auto',
  },
});
