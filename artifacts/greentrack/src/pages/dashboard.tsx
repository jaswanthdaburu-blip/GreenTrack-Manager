import { Link } from 'wouter';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Leaf, MapPinned, Plus, ShieldAlert, Sprout, TreePine } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGetDashboardStatistics, useGetDashboardTrends } from '@workspace/api-client-react';
import { PageHeading, Panel, PanelTitle, QueryState } from '@/components/ui-kit';

const money = (n?: number) => typeof n === 'number' ? n.toLocaleString() : '—';
export default function DashboardPage() {
  const stats = useGetDashboardStatistics();
  const trends = useGetDashboardTrends();
  const s = stats.data;
  const cards = [
    { label: 'Trees in register', value: money(s?.totalTrees), sub: `${money(s?.livingTrees)} living`, icon: TreePine, color: 'bg-secondary text-primary' },
    { label: 'Survival rate', value: `${s?.survivalRate ?? '—'}%`, sub: 'Across recorded plantings', icon: Leaf, color: 'bg-[#e8eee0] text-[#527343]' },
    { label: 'Need attention', value: money(s?.attentionCount), sub: 'Field follow-up needed', icon: ShieldAlert, color: 'bg-[#f5e8db] text-[#a45c33]' },
    { label: 'Open alerts', value: money(s?.openAlerts), sub: `${money(s?.speciesCount)} species · ${money(s?.locationCount)} sites`, icon: MapPinned, color: 'bg-[#e4ecea] text-[#3b6d64]' },
  ];
  return <div>
    <PageHeading eyebrow="OPERATIONS / OVERVIEW" title="Good morning, field team." description="Here’s the current shape of your plantation network." actions={<><Link href="/reports" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground"><ArrowRight size={15}/>View reports</Link><Link href="/trees/add" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus size={16}/>Add a tree</Link></>}/>
    <QueryState loading={stats.isLoading} error={stats.isError} retry={() => void stats.refetch()}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, sub, icon: Icon, color }) => <Panel key={label} className="p-5">
        <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-3 font-display text-[30px] font-extrabold leading-none">{value}</p></div><div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon size={19}/></div></div><p className="mt-4 text-xs text-muted-foreground">{sub}</p>
      </Panel>)}</div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Panel><PanelTitle title="Planting activity" detail="Plantings recorded over time" action={<span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-primary">TREND</span>}/>
          <div className="h-[260px] p-4 pt-5"><QueryState loading={trends.isLoading} error={trends.isError} empty={!trends.data?.planting?.length} retry={() => void trends.refetch()}><ResponsiveContainer width="100%" height="100%"><AreaChart data={trends.data?.planting ?? []} margin={{ left: -18, right: 8, top: 8 }}><defs><linearGradient id="planted" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(157 32% 31%)" stopOpacity={.22}/><stop offset="100%" stopColor="hsl(157 32% 31%)" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="hsl(37 17% 85%)" vertical={false} strokeDasharray="3 5"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(154 10% 44%)' }}/><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(154 10% 44%)' }}/><Tooltip/><Area type="monotone" dataKey="value" name="Trees" stroke="hsl(157 32% 31%)" strokeWidth={2.5} fill="url(#planted)"/></AreaChart></ResponsiveContainer></QueryState></div>
        </Panel>
        <Panel><PanelTitle title="Tree distribution" detail="By recorded species" action={<Link href="/species" className="text-xs font-semibold text-primary">Species list <ArrowRight className="ml-1 inline" size={13}/></Link>}/>
          <div className="h-[260px] p-4 pt-5"><QueryState loading={trends.isLoading} error={trends.isError} empty={!trends.data?.species?.length} retry={() => void trends.refetch()}><ResponsiveContainer width="100%" height="100%"><BarChart data={trends.data?.species ?? []} layout="vertical" margin={{ left: 0, right: 6 }}><CartesianGrid stroke="hsl(37 17% 85%)" horizontal={false} strokeDasharray="3 5"/><XAxis type="number" hide/><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={94} tick={{ fontSize: 10, fill: 'hsl(154 10% 44%)' }}/><Tooltip/><Bar dataKey="value" name="Trees" fill="hsl(73 46% 54%)" radius={[0,5,5,0]} barSize={13}/></BarChart></ResponsiveContainer></QueryState></div>
        </Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel><PanelTitle title="At a glance" detail="Current operational coverage"/>
          <div className="grid grid-cols-2 gap-4 p-5">{[{name:'Living trees',n:s?.livingTrees,total:s?.totalTrees,icon:TreePine},{name:'Trees to revisit',n:s?.attentionCount,total:s?.totalTrees,icon:ShieldAlert},{name:'Sites monitored',n:s?.locationCount,icon:MapPinned},{name:'Species established',n:s?.speciesCount,icon:Sprout}].map(({name,n,total,icon:Icon})=><div key={name} className="rounded-lg bg-muted/65 p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{name}</span><Icon size={15} className="text-primary"/></div><p className="mt-3 font-mono text-xl font-semibold">{money(n)}</p>{total !== undefined && <div className="mt-2 h-1 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{width:`${total ? Math.min(100,(Number(n)/total)*100) : 0}%`}}/></div>}</div>)}</div>
        </Panel>
        <Panel><PanelTitle title="Recent field signals" detail="A quick route to the work that needs attention"/>
          <div className="divide-y divide-border">{[{title:'Review health observations',detail:'See health checks and risk markers',href:'/ai-health',icon:Leaf},{title:'Plan upcoming maintenance',detail:'Review logged field visits',href:'/maintenance',icon:ArrowUpRight},{title:'Check open alerts',detail:`${s?.openAlerts ?? '—'} open items across your sites`,href:'/alerts',icon:ArrowDownRight}].map(({title,detail,href,icon:Icon})=><Link key={href} href={href} className="flex items-center gap-3 px-5 py-4 transition hover:bg-muted/60"><div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary"><Icon size={16}/></div><div className="flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></div><ArrowRight size={15} className="text-muted-foreground"/></Link>)}</div>
        </Panel>
      </div>
    </QueryState>
  </div>;
}
