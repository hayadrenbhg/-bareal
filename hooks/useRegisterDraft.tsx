import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  GenderValue,
  GymOptionKey,
  TrainingExperienceValue,
  TrainingGoalValue,
} from '@/constants/register-options';

export type RegisterDraft = {
  username: string;
  email: string;
  password: string;
  displayName: string;
  birthDate: Date | null;
  gender: GenderValue | null;
  gymKey: GymOptionKey | null;
  gymOtherName: string;
  trainingExperience: TrainingExperienceValue | null;
  trainingGoals: TrainingGoalValue[];
};

const initialDraft: RegisterDraft = {
  username: '',
  email: '',
  password: '',
  displayName: '',
  birthDate: null,
  gender: null,
  gymKey: null,
  gymOtherName: '',
  trainingExperience: null,
  trainingGoals: [],
};

type RegisterDraftContextValue = {
  draft: RegisterDraft;
  patchDraft: (partial: Partial<RegisterDraft>) => void;
  resetDraft: () => void;
};

const RegisterDraftContext = createContext<RegisterDraftContextValue | null>(null);

export function RegisterDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<RegisterDraft>(initialDraft);

  const patchDraft = useCallback((partial: Partial<RegisterDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(initialDraft);
  }, []);

  const value = useMemo(
    () => ({ draft, patchDraft, resetDraft }),
    [draft, patchDraft, resetDraft],
  );

  return (
    <RegisterDraftContext.Provider value={value}>{children}</RegisterDraftContext.Provider>
  );
}

export function useRegisterDraft(): RegisterDraftContextValue {
  const ctx = useContext(RegisterDraftContext);
  if (!ctx) {
    throw new Error('useRegisterDraft must be used within RegisterDraftProvider');
  }
  return ctx;
}
