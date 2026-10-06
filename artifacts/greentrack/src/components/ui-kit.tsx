import { type ReactNode } from 'react';
import { AlertCircle, LoaderCircle, Search } from 'lucide-react';

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>{eyebrow && <p className="mb-2 font-mono text-[10px] uppercase tracking-[.18em] text-primary">{eyebrow}</p>}
      <h1 className="text-[30px] font-bold leading-tight text-foreground sm:text-[36px]">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
    </div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}
export function Button({ children, onClick, variant = 'primary', type = 'button', disabled, className = '' }: { children: ReactNode; onClick?: () => void; variant?: 'primary'|'outline'|'danger'|'quiet'; type?: 'button'|'submit'; disabled?: boolean; className?: string }) {
  const styles = { primary: 'bg-primary text-primary-foreground hover:brightness-110', outline: 'border border-border bg-card text-foreground hover:bg-muted', danger: 'bg-destructive text-destructive-foreground', quiet: 'text-muted-foreground hover:bg-muted hover:text-foreground' };
  return <button data-testid="button-action" type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}
export function Panel({ children, className = '', ...props }: { children: ReactNode; className?: string; 'data-testid'?: string }) { return <section {...props} className={`rounded-xl border border-border bg-card shadow-[0_2px_10px_hsl(35_20%_30%/.035)] ${className}`}>{children}</section>; }
export function PanelTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-display text-base font-bold">{title}</h2>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>{action}</div>;
}
export function LoadingState({ label = 'Loading your workspace' }: { label?: string }) {
  return <div className="grid gap-3" aria-label={label}>{[0,1,2].map((x) => <div key={x} className="h-16 animate-pulse rounded-xl border border-border bg-card/70" />)}</div>;
}
export function QueryState({ loading, error, empty, retry, children }: { loading?: boolean; error?: boolean; empty?: boolean; retry?: () => void; children?: ReactNode }) {
  if (loading) return <LoadingState />;
  if (error) return <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-8 text-center"><AlertCircle className="mx-auto mb-3 h-6 w-6 text-destructive" /><p className="font-semibold">We couldn’t load this information</p><p className="mt-1 text-sm text-muted-foreground">Check your connection, then try again.</p><Button className="mt-4" onClick={retry}>Try again</Button></div>;
  if (empty) return <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center"><div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary"><Search size={18}/></div><p className="font-semibold">Nothing to show yet</p><p className="mt-1 text-sm text-muted-foreground">Records will appear here as your team adds them.</p></div>;
  return <>{children}</>;
}
export function SkeletonLine() { return <LoaderCircle className="h-4 w-4 animate-spin text-primary" />; }
export function Field({ label, value, onChange, type = 'text', required = false, placeholder, as = 'input', options }: { label: string; value?: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string; as?: 'input'|'textarea'|'select'; options?: { value: string; label: string }[] }) {
  const common = { value: value ?? '', required, placeholder, onChange: (e: { target: { value: string } }) => onChange(e.target.value), className: 'mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring/30' };
  return <label className="block text-sm font-medium text-foreground">{label}{as === 'textarea' ? <textarea {...common} rows={3} /> : as === 'select' ? <select {...common}>{options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <input {...common} type={type} />}</label>;
}
