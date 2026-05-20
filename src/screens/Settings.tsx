import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { PremiumScreen, PremiumCard, PremiumSectionTitle } from '../components/PremiumUI';
import { premium } from '../constants/premiumTheme';

const LANG_KEY = 'app_language';

export default function Settings() {
  const { setBanner, clearLocal } = useContext(AuthContext);
  const [language, setLanguage] = useState('');

  const saveLanguage = async (lang: string) => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  useEffect(() => {
    const loadLanguage = async () => {
      const stored = await AsyncStorage.getItem(LANG_KEY);
      if (stored) setLanguage(stored);
    };
    loadLanguage();
  }, []);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
  };

  return (
    <PremiumScreen>
      <PremiumSectionTitle title="Settings" subtitle="Language and local data" />

      <PremiumCard>
        <Text style={styles.label}>Select language</Text>
        <View style={styles.langRow}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => {
              saveLanguage('en');
              showBanner('success', 'Language updated successfully');
            }}
          >
            <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'kn' && styles.langBtnActive]}
            onPress={() => {
              saveLanguage('kn');
              showBanner('success', 'Language updated successfully');
            }}
          >
            <Text style={[styles.langText, language === 'kn' && styles.langTextActive]}>Native</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          Current: {language === 'en' ? 'English' : language === 'kn' ? 'Native' : 'Not set'}
        </Text>
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.label}>Local cache</Text>
        <Text style={styles.hint}>
          Clears stored voter snapshots and reloads from the server on next sync.
        </Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={clearLocal}>
          <Text style={styles.dangerBtnText}>Clear local data</Text>
        </TouchableOpacity>
      </PremiumCard>
    </PremiumScreen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: premium.text,
    marginBottom: 12,
  },
  langRow: { flexDirection: 'row', gap: 12 },
  langBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: premium.border,
    alignItems: 'center',
    backgroundColor: premium.bg,
  },
  langBtnActive: {
    backgroundColor: premium.primary,
    borderColor: premium.primary,
  },
  langText: { fontWeight: '600', color: premium.text },
  langTextActive: { color: '#fff' },
  hint: { marginTop: 12, fontSize: 13, color: premium.textMuted, lineHeight: 18 },
  dangerBtn: {
    marginTop: 16,
    backgroundColor: premium.error,
    paddingVertical: 14,
    borderRadius: premium.radius.md,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
