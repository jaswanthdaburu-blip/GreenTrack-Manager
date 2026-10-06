import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, AlertTriangle, BarChart3, Bot, ChevronDown, CircleHelp, ClipboardList, Leaf, Map, MapPinned, Menu, Settings, Shield, Sprout, TreePine, Users, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const groups = [
  { label: 'FIELDWORK', links: [
    { href: '/dashboard', label: 'Overview', icon: BarChart3 },
    { href: '/trees', label: 'Tree register', icon: TreePine },
    { href: '/species', label: 'Species', icon: Sprout },
    { href: '/locations', label: 'Locations', icon: MapPinned },
    { href: '/map', label: 'Field map', icon: Map },
    { href: '/maintenance', label: 'Maintenance', icon: ClipboardList },
    { href: '/alerts', label: 'Alerts', icon: AlertTriangle },
  ]},
  { label: 'INTELLIGENCE', links: [
    { href: '/ai-health', label: 'Health checks', icon: Activity },
    { href: '/ai-prediction', label: 'Survival forecast', icon: BarChart3 },
    { href: '/ai-recommendations', label: 'Recommendations', icon: Bot },
    { href: '/ai-insights', label: 'Insights', icon: CircleHelp },
    { href: '/chatbot', label: 'Field assistant', icon: Bot },
  ]},
  { label: 'ORGANIZATION', links: [
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/profile', label: 'My profile', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]},
];
export function AppShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const nav = <nav className="space-y-6 px-3 pb-5">{groups.map((group) => <section key={group.label}>
    <p className="mb-2 px-3 font-mono text-[9px] font-medium tracking-[.2em] text-sidebar-foreground/45">{group.label}</p>
    <div className="space-y-1">{group.links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={close} data-testid={`link-${href.replace('/', '')}`} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${path === href || (href !== '/dashboard' && path.startsWith(`${href}/`)) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}><Icon size={16} strokeWidth={1.8}/>{label}</Link>)}</div>
  </section>)}</nav>;
  return <div className="min-h-[100dvh] bg-background">
    {open && <button onClick={close} aria-label="Close navigation" className="fixed inset-0 z-40 bg-foreground/35 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[76px] items-center gap-3 border-b border-sidebar-border px-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Leaf size={20}/></div>
        <div><p className="font-display text-[18px] font-extrabold tracking-[-.05em]">green<span className="text-sidebar-primary">track</span></p><p className="-mt-0.5 font-mono text-[8px] tracking-[.2em] text-sidebar-foreground/50">FIELD OPERATIONS</p></div>
        <button className="ml-auto lg:hidden" onClick={close} aria-label="Close menu"><X size={18}/></button>
      </div>
      <div className="flex-1 overflow-y-auto pt-6">{nav}</div>
      <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
        <div className="flex items-center gap-2"><Shield size={14} className="text-sidebar-primary"/><p className="text-xs font-semibold">Field workspace</p></div>
        <p className="mt-1.5 pl-[22px] text-[10px] leading-relaxed text-sidebar-foreground/55">Plantation records, kept in one living view.</p>
      </div>
      <Link href="/profile" className="flex items-center gap-3 border-t border-sidebar-border px-5 py-4 hover:bg-sidebar-accent">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary">{(session?.user.email?.[0] ?? 'F').toUpperCase()}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{session?.user.email ?? 'Field staff'}</p><p className="text-[10px] text-sidebar-foreground/50">Organization workspace</p></div><ChevronDown size={14} className="text-sidebar-foreground/50"/>
      </Link>
    </aside>
    <main className="min-h-[100dvh] lg:pl-[252px]">
      <header className="sticky top-0 z-30 flex h-[65px] items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3"><button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-muted lg:hidden" aria-label="Open navigation"><Menu size={20}/></button><div className="hidden h-5 w-px bg-border lg:block"/><p className="font-mono text-[10px] uppercase tracking-[.13em] text-muted-foreground">Field operations <span className="px-1 text-border">/</span> <span className="text-foreground">{groups.flatMap(g => g.links).find(x => path === x.href || (x.href !== '/dashboard' && path.startsWith(`${x.href}/`)) )?.label ?? 'Workspace'}</span></p></div>
        <div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary"/><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Workspace online</span></div><button onClick={() => void signOut()} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-card hover:text-foreground">Sign out</button></div>
      </header>
      <div className="mx-auto max-w-[1480px] p-4 sm:p-7 lg:p-9"><div key={path} className="page-enter">{children}</div></div>
    </main>
  </div>;
}
