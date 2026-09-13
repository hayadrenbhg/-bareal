import { AppConfig } from '@/constants/config';

export type ValidationResult = {
  valid: boolean;
  message?: string;
};

export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim();

  if (!trimmed) {
    return { valid: false, message: 'ユーザー名を入力してください' };
  }

  if (trimmed.length > AppConfig.username.maxLength) {
    return {
      valid: false,
      message: `ユーザー名は${AppConfig.username.maxLength}文字以内にしてください`,
    };
  }

  if (!AppConfig.username.pattern.test(trimmed)) {
    return {
      valid: false,
      message: 'ユーザー名は英数字のみ使用できます',
    };
  }

  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();

  if (!trimmed) {
    return { valid: false, message: 'メールアドレスを入力してください' };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) {
    return { valid: false, message: '有効なメールアドレスを入力してください' };
  }

  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, message: 'パスワードを入力してください' };
  }

  if (password.length < AppConfig.passwordMinLength) {
    return {
      valid: false,
      message: `パスワードは${AppConfig.passwordMinLength}文字以上にしてください`,
    };
  }

  return { valid: true };
}

export function validateDisplayName(displayName: string): ValidationResult {
  const trimmed = displayName.trim();

  if (trimmed.length > AppConfig.profile.displayNameMaxLength) {
    return {
      valid: false,
      message: `表示名は${AppConfig.profile.displayNameMaxLength}文字以内にしてください`,
    };
  }

  return { valid: true };
}

/** 登録 STEP2 用（必須） */
export function validateDisplayNameRequired(displayName: string): ValidationResult {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return { valid: false, message: '表示名を入力してください' };
  }
  return validateDisplayName(trimmed);
}

export function validateBirthDate(date: Date | null): ValidationResult {
  if (!date) {
    return { valid: false, message: '生年月日を選択してください' };
  }

  const now = new Date();
  if (date > now) {
    return { valid: false, message: '正しい生年月日を選択してください' };
  }

  const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 13) {
    return { valid: false, message: '13歳以上である必要があります' };
  }

  return { valid: true };
}

export function validateBio(bio: string): ValidationResult {
  if (bio.length > AppConfig.profile.bioMaxLength) {
    return {
      valid: false,
      message: `自己紹介は${AppConfig.profile.bioMaxLength}文字以内にしてください`,
    };
  }

  return { valid: true };
}
