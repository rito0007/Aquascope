import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowDownToLine, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown,
  CircleHelp, Database, Download, FileSpreadsheet, Fish, FlaskConical, LayoutDashboard,
  Map, MapPin, Menu, Microscope, Moon, MoreHorizontal, Plus, Search, Settings2,
  ShieldCheck, SlidersHorizontal, Sparkles, Sun, Waves, X, Trash2, Upload, Eye,
  FileText, CircleCheck, CircleX, Filter, RotateCcw, ExternalLink
} from 'lucide-react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import Papa from 'papaparse'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler)

const initialSamples = [
  { id:'AQ-024', site:'North inlet', water:'Freshwater lake', taxon:'Rohu', signal:86, status:'Detected', date:'2026-10-24', lat:22.58, lng:88.42, notes:'Illustrative record' },
  { id:'AQ-023', site:'Reed bank', water:'Wetland', taxon:'Catla', signal:64, status:'Detected', date:'2026-10-23', lat:22.55, lng:88.39, notes:'Illustrative record' },
  { id:'AQ-022', site:'Eastern channel', water:'River channel', taxon:'Mrigal', signal:42, status:'Detected', date:'2026-10-22', lat:22.61, lng:88.46, notes:'Illustrative record' },
  { id:'AQ-021', site:'South basin', water:'Freshwater lake', taxon:'Not assigned', signal:0, status:'Not detected', date:'2026-10-21', lat:22.52, lng:88.43, notes:'Illustrative record' },
  { id:'AQ-020', site:'Willow point', water:'Wetland', taxon:'Tilapia', signal:58, status:'Detected', date:'2026-10-20', lat:22.57, lng:88.49, notes:'Illustrative record' },
  { id:'AQ-019', site:'West shore', water:'Reservoir', taxon:'Rohu', signal:72, status:'Detected', date:'2026-10-19', lat:22.54, lng:88.35, notes:'Illustrative record' },
  { id:'AQ-018', site:'Upper pool', water:'Pond', taxon:'Catla', signal:35, status:'Detected', date:'2026-10-18', lat:22.60, lng:88.37, notes:'Illustrative record' },
  { id:'AQ-017', site:'Marsh edge', water:'Wetland', taxon:'Not assigned', signal:0, status:'Not detected', date:'2026-10-17', lat:22.50, lng:88.46, notes:'Illustrative record' },
]
const navItems = [
  { id:'overview', label:'Overview', icon:LayoutDashboard },
  { id:'samples', label:'Sample register', icon:Database },
  { id:'distribution', label:'Distribution map', icon:Map },
  { id:'analysis', label:'Molecular analysis', icon:Microscope },
]
const colors = ['#16877c','#49a99a','#85cbb9','#b6dfd5','#d9ebe6','#6d9fbd','#c2a6d9']
const defaultForm = { id:'', site:'', water:'Freshwater lake', taxon:'', signal:'', date:'2026-10-28', lat:'', lng:'', notes:'' }
const numberFmt = n => new Intl.NumberFormat('en-IN').format(n)
const chartFont = { family:'DM Sans, sans-serif' }
const commonOptions = {
  responsive:true, maintainAspectRatio:false,
  plugins:{legend:{display:false},tooltip:{backgroundColor:'#123e3c',padding:10,titleFont:chartFont,bodyFont:chartFont}},
  scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#829793',font:{size:10,family:chartFont.family}}},y:{beginAtZero:true,grid:{color:'#edf2f1'},border:{display:false},ticks:{color:'#829793',font:{size:10,family:chartFont.family},maxTicksLimit:5}}}
}
const lineOptions = {...commonOptions,scales:{...commonOptions.scales,y:{...commonOptions.scales.y,suggestedMax:100}}}
const barOptions = {...commonOptions,scales:{...commonOptions.scales,y:{...commonOptions.scales.y,suggestedMax:100}}}
const donutOptions = {responsive:true,maintainAspectRatio:false,cutout:'74%',plugins:{legend:{display:false},tooltip:{backgroundColor:'#123e3c',padding:10}}}

