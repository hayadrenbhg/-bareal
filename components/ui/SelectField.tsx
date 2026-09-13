import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors, { Brand } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

type Option = { value: string; label: string };

type OptionSheetProps = {
  visible: boolean;
  title: string;
  options: readonly Option[];
  selectedValue?: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
};

/** シンプルな候補選択モーダル（カード装飾なし） */
export function OptionSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: OptionSheetProps) {
  const colors = Colors.dark;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <FlatList
            data={[...options]}
            keyExtractor={(item) => item.value}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: option }) => {
              const selected = option.value === selectedValue;
              return (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.rowLabel,
                      { color: selected ? Brand.accent : colors.text },
                      selected && styles.rowLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            }}
          />
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>キャンセル</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type SelectFieldProps = {
  label: string;
  valueLabel: string | null;
  placeholder?: string;
  error?: string;
  onPress: () => void;
};

export function SelectField({
  label,
  valueLabel,
  placeholder = '選択してください',
  error,
  onPress,
}: SelectFieldProps) {
  const colors = Colors.dark;

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={[
          styles.select,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.selectText,
            { color: valueLabel ? colors.text : colors.textSecondary },
          ]}
        >
          {valueLabel ?? placeholder}
        </Text>
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>▼</Text>
      </Pressable>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

type ChipGroupProps = {
  options: readonly Option[];
  selected: string[];
  onToggle: (value: string) => void;
  error?: string;
};

export function ChipGroup({ options, selected, onToggle, error }: ChipGroupProps) {
  const colors = Colors.dark;

  return (
    <View>
      <View style={styles.chips}>
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => onToggle(option.value)}
              style={[
                styles.chip,
                {
                  borderColor: active ? Brand.accent : colors.border,
                  backgroundColor: active ? 'rgba(255,107,53,0.12)' : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? Brand.accent : colors.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    maxHeight: '70%',
  },
  list: {
    flexGrow: 0,
  },
  title: {
    fontSize: FontSize.section,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  row: {
    paddingVertical: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: FontSize.bodyLarge,
  },
  rowLabelSelected: {
    fontWeight: '600',
  },
  cancel: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSize.body,
  },
  field: {
    marginTop: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  select: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: FontSize.bodyLarge,
    flex: 1,
  },
  chevron: {
    fontSize: 10,
    marginLeft: Spacing.sm,
  },
  error: {
    fontSize: FontSize.caption,
    marginTop: Spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: FontSize.body,
    fontWeight: '500',
  },
});
