/** Be Reach カラーパレット — ダークベース + エネルギッシュなアクセント */
const accent = '#FF6B35';
const accentMuted = '#FF8C5A';

export default {
  light: {
    text: '#1A1A1A',
    textSecondary: '#666666',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    tint: accent,
    tabIconDefault: '#999999',
    tabIconSelected: accent,
    error: '#E53935',
    success: '#43A047',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    background: '#0D0D0D',
    surface: '#1A1A1A',
    border: '#2A2A2A',
    tint: accent,
    tabIconDefault: '#666666',
    tabIconSelected: accentMuted,
    error: '#EF5350',
    success: '#66BB6A',
  },
};

export const Brand = {
  accent,
  accentMuted,
  name: 'Be Reach',
} as const;
