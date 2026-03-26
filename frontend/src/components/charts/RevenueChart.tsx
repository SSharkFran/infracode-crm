import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCurrencyBRL } from '../../lib/utils';
import type { RevenueByMonthItem } from '../../types';

interface RevenueChartProps {
  data: RevenueByMonthItem[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="month" stroke="#a1a1aa" tickLine={false} axisLine={false} />
          <YAxis
            stroke="#a1a1aa"
            tickFormatter={(value) => formatCurrencyBRL(value).replace('R$', 'R$ ')}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}
            formatter={(value) => formatCurrencyBRL(Number(value))}
          />
          <Bar dataKey="total_received" radius={[12, 12, 4, 4]} fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
