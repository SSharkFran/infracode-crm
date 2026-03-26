import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface ProjectStatusChartProps {
  data: Array<{ name: string; value: number; color: string }>;
}

export default function ProjectStatusChart({ data }: ProjectStatusChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
