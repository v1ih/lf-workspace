"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ACCENT = "#c0613d";
const INK_SOFT = "#4a423c";
const LINE = "#ebe4dc";
const MUTED = "#8a7f77";

type Datum = { label: string; value: number; secondary?: number };

type Format = "hours" | "brl" | "usd" | "count";

function formatValue(value: number, format: Format) {
  switch (format) {
    case "hours":
      return `${Math.round(value * 10) / 10}h`;
    case "brl":
      return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
    case "usd":
      return `US$ ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    default:
      return String(value);
  }
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Short labels for the Y axis: "R$4K", "US$1.5K", "12h" */
function formatAxis(value: number, format: Format) {
  if (format === "brl") return `R$${compact.format(value)}`;
  if (format === "usd") return `US$${compact.format(value)}`;
  return formatValue(value, format);
}

const axisProps = {
  stroke: MUTED,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({ format, names }: { format: Format; names: [string, string?] }) {
  return (
    <Tooltip
      cursor={{ fill: "rgb(192 97 61 / 0.06)" }}
      content={({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
          <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
            <p className="mb-1 font-semibold text-ink">{label}</p>
            {payload.map((p, i) => (
              <p key={i} className="text-ink-soft">
                {names[i] ?? p.name}: <span className="font-semibold text-ink">{formatValue(Number(p.value), format)}</span>
              </p>
            ))}
          </div>
        );
      }}
    />
  );
}

/** Single-series bars; the last bar (current period) is highlighted. */
export function BarsChart({
  data,
  format = "count",
  name = "Value",
  target,
  height = 220,
}: {
  data: Datum[];
  format?: Format;
  name?: string;
  target?: number;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={LINE} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis
            {...axisProps}
            tickFormatter={(v) => formatAxis(v, format)}
            width={48}
            allowDecimals={false}
            // Keep the goal line visible even when the bars are still small
            domain={[0, (dataMax: number) => Math.max(dataMax, target ?? 0)]}
          />
          <ChartTooltip format={format} names={[name]} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? ACCENT : "#e2c4b6"} />
            ))}
          </Bar>
          {target !== undefined && <ReferenceLine y={target} stroke={INK_SOFT} strokeDasharray="4 4" />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal funnel (applications, pipeline). */
export function FunnelChart({ data, height = 220 }: { data: Datum[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="label" {...axisProps} width={84} />
          <ChartTooltip format="count" names={["Count"]} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22} label={{ position: "right", fontSize: 11, fill: INK_SOFT }}>
            {data.map((_, i) => (
              <Cell key={i} fill={ACCENT} fillOpacity={1 - i * (0.7 / Math.max(1, data.length))} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two series over time, e.g. received vs. goal. */
export function TrendChart({
  data,
  format = "count",
  names,
  height = 220,
}: {
  data: Datum[];
  format?: Format;
  names: [string, string];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={LINE} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => formatAxis(v, format)} width={52} />
          <ChartTooltip format={format} names={names} />
          <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: ACCENT }} />
          <Line type="monotone" dataKey="secondary" stroke={MUTED} strokeDasharray="4 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
