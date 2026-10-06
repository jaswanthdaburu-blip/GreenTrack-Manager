import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Camera, Edit3, FilePlus2, Leaf, MapPin, Search, Trash2 } from 'lucide-react';
import { getGetDashboardStatisticsQueryKey, getGetDashboardTrendsQueryKey, getGetTreeQueryKey, getListLocationsQueryKey, getListSpeciesQueryKey, getListTreesQueryKey, useCreateTree, useDeleteTree, useGetTree, useListLocations, useListMaintenance, useListSpecies, useListTrees, useUpdateTree } from '@workspace/api-client-react';
import type { Tree } from '@workspace/api-client-react';
import { Button, Field, PageHeading, Panel, PanelTitle, QueryState } from '@/components/ui-kit';
import { supabase } from '@/lib/supabase';
import { TreeImage } from '@/components/tree-image';
import { useAuth } from '@/lib/auth';

const statusTone = (s?: string) => s === 'Alive' ? 'bg-[#e8efe2] text-[#456b3b]' : s === 'Dead' ? 'bg-[#f4e2df] text-[#a8493f]' : 'bg-[#f5eadc] text-[#a46531]';
export function TreesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [health, setHealth] = useState('');
  const [speciesId,setSpeciesId]=useState('');
  const [locationId,setLocationId]=useState('');
  const speciesQuery=useListSpecies();
  const locationsQuery=useListLocations();
  const params = useMemo(() => ({ ...(search ? { search } : {}), ...(status ? { status: status as 'Alive'|'Dead'|'Needs Attention' } : {}), ...(health ? { health: health as 'Healthy'|'Moderate'|'Poor'|'Critical'|'Unknown' } : {}), ...(speciesId?{speciesId}:{}), ...(locationId?{locationId}:{}) }), [search,status,health,speciesId,locationId]);
  const query = useListTrees(params);
  const trees = query.data ?? [];
  return <div><PageHeading eyebrow="FIELDWORK / REGISTER" title="Tree register" description="Every planted tree, its place, and the care it has received." actions={<Link href="/trees/add" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><FilePlus2 size={16}/>Register a tree</Link>}/>
    <Panel className="mb-5 p-3"><div className="flex flex-col gap-2 md:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tree code, species or location…" data-testid="input-tree-search" className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"/></div><select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter by status" className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="">All statuses</option><option>Alive</option><option>Needs Attention</option><option>Dead</option></select><select value={health} onChange={e=>setHealth(e.target.value)} aria-label="Filter by health" className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="">All health</option>{['Healthy','Moderate','Poor','Critical','Unknown'].map(v=><option key={v}>{v}</option>)}</select><select value={speciesId} onChange={e=>setSpeciesId(e.target.value)} aria-label="Filter by species" className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="">All species</option>{(speciesQuery.data??[]).map(x=><option value={x.id} key={x.id}>{x.commonName}</option>)}</select><select value={locationId} onChange={e=>setLocationId(e.target.value)} aria-label="Filter by location" className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="">All locations</option>{(locationsQuery.data??[]).map(x=><option value={x.id} key={x.id}>{x.label}</option>)}</select><div className="flex items-center px-2 font-mono text-[10px] text-muted-foreground">{query.data?.length ?? '—'} RECORDS</div></div></Panel>
     <QueryState loading={query.isLoading} error={query.isError} empty={!query.isLoading && !query.isError && trees.length === 0} retry={()=>void query.refetch()}>
       <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-muted/60"><tr className="text-[10px] uppercase tracking-wider text-muted-foreground">{['Tree / species','Location','Planted','Condition','Risk',''].map(h=><th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{trees.map((tree: Tree)=><tr key={tree.id} className="transition hover:bg-muted/40" data-testid={`row-tree-${tree.id}`}><td className="px-5 py-4"><Link href={`/trees/${tree.id}`} className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary text-primary">{tree.imageUrl ? <TreeImage path={tree.imageUrl} alt="" className="h-full w-full object-cover"/> : <Leaf size={17}/>}</span><span><b className="block font-mono text-xs">{tree.treeCode}</b><span className="text-xs text-muted-foreground">{tree.commonName || tree.speciesName}</span></span></Link></td><td className="px-5 py-4"><p className="text-xs font-medium">{tree.locationLabel}</p><p className="mt-1 text-[10px] text-muted-foreground">{[tree.area,tree.city].filter(Boolean).join(', ')}</p></td><td className="px-5 py-4 font-mono text-xs">{tree.plantingDate?.slice(0,10) || '—'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(tree.status)}`}>{tree.healthCondition || tree.status}</span></td><td className="px-5 py-4 text-xs">{tree.riskLevel ? <span className={tree.riskLevel === 'High' || tree.riskLevel === 'Critical' ? 'font-semibold text-destructive' : 'text-muted-foreground'}>{tree.riskLevel}</span> : '—'}</td><td className="px-5 py-4"><Link href={`/trees/${tree.id}`} className="inline-flex rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-primary"><ArrowRight size={15}/></Link></td></tr>)}</tbody></table></div><div className="border-t border-border px-5 py-3 text-[10px] text-muted-foreground">Tree information is drawn from your organization’s field register.</div></Panel>
    </QueryState>
  </div>;
}

export function TreeFormPage({ editing = false }: { editing?: boolean }) {
  const params = useParams<{ treeId: string }>();
  const id = params.treeId || '';
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const treeQuery = useGetTree(id, { query: { enabled: editing && !!id, queryKey: getGetTreeQueryKey(id) } });
  const speciesQuery = useListSpecies();
  const locationsQuery = useListLocations();
  const create = useCreateTree();
  const update = useUpdateTree();
  const [code,setCode]=useState(''); const [speciesId,setSpeciesId]=useState(''); const [locationId,setLocationId]=useState('');
  const [date,setDate]=useState(new Date().toISOString().slice(0,10)); const [status,setStatus]=useState<'Alive'|'Dead'|'Needs Attention'>('Alive'); const [health,setHealth]=useState<'Healthy'|'Moderate'|'Poor'|'Critical'|'Unknown'>('Healthy'); const [notes,setNotes]=useState(''); const [lat,setLat]=useState(''); const [lng,setLng]=useState(''); const [imageUrl,setImageUrl]=useState(''); const [uploading,setUploading]=useState(false); const [uploadError,setUploadError]=useState('');
  const tree=treeQuery.data;
  const [initialized,setInitialized]=useState(false);
  useEffect(()=>{if(editing&&tree&&!initialized){setCode(tree.treeCode);setSpeciesId(tree.speciesId);setLocationId(tree.locationId);setDate(tree.plantingDate?.slice(0,10));setStatus(tree.status);setHealth(tree.healthCondition);setNotes(tree.notes??'');setLat(tree.latitude==null?'':String(tree.latitude));setLng(tree.longitude==null?'':String(tree.longitude));setImageUrl(tree.imageUrl??'');setInitialized(true);}},[editing,tree,initialized]);
  const upload = async (file?: File) => {
    setUploadError(''); if (!file) return;
     if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setUploadError('Choose a JPG, PNG, or WebP image.'); return; }
     if (file.size > 5 * 1024 * 1024) { setUploadError('The image must be 5 MB or smaller.'); return; }
    if (!supabase) { setUploadError('Image storage requires Supabase configuration.'); return; }
    setUploading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setUploadError('Sign in again before uploading an image.'); setUploading(false); return; }
     const { data: profile, error: profileError } = await supabase.from('profiles').select('organization_id').eq('id', auth.user.id).maybeSingle();
     if (profileError || !profile?.organization_id) { setUploadError('Your organization profile could not be loaded.'); setUploading(false); return; }
     const path = `${profile.organization_id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const { error } = await supabase.storage.from('tree-images').upload(path,file,{upsert:false});
    if (error) setUploadError(error.message);
     else setImageUrl(path);
    setUploading(false);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const data = { treeCode:code, speciesId, locationId, plantingDate:date, status, healthCondition:health, latitude:lat ? Number(lat):null, longitude:lng ? Number(lng):null, imageUrl:imageUrl || null, notes:notes || null };
    const done = () => { void qc.invalidateQueries({queryKey:getListTreesQueryKey()}); void qc.invalidateQueries({queryKey:getGetTreeQueryKey(id)}); void qc.invalidateQueries({queryKey:getGetDashboardStatisticsQueryKey()}); void qc.invalidateQueries({queryKey:getGetDashboardTrendsQueryKey()}); void qc.invalidateQueries({queryKey:getListSpeciesQueryKey()}); void qc.invalidateQueries({queryKey:getListLocationsQueryKey()}); navigate(editing ? `/trees/${id}` : '/trees'); };
    if (editing) update.mutate({treeId:id,data}, {onSuccess:done});
    else create.mutate({data}, {onSuccess:done});
  };
  const busy=create.isPending||update.isPending;
  return <div className="mx-auto max-w-3xl"><Link href={editing?`/trees/${id}`:'/trees'} className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={14}/>Back to tree register</Link>
    <PageHeading eyebrow={editing?'TREE RECORD / EDIT':'FIELDWORK / NEW RECORD'} title={editing?'Edit tree record':'Register a tree'} description="Capture the essential field details. You can add observations as care continues."/>
    {editing && treeQuery.isLoading ? <div className="h-72 animate-pulse rounded-xl bg-card"/> : editing && treeQuery.isError ? <p className="rounded-xl bg-destructive/5 p-8 text-center">Tree details could not be loaded. <button onClick={()=>void treeQuery.refetch()} className="text-primary underline">Try again</button></p> : <Panel><form onSubmit={submit} className="space-y-6 p-5 sm:p-7">
      <div><p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-primary">IDENTITY & PLACEMENT</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Tree code" required value={code} onChange={setCode} placeholder="e.g. GT-0248"/><Field label="Planting date" type="date" required value={date} onChange={setDate}/><Field label="Species" required as="select" value={speciesId} onChange={setSpeciesId} options={(speciesQuery.data??[]).map(s=>({value:s.id,label:`${s.commonName} · ${s.speciesName}`}))}/><Field label="Location" required as="select" value={locationId} onChange={setLocationId} options={(locationsQuery.data??[]).map(l=>({value:l.id,label:l.label}))}/><Field label="Latitude" value={lat} onChange={setLat} type="number" placeholder="Optional coordinates"/><Field label="Longitude" value={lng} onChange={setLng} type="number" placeholder="Optional coordinates"/></div></div>
       <div><p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-primary">FIELD CONDITION</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Tree status" as="select" value={status} onChange={value=>setStatus(value as typeof status)} options={['Alive','Needs Attention','Dead'].map(value=>({value,label:value}))}/><Field label="Health condition" as="select" value={health} onChange={value=>setHealth(value as typeof health)} options={['Healthy','Moderate','Poor','Critical','Unknown'].map(value=>({value,label:value}))}/><div className="sm:col-span-2"><Field label="Field notes" value={notes} onChange={setNotes} as="textarea" placeholder="Record observations useful to the next field visit."/></div></div></div>
       <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4"><div className="flex flex-wrap items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold"><Camera size={15}/> {uploading?'Uploading…':'Add tree photo'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{void upload(e.target.files?.[0]);e.currentTarget.value='';}}/></label>{imageUrl && <span className="text-xs text-primary">Photo ready</span>}<span className="text-xs text-muted-foreground">Private storage · JPG, PNG, or WebP · up to 5 MB.</span></div>{uploadError&&<p className="mt-2 text-xs text-destructive">{uploadError}</p>}</div>
      <div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="outline" onClick={()=>navigate(editing?`/trees/${id}`:'/trees')}>Cancel</Button><Button type="submit" disabled={busy||uploading}>{busy?'Saving…':editing?'Save changes':'Register tree'}</Button></div>
    </form></Panel>}
  </div>;
}

