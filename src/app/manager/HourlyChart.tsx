"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { fmtMoney } from "@/lib/format";

interface Props {
  data: { hour: string; revenue: number }[];
}

/** Single-series hourly revenue line: one hue, thin line, recessive grid, tooltip. */
export default function HourlyChart({ data }: Props) {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-slate-400">No sales yet today.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => fmtMoney(v).replace(/\.\d+$/, "")}
          />
          <Tooltip
            formatter={(value) => [fmtMoney(Number(value)), "Revenue"]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#9d174d"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
