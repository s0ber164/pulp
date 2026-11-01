import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  uri?: string;
  symbol: string;
  size?: number;
};

export function TokenAvatar({ uri, symbol, size = 40 }: Props) {
  const radius = size * 0.28;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.bgPanel,
        }}
      />
    );
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.letter, { fontSize: size * 0.36 }]}>
        {(symbol || '?').slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  letter: { color: colors.accent, fontWeight: '700' },
});
