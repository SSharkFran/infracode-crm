import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { RevenueByMonthItem } from '../../types';
import { formatCurrencyBRL } from '../../lib/utils';
import { CustomTooltip } from './CustomTooltip';

interface RevenueChartProps {
  data: RevenueByMonthItem[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="month" stroke="#71717a" tickLine={false} axisLine={false} />
          <YAxis
            stroke="#71717a"
            tickFormatter={(value) => formatCurrencyBRL(Number(value))}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip currency />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
          <Bar dataKey="total_received" fill="#6366f1" radius={[10, 10, 4, 4]} isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
