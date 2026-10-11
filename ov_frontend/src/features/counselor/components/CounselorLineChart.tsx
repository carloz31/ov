import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type ChartDatum = { label: string } & Record<string, string | number>
type ChartSeries = { key: string; label: string; color: string }
export function CounselorLineChart({
  data,
  label,
  series,
  domain,
  lowAreaMax,
  markers = [],
}: {
  data: ChartDatum[]
  label: string
  series: ChartSeries[]
  domain: [number, number]
  lowAreaMax?: number
  markers?: { value: string; label: string }[]
}) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Todavía no hay datos.</p>
  return (
    <div aria-label={label} className="h-64 w-full" role="img">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart accessibilityLayer data={data} margin={{ left: 0, right: 16, top: 18, bottom: 0 }}>
          <CartesianGrid stroke="var(--data-grid)" strokeDasharray="3 3" vertical={false} />
          {lowAreaMax !== undefined && (
            <ReferenceArea fill="var(--muted)" fillOpacity={0.8} y1={domain[0]} y2={lowAreaMax} />
          )}
          {markers.map((marker) => (
            <ReferenceLine
              key={`${marker.value}-${marker.label}`}
              label={{ value: marker.label, fill: 'var(--muted-foreground)', fontSize: 11 }}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              x={marker.value}
            />
          ))}
          <XAxis axisLine={false} dataKey="label" fontSize={11} tickLine={false} />
          <YAxis axisLine={false} domain={domain} fontSize={11} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ borderRadius: 12, borderColor: 'var(--border)', background: 'var(--card)' }}
          />
          {series.length > 1 && (
            <Legend formatter={(value) => <span className="text-foreground">{value}</span>} />
          )}
          {series.map((item) => (
            <Line
              activeDot={{ r: 5 }}
              dataKey={item.key}
              dot={{ r: 3 }}
              key={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={2.5}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
