import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface KPISparklineProps {
  data: Array<{ value: number }>;
  color?: string;
}

export function KPISparkline({ color = '#6366f1', data }: KPISparklineProps) {
  return (
    <div className="h-12 w-28">
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line dataKey="value" dot={false} stroke={color} strokeWidth={2} type="monotone" isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
