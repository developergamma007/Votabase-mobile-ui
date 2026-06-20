import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { isAdminIswotUser } from './FeatureComingSoon';
import { persistAssemblyCode } from '../apis/Api';
import { premium } from '../constants/premiumTheme';
import { AppDropdown } from './AppDropdown';

type AssemblyItem = { label: string; value: string };

type Props = {
  selectedAsm: string;
  setSelectedAsm: (value: string) => void;
  asmItems: AssemblyItem[];
  onSelectItem?: (item: AssemblyItem) => void;
};

export default function AssemblyContextBar({
  selectedAsm,
  setSelectedAsm,
  asmItems,
  onSelectItem,
}: Props) {
  const { userInfo } = useContext(AuthContext);
  const info = userInfo && typeof userInfo === 'object' ? userInfo : null;
  const canSwitchAssembly = isAdminIswotUser(info);

  useEffect(() => {
    if (!canSwitchAssembly || !asmItems.length) return;
    const isValid = selectedAsm && asmItems.some((item) => item.value === selectedAsm);
    if (!isValid) {
      const first = asmItems[0];
      setSelectedAsm(first.value);
      persistAssemblyCode(first.value);
      if (onSelectItem) onSelectItem(first);
    }
  }, [canSwitchAssembly, selectedAsm, asmItems]);

  if (!canSwitchAssembly) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>CONTEXT</Text>
        <View style={styles.dropdownWrap}>
          <AppDropdown
            value={selectedAsm}
            items={asmItems}
            onChange={(next) => {
              setSelectedAsm(next);
              persistAssemblyCode(next);
              const item = asmItems.find((entry) => entry.value === next);
              if (item && onSelectItem) onSelectItem(item);
            }}
            placeholder="Select Assembly"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 3000,
    backgroundColor: premium.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: premium.bgCard,
    padding: 14,
    borderRadius: premium.radius.lg,
    borderWidth: 1,
    borderColor: premium.border,
    ...premium.shadow.soft,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: premium.textMuted,
    marginRight: 12,
    letterSpacing: 0.8,
  },
  dropdownWrap: {
    flex: 1,
  },
});
