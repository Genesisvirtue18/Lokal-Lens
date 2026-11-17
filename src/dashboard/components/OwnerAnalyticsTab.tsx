import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Eye, MessageSquare, MousePointerClick, Minus } from 'lucide-react';
import { cx } from '@/components/ds';
import { Analytics, AnalyticsDay, loadAnalytics } from '../api';
import { BusinessListing } from '../types';

const METRICS: { id: keyof Omit<AnalyticsDay, 'day'>; label: string; colour: string }[] = [
  { id: 'views', label: 'Profile views', colour: '#002fa7' },
  { id: 'calls', label: 'Calls', colour: '#2b7a26' },
  { id: 'whatsapp', label: 'WhatsApp', colour: '#1a9d58' },
  { id: 'directions', label: 'Directions', colour: '#8a5a00' },
  { id: 'website', label: 'Website clicks', colour: '#7a2842' },
  { id: 'inquiries', label: 'Inquiries', colour: '#101115' },
];
const actionsOf = (day: AnalyticsDay) => day.calls + day.whatsapp + day.directions + day.website;
const short = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const niceMax = (value: number) => { if (value <= 4) return 4; const power = 10 ** Math.floor(Math.log10(value)); const step = [1, 2, 5, 10].find((m) => m * power >= value) || 10; return step * power; };

function Delta({ now, before }: { now: number; before: number }) {
  if (!before && !now) return <span className="inline-flex items-center gap-1 text-[13px] text-[#6e7079]"><Minus size={14} aria-hidden="true" />No change</span>;
  if (!before) return <span className="text-[13px] font-medium text-[#2b7a26]">New this period</span>;
  const change = Math.round(((now - before) / before) * 100);
  if (change === 0) return <span className="inline-flex items-center gap-1 text-[13px] text-[#6e7079]"><Minus size={14} aria-hidden="true" />Same as before</span>;
  const up = change > 0;
  return <span className={cx('inline-flex items-center gap-1 text-[13px] font-medium', up ? 'text-[#2b7a26]' : 'text-[#b42318]')}>{up ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}{Math.abs(change)}% vs previous</span>;
}

function Kpi({ icon: Icon, label, value, now, before }: { icon: React.ComponentType<{ size?: number }>; label: string; value: number; now: number; before: number }) {
  return (
    <div className="flex items-start gap-4 rounded-[16px] border border-[#dcdbd5] bg-white p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#e6ebf7] text-[#002fa7]"><Icon size={20} /></span>
      <div className="min-w-0"><p className="text-[28px] font-semibold leading-8 tracking-[-0.02em]">{value.toLocaleString('en-IN')}</p><p className="text-[14px] leading-5 text-[#4a4c55]">{label}</p><div className="mt-1"><Delta now={now} before={before} /></div></div>
    </div>
  );
}

