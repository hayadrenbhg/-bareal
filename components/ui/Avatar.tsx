import { Image, StyleSheet, Text, View, type ImageStyle, type ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type AvatarProps = {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
};

/**
 * プロフィールアバター
 * - avatar_url があれば画像表示
 * - なければ username の頭文字を表示
 */
export function Avatar({ uri, name, size = 80, style }: AvatarProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const initial = name?.charAt(0).toUpperCase() ?? '?';

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const imageStyle: ImageStyle = {
    width: size,
    height: size,
  };

  if (uri) {
    return (
      <View style={[containerStyle, style]}>
        <Image source={{ uri }} style={imageStyle} />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <Text style={[styles.initial, { color: colors.tint, fontSize: size * 0.4 }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initial: {
    fontWeight: '700',
  },
});
