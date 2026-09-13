import {
  validateBio,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/utils/validation';

describe('validateUsername', () => {
  it('accepts valid alphanumeric username', () => {
    expect(validateUsername('user123').valid).toBe(true);
  });

  it('rejects empty username', () => {
    const result = validateUsername('');
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('rejects username over 20 characters', () => {
    const result = validateUsername('a'.repeat(21));
    expect(result.valid).toBe(false);
  });

  it('rejects non-alphanumeric characters', () => {
    expect(validateUsername('user_name').valid).toBe(false);
    expect(validateUsername('ユーザー').valid).toBe(false);
    expect(validateUsername('user@name').valid).toBe(false);
  });
});

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('test@example.com').valid).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(validateEmail('not-an-email').valid).toBe(false);
    expect(validateEmail('').valid).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts password with 8+ characters', () => {
    expect(validatePassword('password123').valid).toBe(true);
  });

  it('rejects short password', () => {
    expect(validatePassword('short').valid).toBe(false);
  });

  it('rejects empty password', () => {
    expect(validatePassword('').valid).toBe(false);
  });
});

describe('validateDisplayName', () => {
  it('accepts empty display name', () => {
    expect(validateDisplayName('').valid).toBe(true);
  });

  it('rejects display name over max length', () => {
    expect(validateDisplayName('a'.repeat(31)).valid).toBe(false);
  });
});

describe('validateBio', () => {
  it('accepts bio within limit', () => {
    expect(validateBio('筋トレ好きです').valid).toBe(true);
  });

  it('rejects bio over max length', () => {
    expect(validateBio('a'.repeat(161)).valid).toBe(false);
  });
});