// Daily bars with a tooltip. Plain SVG, no chart library.
function BarChart({ series, metric, colour }: { series: AnalyticsDay[]; metric: keyof Omit<AnalyticsDay, 'day'>; colour: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720; const H = 240; const L = 36; const R = 8; const T = 12; const B = 28;
  const values = series.map((day) => day[metric]);
  const max = niceMax(Math.max(...values, 1));
  const slot = (W - L - R) / series.length;
  const bar = Math.max(2, Math.min(28, slot * 0.62));
  const y = (value: number) => T + (H - T - B) * (1 - value / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(max * part));
  const labelEvery = Math.ceil(series.length / 8);
  const active = hover !== null ? series[hover] : null;
  return (
    <div className="relative">
      {active && <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-[10px] bg-[#101115] px-3 py-1.5 text-[13px] text-white shadow">{short(active.day)} · <strong>{active[metric]}</strong></div>}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${METRICS.find((m) => m.id === metric)?.label} per day`} onMouseLeave={() => setHover(null)}>
        {ticks.map((tick) => <g key={tick}><line x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} stroke="#ecebe7" /><text x={L - 6} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#6e7079">{tick}</text></g>)}
        {series.map((day, index) => {
          const x = L + slot * index + (slot - bar) / 2;
          const top = y(day[metric]);
          return (
            <g key={day.day} onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)}>
              <rect x={L + slot * index} y={T} width={slot} height={H - T - B} fill="transparent" />
              <rect x={x} y={day[metric] ? top : H - B - 1} width={bar} height={day[metric] ? H - B - top : 1} rx={Math.min(4, bar / 2)} fill={hover === index ? '#101115' : colour} opacity={day[metric] ? 1 : 0.25} />
              {index % labelEvery === 0 && <text x={x + bar / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6e7079">{short(day.day)}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface Props { businesses: BusinessListing[] }

export const OwnerAnalyticsTab: React.FC<Props> = ({ businesses }) => {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [business, setBusiness] = useState('');
  const [metric, setMetric] = useState<keyof Omit<AnalyticsDay, 'day'>>('views');
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError('');
    loadAnalytics(days, business || undefined).then((result) => { if (live) setData(result); }).catch((reason) => { if (live) setError(reason instanceof Error ? reason.message : 'Unable to load analytics.'); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [days, business]);

  const totals = data?.totals; const before = data?.previous;
  const actionsNow = totals ? actionsOf(totals) : 0; const actionsBefore = before ? actionsOf(before) : 0;
  const empty = Boolean(totals) && METRICS.every((item) => (totals?.[item.id] || 0) === 0);
  const current = METRICS.find((item) => item.id === metric) || METRICS[0];
  const breakdown = useMemo(() => METRICS.filter((item) => item.id !== 'views').map((item) => ({ ...item, value: totals?.[item.id] || 0 })), [totals]);
  const breakdownMax = Math.max(1, ...breakdown.map((item) => item.value));
  const hasLive = businesses.some((item) => item.status === 'Active');

  return (
    <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Analytics</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">How customers find you</h1></div>
        <div className="flex flex-wrap items-center gap-3">
          {businesses.length > 1 && <select aria-label="Listing" value={business} onChange={(event) => setBusiness(event.target.value)} className="h-11 rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px]"><option value="">All listings</option>{businesses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
          <div className="flex gap-1 rounded-[12px] border border-[#dcdbd5] bg-white p-1" role="group" aria-label="Time range">{([7, 30, 90] as const).map((value) => <button key={value} type="button" onClick={() => setDays(value)} aria-pressed={days === value} className={cx('h-9 rounded-[8px] px-3.5 font-display text-[13px] font-medium', days === value ? 'bg-[#002fa7] text-white' : 'hover:bg-[#f1f1ee]')}>Last {value} days</button>)}</div>
        </div>
      </div>

      {error && <p role="alert" className="rounded-[10px] bg-[#fce9e7] px-4 py-3 text-[14px] text-[#b42318]">{error}</p>}
      {!hasLive && <p className="rounded-[12px] bg-[#fbf0d9] px-4 py-3 text-[14px] leading-5 text-[#8a5a00]">Your listing isn’t live yet, so nothing is counted. Views and clicks start as soon as it’s approved.</p>}

      <section className="grid gap-4 md:grid-cols-3" aria-label="Totals">
        <Kpi icon={Eye} label="Profile views" value={totals?.views || 0} now={totals?.views || 0} before={before?.views || 0} />
        <Kpi icon={MousePointerClick} label="Customer actions (calls, WhatsApp, directions, website)" value={actionsNow} now={actionsNow} before={actionsBefore} />
        <Kpi icon={MessageSquare} label="Inquiries" value={totals?.inquiries || 0} now={totals?.inquiries || 0} before={before?.inquiries || 0} />
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-5 sm:p-6" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">{current.label} per day</h2>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Metric">{METRICS.map((item) => <button key={item.id} type="button" onClick={() => setMetric(item.id)} aria-pressed={metric === item.id} className={cx('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium', metric === item.id ? 'border-[#101115] bg-[#101115] text-white' : 'border-[#dcdbd5] hover:border-[#101115]')}><span className="h-2 w-2 rounded-full" style={{ background: item.colour }} aria-hidden="true" />{item.label}</button>)}</div>
        </div>
        {loading && !data ? <div className="h-[240px] animate-pulse rounded-[12px] bg-[#f1f1ee]" /> : empty ? (
          <div className="grid h-[240px] place-items-center rounded-[12px] bg-[#f7f7f4] px-6 text-center text-[14px] leading-5 text-[#4a4c55]">No activity in the last {days} days yet.<br />Views, calls and clicks from your live profile will appear here.</div>
        ) : data ? <BarChart series={data.series} metric={metric} colour={current.colour} /> : null}
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-[#dcdbd5] bg-white p-5 sm:p-6">
        <h2 className="text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">What customers did</h2>
        <ul className="flex flex-col gap-3">{breakdown.map((item) => <li key={item.id} className="grid grid-cols-[120px_1fr_48px] items-center gap-3 text-[14px]"><span>{item.label}</span><span className="h-2.5 overflow-hidden rounded-full bg-[#ecebe7]"><span className="block h-full rounded-full" style={{ width: `${(item.value / breakdownMax) * 100}%`, background: item.colour }} /></span><span className="text-right font-semibold">{item.value}</span></li>)}</ul>
        <p className="text-[13px] leading-[18px] text-[#6e7079]">Counts are anonymous — we never store who clicked. Calls and WhatsApp are taps on your buttons, so they show interest, not completed calls.</p>
      </section>
    </main>
  );
};