function safeReadSamples() {
  try {
    const stored = localStorage.getItem('aquascope-v2-samples')
    return stored ? JSON.parse(stored) : initialSamples
  } catch { return initialSamples }
}
function csvCell(value) { return `"${String(value ?? '').replaceAll('"','""')}"` }

export default function App() {
  const [page,setPage] = useState('overview')
  const [samples,setSamples] = useState(safeReadSamples)
  const [query,setQuery] = useState('')
  const [statusFilter,setStatusFilter] = useState('All statuses')
  const [waterFilter,setWaterFilter] = useState('All water bodies')
  const [sortBy,setSortBy] = useState('date-desc')
  const [modal,setModal] = useState(false)
  const [detail,setDetail] = useState(null)
  const [mobileNav,setMobileNav] = useState(false)
  const [dark,setDark] = useState(false)
  const [toast,setToast] = useState('')
  const [form,setForm] = useState(defaultForm)
  const [formError,setFormError] = useState('')
  const [mapStatus,setMapStatus] = useState('All statuses')
  const fileRef = useRef(null)

  useEffect(() => { localStorage.setItem('aquascope-v2-samples', JSON.stringify(samples)) },[samples])
  useEffect(() => { if (!toast) return; const t=setTimeout(()=>setToast(''),3000); return ()=>clearTimeout(t) },[toast])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return samples.filter(s => [s.id,s.site,s.water,s.taxon,s.notes].some(v=>String(v??'').toLowerCase().includes(q)))
      .filter(s => statusFilter==='All statuses' || s.status===statusFilter)
      .filter(s => waterFilter==='All water bodies' || s.water===waterFilter)
      .sort((a,b) => sortBy==='date-asc' ? a.date.localeCompare(b.date) : sortBy==='signal-desc' ? Number(b.signal)-Number(a.signal) : a.date.localeCompare(b.date)*-1)
  },[samples,query,statusFilter,waterFilter,sortBy])

  const taxonStats = useMemo(() => {
    const counts = {}
    samples.filter(s=>s.status==='Detected' && s.taxon && s.taxon!=='Not assigned').forEach(s=>counts[s.taxon]=(counts[s.taxon]||0)+1)
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])
  },[samples])
  const detected = samples.filter(s=>s.status==='Detected').length
  const uniqueSites = new Set(samples.map(s=>s.site.trim()).filter(Boolean)).size
  const uniqueTaxa = new Set(samples.filter(s=>s.taxon && s.taxon!=='Not assigned').map(s=>s.taxon)).size
  const detectionRate = samples.length ? Math.round(detected/samples.length*100) : 0

  const showPage = id => { setPage(id); setMobileNav(false); setDetail(null) }
  const saveSample = e => {
    e.preventDefault(); setFormError('')
    const id = form.id.trim()
    if (!id || !form.site.trim()) { setFormError('Sample ID and sampling site are required.'); return }
    if (samples.some(s=>s.id.toLowerCase()===id.toLowerCase())) { setFormError('That sample ID already exists. Please use a unique ID.'); return }
    const signal = Number(form.signal || 0)
    if (signal < 0 || signal > 100) { setFormError('The demo signal index must be between 0 and 100.'); return }
    const lat = form.lat === '' ? 22.57 : Number(form.lat)
    const lng = form.lng === '' ? 88.42 : Number(form.lng)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) { setFormError('Enter valid latitude (−90 to 90) and longitude (−180 to 180).'); return }
    const item = {...form,id,site:form.site.trim(),taxon:form.taxon.trim()||'Not assigned',signal,status:signal>0?'Detected':'Not detected',lat,lng,notes:form.notes.trim()||'No notes'}
    setSamples(prev=>[item,...prev]); setModal(false); setForm(defaultForm); setToast('Sample record saved')
  }
  const deleteSample = id => {
    if (!window.confirm(`Delete sample ${id}? This cannot be undone.`)) return
    setSamples(prev=>prev.filter(s=>s.id!==id)); setDetail(null); setToast(`Sample ${id} deleted`)
  }
  const exportCsv = rows => {
    const headers=['Sample ID','Site','Water body','Taxon','Signal index (demo)','Status','Date','Latitude','Longitude','Notes']
    const data=rows.map(s=>[s.id,s.site,s.water,s.taxon,s.signal,s.status,s.date,s.lat,s.lng,s.notes])
    const csv=[headers,...data].map(row=>row.map(csvCell).join(',')).join('\r\n')
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}))
    const a=document.createElement('a'); a.href=url; a.download='aquascope-sample-register.csv'; a.click(); URL.revokeObjectURL(url)
    setToast(`Exported ${rows.length} record${rows.length===1?'':'s'} to CSV`)
  }
  const importCsv = e => {
    const file=e.target.files?.[0]; if(!file) return
    Papa.parse(file,{header:true,skipEmptyLines:true,complete:result=>{
      const normalized=result.data.map((r,i)=>{
        const id=String(r['Sample ID']??r.id??'').trim()
        const site=String(r.Site??r.site??'').trim()
        if(!id||!site) return null
        const rawSignal=Number(r['Signal index (demo)']??r.signal??0)
        const signal=Number.isFinite(rawSignal)?Math.max(0,Math.min(100,rawSignal)):0
        const lat=Number(r.Latitude??r.lat??22.57), lng=Number(r.Longitude??r.lng??88.42)
        return {id,site,water:String(r['Water body']??r.water??'Freshwater lake'),taxon:String(r.Taxon??r.taxon??'Not assigned'),signal,status:String(r.Status??'')==='Not detected'||signal===0?'Not detected':'Detected',date:String(r.Date??r.date??'2026-10-28'),lat:Number.isFinite(lat)&&lat>=-90&&lat<=90?lat:22.57,lng:Number.isFinite(lng)&&lng>=-180&&lng<=180?lng:88.42,notes:String(r.Notes??r.notes??'Imported CSV record')}
      }).filter(Boolean)
      const existing=new Set(samples.map(s=>s.id.toLowerCase()))
      const fresh=normalized.filter(s=>!existing.has(s.id.toLowerCase()))
      setSamples(prev=>[...fresh,...prev]); setToast(`Imported ${fresh.length} new record${fresh.length===1?'':'s'}${normalized.length!==fresh.length?`; skipped ${normalized.length-fresh.length} duplicate(s)`:''}`)
      e.target.value=''
    },error:()=>setToast('Could not read that CSV file')})
  }

  return <div className={`app-shell ${dark?'dark-mode':''}`}>
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark"><Waves size={23}/></div><div><div className="brand-name">AquaScope</div><div className="brand-subtitle">MOLECULAR ECOLOGY</div></div><button className="icon-button mobile-close" onClick={()=>setMobileNav(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list">{navItems.map(item=>{const Icon=item.icon;return <button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>showPage(item.id)}><Icon size={18}/><span>{item.label}</span>{item.id==='samples'&&<span className="nav-count">{samples.length}</span>}</button>})}</nav>
      <div className="sidebar-divider"/>
      <div className="workspace-label">CURRENT PROJECT</div>
      <div className="project-card"><div className="project-icon"><Waves size={17}/></div><div className="project-info"><strong>Freshwater study</strong><span>Research workspace</span></div><ChevronDown size={15} className="muted-icon"/></div>
      <div className="sidebar-note"><ShieldCheck size={15}/><span>Prototype data stays in this browser.</span></div>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><div><strong>Research responsibly</strong><span>Demo values are not validated</span></div></div><div className="profile-row"><div className="avatar">AS</div><div className="profile-copy"><strong>Researcher</strong><span>Local workspace</span></div><MoreHorizontal size={18} className="muted-icon"/></div></div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" aria-label="Close navigation overlay" onClick={()=>setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open navigation"><Menu size={20}/></button><div className="breadcrumb">Research workspace <span>/</span> <strong>{navItems.find(n=>n.id===page)?.label}</strong></div></div>
        <div className="topbar-actions"><div className="demo-pill"><span className="pulse-dot"/> Demo environment</div><button className="icon-button" onClick={()=>{setDark(v=>!v);setToast(dark?'Light theme enabled':'Dark theme enabled')}} aria-label="Toggle color theme">{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button className="icon-button notification-button" onClick={()=>setToast('No new notifications')} aria-label="Notifications"><Bell size={18}/></button><div className="top-avatar">AS</div></div>
      </header>
      <div className="page-content">
        {page==='overview'&&<Overview samples={samples} detected={detected} uniqueSites={uniqueSites} uniqueTaxa={uniqueTaxa} detectionRate={detectionRate} taxonStats={taxonStats} onAdd={()=>{setForm(defaultForm);setModal(true)}} onNavigate={showPage} onDetails={setDetail}/>}
        {page==='samples'&&<SamplesPage samples={filtered} total={samples.length} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} waterFilter={waterFilter} setWaterFilter={setWaterFilter} sortBy={sortBy} setSortBy={setSortBy} onAdd={()=>{setForm(defaultForm);setModal(true)}} onExport={()=>exportCsv(filtered)} onImport={()=>fileRef.current?.click()} onDelete={deleteSample} onDetails={setDetail}/>}
        {page==='distribution'&&<DistributionPage samples={samples} mapStatus={mapStatus} setMapStatus={setMapStatus} onDetails={setDetail}/>}
        {page==='analysis'&&<AnalysisPage samples={samples} detected={detected} detectionRate={detectionRate} taxonStats={taxonStats} onNavigate={showPage}/>}
        <footer className="footer"><span>© 2026 AquaScope · Frontend prototype</span><span><ShieldCheck size={13}/> Demo data · Not validated for scientific interpretation</span></footer>
      </div>
    </main>
    <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importCsv}/>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="sample-modal" onSubmit={saveSample}>
      <div className="modal-heading"><div><div className="eyebrow">DATA COLLECTION</div><h2>Add water sample</h2><p>Create a new record in the local sample register.</p></div><button type="button" className="icon-button" onClick={()=>setModal(false)} aria-label="Close"><X size={19}/></button></div>
      <div className="form-grid">
        <label>Sample ID *<input required value={form.id} onChange={e=>setForm({...form,id:e.target.value})} placeholder="e.g. AQ-025"/></label>
        <label>Sampling site *<input required value={form.site} onChange={e=>setForm({...form,site:e.target.value})} placeholder="e.g. North inlet"/></label>
        <label>Water body type<select value={form.water} onChange={e=>setForm({...form,water:e.target.value})}>{['Freshwater lake','River channel','Wetland','Reservoir','Pond','Estuary','Other'].map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Taxon / species<input value={form.taxon} onChange={e=>setForm({...form,taxon:e.target.value})} placeholder="e.g. Rohu"/></label>
        <label>QDR signal index (demo)<input type="number" min="0" max="100" value={form.signal} onChange={e=>setForm({...form,signal:e.target.value})} placeholder="0–100"/></label>
        <label>Collection date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
        <label>Latitude<input type="number" step="any" value={form.lat} onChange={e=>setForm({...form,lat:e.target.value})} placeholder="22.57"/></label>
        <label>Longitude<input type="number" step="any" value={form.lng} onChange={e=>setForm({...form,lng:e.target.value})} placeholder="88.42"/></label>
        <label className="full-span">Research notes<textarea rows="2" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Collection conditions, assay notes, or context..."/></label>
      </div>
      <div className="form-note"><CircleHelp size={15}/><span>The 0–100 signal index is a placeholder only. Confirm the QDR method, units, and classification criteria before entering real results.</span></div>
      {formError&&<div className="form-error"><CircleX size={15}/>{formError}</div>}
      <div className="modal-actions"><button type="button" className="button-secondary" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="button-primary"><Plus size={16}/> Save sample</button></div>
    </form></div>}
    {detail&&<div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDetail(null)}}><aside className="detail-drawer"><div className="drawer-top"><div><div className="eyebrow">SAMPLE RECORD</div><h2>{detail.id}</h2></div><button className="icon-button" onClick={()=>setDetail(null)} aria-label="Close details"><X size={19}/></button></div><div className="drawer-status"><span className={`status-badge ${detail.status==='Detected'?'status-detected':'status-none'}`}><i/>{detail.status}</span><span className="drawer-date"><CalendarDays size={14}/>{detail.date}</span></div><div className="detail-highlight"><span>Demo signal index</span><strong>{detail.signal}<small>/100</small></strong><div className="detail-signal-track"><span style={{width:`${Math.min(100,Math.max(0,detail.signal))}%`}}/></div><p>Illustrative index only — not a concentration or abundance estimate.</p></div><div className="detail-section"><h3>Sampling information</h3><DetailRow label="Site" value={detail.site}/><DetailRow label="Water body" value={detail.water}/><DetailRow label="Taxon" value={detail.taxon}/><DetailRow label="Latitude" value={Number(detail.lat).toFixed(5)}/><DetailRow label="Longitude" value={Number(detail.lng).toFixed(5)}/><DetailRow label="Notes" value={detail.notes||'No notes'}/></div><div className="drawer-actions"><button className="button-secondary" onClick={()=>{showPage('distribution');setDetail(null)}}><MapPin size={15}/> View map</button><button className="button-danger" onClick={()=>deleteSample(detail.id)}><Trash2 size={15}/> Delete record</button></div></aside></div>}
    {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function PageHeader({eyebrow,title,description,action}) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div> }
