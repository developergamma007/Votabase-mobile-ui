/** Premium design tokens — slate + blue glass aesthetic */
export const premium = {
  bg: '#F1F5F9',
  bgCard: '#FFFFFF',
  bgDark: '#0F172A',
  bgDarkMid: '#1E293B',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  accent: '#3B82F6',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  text: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  borderFocus: '#93C5FD',
  shadow: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 6,
    },
    soft: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
};

export const premiumInput = {
  backgroundColor: premium.bgCard,
  borderWidth: 1,
  borderColor: premium.border,
  borderRadius: premium.radius.md,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 15,
  color: premium.text,
  ...premium.shadow.soft,
};

export const premiumLabel = {
  fontSize: 12,
  fontWeight: '700' as const,
  color: premium.textMuted,
  letterSpacing: 0.6,
  textTransform: 'uppercase' as const,
  marginBottom: 8,
};