export function TreeDetailPage() {
  const params = useParams<{treeId:string}>();const id=params.treeId??'';const [,navigate]=useLocation();const qc=useQueryClient();
  const {profile}=useAuth();
  const query=useGetTree(id,{query:{queryKey:getGetTreeQueryKey(id)}});const maintenance=useListMaintenance({treeId:id});
  const remove=useDeleteTree();
  const tree=query.data;
  const deleteIt=()=>{if(window.confirm(`Remove ${tree?.treeCode ?? 'this tree'} from the register? This cannot be undone.`)) remove.mutate({treeId:id},{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListTreesQueryKey()});void qc.invalidateQueries({queryKey:getGetDashboardStatisticsQueryKey()});void qc.invalidateQueries({queryKey:getGetDashboardTrendsQueryKey()});void qc.invalidateQueries({queryKey:getListSpeciesQueryKey()});void qc.invalidateQueries({queryKey:getListLocationsQueryKey()});navigate('/trees');}});};
  if(query.isLoading) return <div className="h-64 animate-pulse rounded-xl bg-card"/>;
  if(query.isError||!tree) return <QueryState error retry={()=>void query.refetch()}/>;
  return <div><Link href="/trees" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={14}/>Tree register</Link>
     <PageHeading eyebrow={`FIELD RECORD / ${tree.treeCode}`} title={tree.commonName||tree.speciesName} description={`${tree.scientificName ?? ''} · Planted ${tree.plantingDate?.slice(0,10)}`} actions={<><Link href={`/trees/${id}/edit`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold"><Edit3 size={15}/>Edit record</Link>{profile?.role==='ADMIN'&&<Button variant="danger" onClick={deleteIt} disabled={remove.isPending}><Trash2 size={15}/>Delete</Button>}</>}/>
     <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><Panel className="overflow-hidden"><div className="relative flex h-48 items-end bg-[#dce6d8] p-6"><div className="absolute inset-0 leaf-grid opacity-70"/>{tree.imageUrl&&<TreeImage path={tree.imageUrl} alt={tree.commonName} className="absolute inset-0 h-full w-full object-cover"/>}<span className="relative rounded-full bg-card/90 px-3 py-1.5 text-xs font-semibold">{tree.status}</span></div><div className="grid grid-cols-2 gap-y-6 p-6">{[['Health condition',tree.healthCondition],['Risk level',tree.riskLevel||'Not assessed'],['Site',tree.locationLabel],['Area', [tree.area,tree.city].filter(Boolean).join(', ')||'—'],['Survival estimate',tree.survivalProbability==null?'Not available':`${Math.round(tree.survivalProbability*100)}%`],['Last maintained',tree.lastMaintainedAt?.slice(0,10)||'No visit logged']].map(([label,value])=><div key={label}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1.5 text-sm font-semibold">{value}</p></div>)}<div className="col-span-2 border-t border-border pt-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Field notes</p><p className="mt-2 text-sm leading-relaxed">{tree.notes||'No field notes have been added.'}</p></div></div></Panel>
      <Panel><PanelTitle title="Care history" detail="Maintenance entries for this tree" action={<Link href="/maintenance" className="text-xs font-semibold text-primary">Log visit <ArrowRight className="ml-1 inline" size={13}/></Link>}/><div className="p-5"><QueryState loading={maintenance.isLoading} error={maintenance.isError} empty={!maintenance.data?.length} retry={()=>void maintenance.refetch()}><div className="space-y-4">{maintenance.data?.map(item=><div key={item.id} className="relative border-l border-border pl-5 pb-1"><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary ring-4 ring-card"/><p className="text-sm font-semibold">{item.maintenanceType}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{item.maintenanceDate?.slice(0,10)} {item.staffName?`· ${item.staffName}`:''}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.description||item.notes||'Field visit recorded.'}</p></div>)}</div></QueryState></div></Panel>
    </div>
    <Panel className="mt-5 p-5"><div className="flex items-start gap-3"><MapPin size={17} className="mt-0.5 text-primary"/><div><p className="text-sm font-semibold">Recorded coordinates</p><p className="mt-1 font-mono text-xs text-muted-foreground">{tree.latitude ?? '—'}° , {tree.longitude ?? '—'}°</p><Link href="/map" className="mt-3 inline-flex text-xs font-semibold text-primary">Open field map <ArrowRight className="ml-1" size={13}/></Link></div></div></Panel>
  </div>;
}