function MetricCard({label,value,sub,icon:Icon,tone,tag}) { return <section className="metric-card"><div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon size={19}/></div></div><div className="metric-value">{value}</div><div className="metric-bottom"><span>{sub}</span><span className="metric-tag">{tag}</span></div></section> }
function Banner({icon:Icon,title,body,action}) { return <div className="notice-banner"><div className="notice-symbol"><Icon size={17}/></div><div className="notice-copy"><strong>{title}</strong><p>{body}</p></div>{action}</div> }
function DetailRow({label,value}) { return <div className="detail-row"><span>{label}</span><strong>{value||'—'}</strong></div> }

function Overview({samples,detected,uniqueSites,uniqueTaxa,detectionRate,taxonStats,onAdd,onNavigate,onDetails}) {
  const latest=[...samples].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7).reverse()
  const activityData={labels:latest.map(s=>s.date.slice(5)),datasets:[{label:'Signal index (demo)',data:latest.map(s=>Number(s.signal)),fill:true,backgroundColor:'rgba(25,138,126,.10)',borderColor:'#198a7e',borderWidth:2,pointRadius:3,pointHoverRadius:5,pointBackgroundColor:'#fff',pointBorderColor:'#198a7e',tension:.34}]}
  const speciesData={labels:taxonStats.map(x=>x[0]),datasets:[{data:taxonStats.map(x=>x[1]),backgroundColor:taxonStats.map((_,i)=>colors[i%colors.length]),borderWidth:3,borderColor:'#fff',hoverOffset:5}]}
  return <>
    <PageHeader eyebrow="RESEARCH OVERVIEW" title="Aquatic population mapping" description="Monitor sample collection, molecular detections, and aquatic biodiversity across your study sites." action={<button className="button-primary" onClick={onAdd}><Plus size={17}/> Add sample</button>}/>
    <Banner icon={Sparkles} title="Your research workspace is ready" body="This workspace contains illustrative records. Replace them with verified observations before interpreting patterns." action={<button className="text-button" onClick={()=>onNavigate('samples')}>Review records <span>→</span></button>}/>
    <div className="metric-grid">
      <MetricCard label="Samples recorded" value={numberFmt(samples.length)} sub="Records in this browser" icon={FlaskConical} tone="teal" tag="Sample register"/>
      <MetricCard label="Sites represented" value={numberFmt(uniqueSites)} sub="Unique sampling locations" icon={MapPin} tone="blue" tag="Spatial coverage"/>
      <MetricCard label="Named taxa" value={numberFmt(uniqueTaxa)} sub="Taxa in sample records" icon={Fish} tone="violet" tag="Biodiversity"/>
      <MetricCard label="Detection fraction" value={`${detectionRate}%`} sub={`${detected} records marked detected`} icon={Activity} tone="amber" tag="Demo classification"/>
    </div>
    <div className="content-grid">
      <section className="panel chart-panel"><div className="panel-header"><div><h2>Signal index over recent records</h2><p>Demo index by collection date · not concentration</p></div><span className="period-label"><CalendarDays size={14}/> Latest samples</span></div><div className="chart-wrap line-chart"><Line data={activityData} options={lineOptions}/></div><div className="chart-footnote"><span><i className="legend-dot teal-dot"/> Demo signal index</span><span>Illustrative data only</span></div></section>
      <section className="panel species-panel"><div className="panel-header"><div><h2>Taxa in detected records</h2><p>Counts by taxon label in current dataset</p></div><button className="icon-button" onClick={()=>onNavigate('analysis')} aria-label="Open analysis"><MoreHorizontal size={19}/></button></div>
        {taxonStats.length?<><div className="donut-wrap"><Doughnut data={speciesData} options={donutOptions}/><div className="donut-center"><strong>{taxonStats.reduce((sum,x)=>sum+x[1],0)}</strong><span>demo records</span></div></div><div className="species-legend">{taxonStats.slice(0,5).map(([name,count],i)=><div key={name} className="legend-row"><span className="legend-left"><i style={{background:colors[i%colors.length]}}/>{name}</span><strong>{count}</strong></div>)}</div></>:<div className="empty-chart">Add taxon labels to detected records to populate this chart.</div>}
      </section>
    </div>
    <section className="panel recent-panel"><div className="panel-header"><div><h2>Recent sample records</h2><p>Open any record to inspect its metadata.</p></div><button className="text-button" onClick={()=>onNavigate('samples')}>View register <span>→</span></button></div><SampleTable samples={[...samples].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)} compact onDetails={onDetails}/></section>
  </>
}

