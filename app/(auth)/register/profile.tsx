import { RegisterStepHeader } from '@/components/auth/RegisterStepHeader';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Button, Input } from '@/components/ui/Form';
import { OptionSheet, SelectField } from '@/components/ui/SelectField';
import Colors from '@/constants/Colors';
import { GENDER_OPTIONS, type GenderValue } from '@/constants/register-options';
import { Spacing } from '@/constants/spacing';
import { useRegisterDraft } from '@/hooks/useRegisterDraft';
import {
  validateBirthDate,
  validateDisplayNameRequired,
} from '@/utils/validation';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

type PickerKind = 'year' | 'month' | 'day' | 'gender' | null;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function buildYearOptions() {
  const maxYear = new Date().getFullYear() - 13;
  const years: { value: string; label: string }[] = [];
  for (let y = maxYear; y >= 1920; y -= 1) {
    years.push({ value: String(y), label: `${y}年` });
  }
  return years;
}

const YEAR_OPTIONS = buildYearOptions();
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}月`,
}));

function formatBirthDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default function RegisterProfileScreen() {
  const { draft, patchDraft } = useRegisterDraft();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<PickerKind>(null);
  const [year, setYear] = useState<number | null>(
    draft.birthDate ? draft.birthDate.getFullYear() : null,
  );
  const [month, setMonth] = useState<number | null>(
    draft.birthDate ? draft.birthDate.getMonth() + 1 : null,
  );
  const [day, setDay] = useState<number | null>(
    draft.birthDate ? draft.birthDate.getDate() : null,
  );

  const genderLabel = useMemo(() => {
    if (!draft.gender) return null;
    return GENDER_OPTIONS.find((o) => o.value === draft.gender)?.label ?? null;
  }, [draft.gender]);

  const dayOptions = useMemo(() => {
    if (!year || !month) {
      return Array.from({ length: 31 }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1}日`,
      }));
    }
    const count = daysInMonth(year, month);
    return Array.from({ length: count }, (_, i) => ({
      value: String(i + 1),
      label: `${i + 1}日`,
    }));
  }, [year, month]);

  const clearError = (field: string) => {
    if (!errors[field]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const applyBirthDate = (nextYear: number | null, nextMonth: number | null, nextDay: number | null) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);

    if (nextYear && nextMonth && nextDay) {
      const maxDay = daysInMonth(nextYear, nextMonth);
      const safeDay = Math.min(nextDay, maxDay);
      if (safeDay !== nextDay) {
        setDay(safeDay);
      }
      const date = new Date(nextYear, nextMonth - 1, safeDay);
      patchDraft({ birthDate: date });
      clearError('birthDate');
    } else {
      patchDraft({ birthDate: null });
    }
  };

  const handleNext = () => {
    const nameResult = validateDisplayNameRequired(draft.displayName);
    const birthResult = validateBirthDate(draft.birthDate);

    const newErrors: Record<string, string> = {};
    if (!nameResult.valid) newErrors.displayName = nameResult.message!;
    if (!birthResult.valid) newErrors.birthDate = birthResult.message!;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    router.push('/(auth)/register/training');
  };

  return (
    <ScreenWrapper scroll>
      <RegisterStepHeader step={2} title="プロフィールについて" />

      <Input
        label="表示名"
        value={draft.displayName}
        onChangeText={(value) => {
          patchDraft({ displayName: value });
          clearError('displayName');
        }}
        error={errors.displayName}
        autoComplete="name"
        maxLength={30}
        placeholder="アプリ上の表示名"
      />

      <SelectField
        label="年"
        valueLabel={year ? `${year}年` : null}
        placeholder="年を選択"
        error={errors.birthDate && !year ? errors.birthDate : undefined}
        onPress={() => setPicker('year')}
      />
      <SelectField
        label="月"
        valueLabel={month ? `${month}月` : null}
        placeholder="月を選択"
        error={errors.birthDate && year && !month ? errors.birthDate : undefined}
        onPress={() => setPicker('month')}
      />
      <SelectField
        label="日"
        valueLabel={day ? `${day}日` : null}
        placeholder="日を選択"
        error={errors.birthDate && year && month && !day ? errors.birthDate : undefined}
        onPress={() => setPicker('day')}
      />

      {draft.birthDate ? (
        <Text style={[styles.preview, { color: Colors.dark.textSecondary }]}>
          {formatBirthDate(draft.birthDate)}
        </Text>
      ) : null}

      <SelectField
        label="性別（任意）"
        valueLabel={genderLabel}
        placeholder="選択しない"
        onPress={() => setPicker('gender')}
      />

      <OptionSheet
        visible={picker === 'year'}
        title="年"
        options={YEAR_OPTIONS}
        selectedValue={year ? String(year) : null}
        onSelect={(value) => applyBirthDate(Number(value), month, day)}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === 'month'}
        title="月"
        options={MONTH_OPTIONS}
        selectedValue={month ? String(month) : null}
        onSelect={(value) => applyBirthDate(year, Number(value), day)}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === 'day'}
        title="日"
        options={dayOptions}
        selectedValue={day ? String(day) : null}
        onSelect={(value) => applyBirthDate(year, month, Number(value))}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === 'gender'}
        title="性別"
        options={GENDER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        selectedValue={draft.gender}
        onSelect={(value) => patchDraft({ gender: value as GenderValue })}
        onClose={() => setPicker(null)}
      />

      <Button title="次へ" onPress={handleNext} style={styles.cta} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  preview: {
    marginTop: Spacing.sm,
    fontSize: 14,
  },
  cta: {
    marginTop: Spacing.xl,
  },
});
