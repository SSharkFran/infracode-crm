import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { CustomTooltip } from './CustomTooltip';

interface ProjectStatusDatum {
  name: string;
  value: number;
  color: string;
}

interface ProjectStatusChartProps {
  data: ProjectStatusDatum[];
}

export default function ProjectStatusChart({ data }: ProjectStatusChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={76}
            outerRadius={104}
            paddingAngle={2}
            strokeWidth={0}
            isAnimationActive
          >
            {data.map((item) => (
              <Cell key={item.name} fill={item.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
