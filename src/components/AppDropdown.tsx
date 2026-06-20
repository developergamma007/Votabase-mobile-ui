import React from 'react';
import { StyleSheet } from 'react-native';
import { Dropdown, MultiSelect } from 'react-native-element-dropdown';
import { premium } from '../constants/premiumTheme';

export type AppDropdownItem = { label: string; value: string };

const LIST_SCROLL = { nestedScrollEnabled: true as const };

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: premium.bgCard,
    borderColor: premium.border,
    borderWidth: 1,
    borderRadius: premium.radius.md,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  container: {
    backgroundColor: premium.bgCard,
    borderColor: premium.border,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    marginTop: 4,
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  placeholder: {
    color: premium.textLight,
    fontSize: 14,
  },
  selectedText: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemText: {
    color: premium.text,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedBadge: {
    borderRadius: 12,
    backgroundColor: premium.primary,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

type BaseProps = {
  items: AppDropdownItem[];
  placeholder?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: object;
};

type SingleProps = BaseProps & {
  value?: string | null;
  onChange: (value: string) => void;
};

export function AppDropdown({
  value,
  items,
  onChange,
  placeholder = 'Select',
  disabled,
  onFocus,
  onBlur,
  style,
}: SingleProps) {
  return (
    <Dropdown
      data={items}
      labelField="label"
      valueField="value"
      value={value}
      placeholder={placeholder}
      disable={disabled}
      search={false}
      autoScroll={false}
      onChange={(item) => onChange(String(item.value))}
      style={[styles.dropdown, style]}
      containerStyle={styles.container}
      placeholderStyle={styles.placeholder}
      selectedTextStyle={styles.selectedText}
      itemTextStyle={styles.itemText}
      activeColor="#EEF2FF"
      maxHeight={240}
      flatListProps={LIST_SCROLL}
      showsVerticalScrollIndicator
      dropdownPosition="auto"
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

type MultiProps = BaseProps & {
  value?: string[];
  onChange: (values: string[]) => void;
};

export function AppMultiDropdown({
  value = [],
  items,
  onChange,
  placeholder = 'Select',
  disabled,
  onFocus,
  onBlur,
  style,
}: MultiProps) {
  return (
    <MultiSelect
      data={items}
      labelField="label"
      valueField="value"
      value={value}
      placeholder={placeholder}
      disable={disabled}
      search={false}
      onChange={onChange}
      style={[styles.dropdown, style]}
      containerStyle={styles.container}
      placeholderStyle={styles.placeholder}
      selectedTextStyle={styles.selectedText}
      itemTextStyle={styles.itemText}
      selectedStyle={styles.selectedBadge}
      selectedTextProps={{ style: styles.selectedBadgeText }}
      activeColor="#EEF2FF"
      maxHeight={240}
      flatListProps={LIST_SCROLL}
      showsVerticalScrollIndicator
      dropdownPosition="auto"
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}
