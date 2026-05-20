import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { premium, premiumInput, premiumLabel } from '../constants/premiumTheme';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
};

export function PremiumScreen({ children, scroll = true, padded = true }: ScreenProps) {
  const content = (
    <View style={[styles.screenInner, padded && styles.padded]}>{children}</View>
  );
  if (scroll) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      </View>
    );
  }
  return <View style={styles.screen}>{content}</View>;
}

type CardProps = { children: React.ReactNode; style?: ViewStyle };

export function PremiumCard({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function PremiumButton({ label, onPress, variant = 'primary', disabled }: BtnProps) {
  const bg =
    variant === 'primary' ? premium.primary :
    variant === 'danger' ? premium.error :
    premium.bgCard;
  const color = variant === 'secondary' ? premium.text : '#FFFFFF';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.btn, { backgroundColor: disabled ? premium.textLight : bg }, variant === 'secondary' && styles.btnOutline]}
    >
      <Text style={[styles.btnText, { color: disabled ? '#fff' : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function PremiumSectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
    </View>
  );
}

export const premiumFieldLabel = premiumLabel;
export const premiumFieldInput = premiumInput;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: premium.bg },
  screenInner: { flex: 1 },
  padded: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  scrollContent: { flexGrow: 1 },
  card: {
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: premium.border,
    ...premium.shadow.card,
  },
  btn: {
    borderRadius: premium.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginVertical: 6,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: premium.border,
  },
  btnText: { fontSize: 15, fontWeight: '700' },
  sectionTitleWrap: { marginBottom: 14, marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: premium.text },
  sectionSub: { fontSize: 13, color: premium.textMuted, marginTop: 4 },
});
