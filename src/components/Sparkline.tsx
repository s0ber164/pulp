import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

type Props = {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
};

export function Sparkline({ data, width = 72, height = 28, positive }: Props) {
  if (!data.length) return <View style={{ width, height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const up = positive ?? data[data.length - 1] >= data[0];
  const stroke = up ? colors.up : colors.down;

  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - ((v - min) / span) * (height - 2) - 1;
    return `${x},${y}`;
  });

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ');

  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={stroke} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
