import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ActivityPoint } from '../../types';

export function EmergencyActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <section className="chart-card">
      <div className="section-heading">
        <div><span className="eyebrow">Activity</span><h2>Emergency volume</h2></div>
        <span className="chart-card__period">Today</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0F5963" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#0F5963" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E7ECEA" strokeDasharray="4 4" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#7A8588', fontSize: 12 }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#7A8588', fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #DEE5E3', boxShadow: '0 12px 36px rgba(9,61,69,.08)' }} />
            <Area type="monotone" dataKey="emergencies" stroke="#0F5963" strokeWidth={2.2} fill="url(#activityFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