function SampleTable({samples,compact=false,onDetails,onDelete}) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Sample ID</th><th>Sampling site</th><th>Water body</th><th>Taxon</th><th>Signal index</th><th>Status</th>{!compact&&<th>Date</th>}<th></th></tr></thead><tbody>
    {samples.map(s=><tr key={s.id}><td><button className="sample-id-link" onClick={()=>onDetails?.(s)}>{s.id}</button></td><td><span className="site-cell"><MapPin size={14}/>{s.site}</span></td><td>{s.water}</td><td>{s.taxon||'Not assigned'}</td><td><div className="signal-cell"><div className="signal-track"><span style={{width:`${Math.min(100,Math.max(0,Number(s.signal)||0))}%`}}/></div><span>{s.signal}</span></div></td><td><span className={`status-badge ${s.status==='Detected'?'status-detected':'status-none'}`}><i/>{s.status}</span></td>{!compact&&<td>{s.date}</td>}<td><button className="table-action" onClick={()=>onDetails?.(s)} title="View details"><Eye size={15}/></button></td></tr>)}
    {samples.length===0&&<tr><td colSpan={8} className="empty-state">No records match these filters. Try another search or add a sample.</td></tr>}
  </tbody></table></div>
}

function SamplesPage({samples,total,query,setQuery,statusFilter,setStatusFilter,waterFilter,setWaterFilter,sortBy,setSortBy,onAdd,onExport,onImport,onDelete,onDetails}) {
  return <>
    <PageHeader eyebrow="DATA COLLECTION" title="Sample register" description="Search, review, import, and export water-sampling records." action={<button className="button-primary" onClick={onAdd}><Plus size={17}/> Add sample</button>}/>
    <Banner icon={FileSpreadsheet} title="Import and export your records" body="CSV import accepts columns such as Sample ID, Site, Water body, Taxon, Signal index (demo), Status, Date, Latitude, Longitude, and Notes."/>
    <section className="panel sample-list-panel">
      <div className="list-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ID, site, taxon, notes..."/>{query&&<button className="clear-search" onClick={()=>setQuery('')} aria-label="Clear search"><X size={14}/></button>}</div><div className="toolbar-right"><label className="filter-select"><SlidersHorizontal size={15}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter by status"><option>All statuses</option><option>Detected</option><option>Not detected</option></select></label><label className="filter-select"><Filter size={15}/><select value={waterFilter} onChange={e=>setWaterFilter(e.target.value)} aria-label="Filter by water body"><option>All water bodies</option>{[...new Set(samples.map(s=>s.water))].sort().map(v=><option key={v}>{v}</option>)}</select></label></div></div>
      <div className="list-toolbar second-toolbar"><div className="table-meta"><span><strong>{samples.length}</strong> of {total} records shown</span><span>Stored locally</span></div><div className="toolbar-right"><label className="sort-label">Sort by<select value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="signal-desc">Signal: high to low</option></select></label><button className="button-secondary" onClick={onImport}><Upload size={15}/> Import CSV</button><button className="button-secondary" onClick={onExport}><Download size={15}/> Export CSV</button></div></div>
      <SampleTable samples={samples} onDetails={onDetails}/>
    </section>
    <div className="bottom-note"><ShieldCheck size={16}/><span>Local browser storage only. Export a backup if you want to keep a separate copy of the demo dataset.</span></div>
  </>
}

