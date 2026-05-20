import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { premium } from '../constants/premiumTheme';

type ListPreviewProps = {
  items: string[];
  placeholder?: string;
  accentColor?: string;
  maxPreviewLen?: number;
};

function truncate(text: string, max: number) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function ListPreview({
  items,
  placeholder = '-',
  accentColor = premium.primary,
  maxPreviewLen = 28,
}: ListPreviewProps) {
  const [open, setOpen] = useState(false);
  const list = (items || []).filter((x) => x && String(x).trim());

  if (!list.length) {
    return <Text style={styles.value}>{placeholder}</Text>;
  }

  if (list.length === 1) {
    return (
      <Text style={[styles.value, { color: accentColor }]} numberOfLines={2}>
        {list[0]}
      </Text>
    );
  }

  const more = list.length - 1;

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.previewLine} numberOfLines={2}>
          <Text style={[styles.value, { color: accentColor }]}>
            {truncate(list[0], maxPreviewLen)}
          </Text>
          <Text style={styles.moreBadge}> (+{more} more)</Text>
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>All items ({list.length})</Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {list.map((item, idx) => (
                <View key={`${item}-${idx}`} style={styles.sheetRow}>
                  <Text style={styles.sheetBullet}>•</Text>
                  <Text style={styles.sheetItem}>{item}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  value: { fontSize: 14, fontWeight: '700', color: premium.text, flex: 1 },
  previewLine: { fontSize: 14, lineHeight: 20 },
  moreBadge: { fontSize: 12, fontWeight: '600', color: premium.textMuted },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.lg,
    padding: 20,
    maxHeight: '70%',
    ...premium.shadow.card,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: premium.text, marginBottom: 12 },
  sheetScroll: { maxHeight: 320 },
  sheetRow: { flexDirection: 'row', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: premium.border },
  sheetBullet: { color: premium.primary, marginRight: 8, fontWeight: '700' },
  sheetItem: { flex: 1, fontSize: 14, color: premium.text, lineHeight: 20 },
  closeBtn: {
    marginTop: 16,
    backgroundColor: premium.primary,
    paddingVertical: 12,
    borderRadius: premium.radius.md,
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
