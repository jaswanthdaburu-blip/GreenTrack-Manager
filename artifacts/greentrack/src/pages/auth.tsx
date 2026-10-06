import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { Leaf, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui-kit';

export default function AuthPage({ mode = 'login' }: { mode?: 'login'|'register' }) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [message, setMessage] = useState(supabase ? '' : 'Setup required: configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to connect authentication.');
  const [busy, setBusy] = useState(false);
  const register = mode === 'register';
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMessage('');
    if (!supabase) { setMessage('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to continue.'); return; }
    setBusy(true);
    try {
      const result = register
        ? await supabase.auth.signUp({ email, password, options: { data: { organization_name: organization } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) setMessage(result.error.message);
      else if (register && !result.data.session) setMessage('Check your inbox to confirm your email, then return here to sign in.');
      else navigate('/dashboard');
    } catch {
      setMessage('Authentication is temporarily unavailable. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[1fr_.9fr]">
    <div className="relative hidden overflow-hidden bg-sidebar px-12 py-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 leaf-grid opacity-35"/><div className="absolute -right-32 top-1/4 h-[500px] w-[500px] rounded-full border border-sidebar-foreground/10"/><div className="absolute -right-16 top-[31%] h-[370px] w-[370px] rounded-full border border-sidebar-foreground/10"/>
      <div className="relative flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Leaf size={21}/></div><p className="font-display text-xl font-extrabold">green<span className="text-sidebar-primary">track</span></p></div>
      <div className="relative max-w-xl pb-10"><p className="mb-4 font-mono text-[10px] uppercase tracking-[.2em] text-sidebar-primary">THE WORK OF GROWING</p><h1 className="text-5xl font-extrabold leading-[1.08]">Every tree has a story. <span className="text-sidebar-primary">Keep it growing.</span></h1><p className="mt-6 max-w-md text-sm leading-7 text-sidebar-foreground/65">A steady field-operations workspace for the people who plant, tend, and protect living landscapes.</p><div className="mt-9 flex items-center gap-3 border-t border-sidebar-border pt-5"><ShieldCheck size={17} className="text-sidebar-primary"/><p className="text-xs text-sidebar-foreground/65">Clear records. Grounded decisions. Healthier plantations.</p></div></div>
      <p className="relative font-mono text-[9px] tracking-widest text-sidebar-foreground/35">FIELD OPERATIONS PLATFORM · 01 / 04</p>
    </div>
    <div className="flex items-center justify-center px-5 py-12 sm:px-10"><div className="w-full max-w-[410px]">
      <div className="mb-10 flex items-center gap-2 lg:hidden"><Leaf className="text-primary"/><b className="font-display text-lg">green<span className="text-primary">track</span></b></div>
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">{register ? 'YOUR FIELD STARTS HERE' : 'WELCOME BACK'}</p>
      <h2 className="mt-3 text-3xl font-extrabold">{register ? 'Create your workspace' : 'Sign in to GreenTrack'}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{register ? 'Bring your field team and plantation records together.' : 'Pick up where your team left off.'}</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        {register && <label className="block text-sm font-medium">Organization name<input required value={organization} onChange={e => setOrganization(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-card px-3.5 py-3 outline-none focus:ring-2 focus:ring-ring/30"/></label>}
        <label className="block text-sm font-medium">Work email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-card px-3.5 py-3 outline-none focus:ring-2 focus:ring-ring/30"/></label>
        <label className="block text-sm font-medium">Password<input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-card px-3.5 py-3 outline-none focus:ring-2 focus:ring-ring/30"/></label>
        {message && <p role="status" className="rounded-lg border border-primary/20 bg-secondary/50 p-3 text-sm text-foreground">{message}</p>}
        <Button type="submit" disabled={busy} className="w-full py-3">{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">{register ? 'Already have a workspace?' : 'New to GreenTrack?'} <Link className="font-semibold text-primary hover:underline" href={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>
      <p className="mt-10 text-center font-mono text-[9px] leading-5 text-muted-foreground">AUTHENTICATED WITH SUPABASE<br/>Your field records stay within your organization.</p>
    </div></div>
  </div>;
}