function MapView({samples,onDetails}) {
  const valid=samples.filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng)))
  const center=valid.length?[Number(valid[0].lat),Number(valid[0].lng)]:[22.57,88.42]
  return <div className="map-frame"><MapContainer center={center} zoom={11} scrollWheelZoom className="leaflet-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{valid.map(s=><CircleMarker key={s.id} center={[Number(s.lat),Number(s.lng)]} radius={s.status==='Detected'?9:6} pathOptions={{color:s.status==='Detected'?'#137e73':'#9aa9a7',fillColor:s.status==='Detected'?'#20ad9a':'#c5d0ce',fillOpacity:.85,weight:2}}><Popup><div className="map-popup"><strong>{s.site}</strong><span>{s.id} · {s.taxon}</span><span>Status: {s.status}</span><span>Demo signal index: {s.signal}</span><button onClick={()=>onDetails(s)}>Open record →</button></div></Popup></CircleMarker>)}</MapContainer></div>
}
function DistributionPage({samples,mapStatus,setMapStatus,onDetails}) {
  const shown=samples.filter(s=>mapStatus==='All statuses'||s.status===mapStatus)
  return <>
    <PageHeader eyebrow="SPATIAL ECOLOGY" title="Distribution map" description="Explore sampling locations and inspect recorded classifications across your study area." action={<span className="period-label"><MapPin size={14}/>{shown.length} mapped records</span>}/>
    <Banner icon={MapPin} title="Check coordinates before mapping real data" body="The initial markers use illustrative coordinates around Kolkata. Replace these with verified GPS readings from your sampling sites."/>
    <section className="panel map-panel"><div className="panel-header"><div><h2>Sampling locations</h2><p>Select a marker to inspect its sample record.</p></div><div className="map-controls"><label className="filter-select"><Filter size={14}/><select value={mapStatus} onChange={e=>setMapStatus(e.target.value)}><option>All statuses</option><option>Detected</option><option>Not detected</option></select></label><div className="map-legend"><span><i className="legend-dot teal-dot"/> Detected</span><span><i className="legend-dot gray-dot"/> Not detected</span></div></div></div><MapView samples={shown} onDetails={onDetails}/><div className="map-summary"><div><span className="summary-mark teal-mark"/><span>Detected</span><strong>{shown.filter(s=>s.status==='Detected').length}</strong></div><div><span className="summary-mark gray-mark"/><span>Not detected</span><strong>{shown.filter(s=>s.status!=='Detected').length}</strong></div><div><span className="summary-mark outline-mark"/><span>Mapped records</span><strong>{shown.length}</strong></div></div></section>
    <section className="panel recent-panel"><div className="panel-header"><div><h2>Site register</h2><p>Click a sample ID to open the details panel.</p></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Sample ID</th><th>Site</th><th>Latitude</th><th>Longitude</th><th>Status</th><th></th></tr></thead><tbody>{shown.map(s=><tr key={s.id}><td><button className="sample-id-link" onClick={()=>onDetails(s)}>{s.id}</button></td><td>{s.site}</td><td>{Number(s.lat).toFixed(5)}</td><td>{Number(s.lng).toFixed(5)}</td><td><span className={`status-badge ${s.status==='Detected'?'status-detected':'status-none'}`}><i/>{s.status}</span></td><td><button className="table-action" onClick={()=>onDetails(s)} title="View details"><Eye size={15}/></button></td></tr>)}</tbody></table></div></section>
  </>
}
function AnalysisPage({samples,detected,detectionRate,taxonStats,onNavigate}) {
  const ordered=[...samples].sort((a,b)=>a.date.localeCompare(b.date))
  const signalData={labels:ordered.map(s=>s.id),datasets:[{label:'Signal index (demo)',data:ordered.map(s=>Number(s.signal)),backgroundColor:'rgba(25,138,126,.78)',borderRadius:5,maxBarThickness:30}]}
  const siteCounts={}
  samples.forEach(s=>siteCounts[s.site]=(siteCounts[s.site]||0)+1)
  const siteData={labels:Object.keys(siteCounts).slice(0,8),datasets:[{label:'Samples',data:Object.values(siteCounts).slice(0,8),backgroundColor:'#70b8a9',borderRadius:4,maxBarThickness:26}]}
  const taxaData={labels:taxonStats.map(x=>x[0]),datasets:[{label:'Detected records',data:taxonStats.map(x=>x[1]),borderColor:'#198a7e',backgroundColor:'rgba(25,138,126,.1)',fill:true,tension:.3,pointRadius:4}]}
  return <>
    <PageHeader eyebrow="MOLECULAR WORKBENCH" title="Molecular analysis" description="Explore signal-index patterns and descriptive summaries from the current sample register." action={<span className="period-label"><Microscope size={14}/> Demo analytics</span>}/>
    <Banner icon={FlaskConical} title="QDR measurement model not configured" body="Before real analysis, define the QDR method, units, calibration, controls, detection limit, and classification thresholds. The charts below use illustrative data."/>
    <div className="analysis-grid"><section className="panel analysis-chart-panel"><div className="panel-header"><div><h2>Signal index by sample</h2><p>Illustrative 0–100 index · not a molecular concentration</p></div></div><div className="chart-wrap bar-chart"><Bar data={signalData} options={barOptions}/></div></section>
      <section className="panel analysis-summary"><div className="panel-header"><div><h2>Record summary</h2><p>Descriptive counts from this browser</p></div></div><div className="analysis-stat"><span>Records reviewed</span><strong>{samples.length}</strong></div><div className="analysis-stat"><span>Marked detected</span><strong>{detected}</strong></div><div className="analysis-stat"><span>Marked not detected</span><strong>{samples.length-detected}</strong></div><div className="analysis-stat"><span>Detection fraction*</span><strong>{detectionRate}%</strong></div><p className="small-disclaimer">*This is the fraction of records marked detected, not an estimate of fish abundance.</p><button className="button-secondary full-width" onClick={()=>onNavigate('samples')}>Review source records <ExternalLink size={14}/></button></section></div>
    <section className="content-grid analysis-lower"><div className="panel analysis-chart-panel"><div className="panel-header"><div><h2>Samples by site</h2><p>Number of records per named sampling site</p></div></div><div className="chart-wrap lower-chart"><Bar data={siteData} options={{...commonOptions,scales:{...commonOptions.scales,y:{...commonOptions.scales.y,beginAtZero:true,precision:0}}}}/></div></div><div className="panel analysis-chart-panel"><div className="panel-header"><div><h2>Detected records by taxon</h2><p>Counts of demo records grouped by taxon</p></div></div>{taxonStats.length?<div className="chart-wrap lower-chart"><Line data={taxaData} options={commonOptions}/></div>:<div className="empty-chart">No named taxa in detected records yet.</div>}</div></section>
    <section className="panel protocol-panel"><div className="protocol-icon"><FileText size={20}/></div><div><h2>Scientific interpretation checklist</h2><p>Document assay details, negative and positive controls, units, calibration, replicate handling, detection limits, and uncertainty. Molecular detection alone does not directly establish the number of fish present; abundance inference requires an appropriate validated model.</p></div></section>
  </>
}
