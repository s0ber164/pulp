import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  label: string;
  value: string;
  tone?: 'default' | 'up' | 'down' | 'accent';
};

export function StatBlock({ label, value, tone = 'default' }: Props) {
  const color =
    tone === 'up'
      ? colors.up
      : tone === 'down'
        ? colors.down
        : tone === 'accent'
          ? colors.accent
          : colors.text;

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    color: colors.textMute,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  value: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
