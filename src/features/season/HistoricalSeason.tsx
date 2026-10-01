import { RegionLogos } from '../../components/RegionLogos';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/dnsCore';
import type { DNSAccessContext, DNSPermission } from '../../types/access';
import type { ModuleId } from '../../config/modules';

type Fact = Record<string, string | number | null>;
type RecordData = { id: string; domain: string; label: string; sheet: string; organizationId: string; reportingAreaId: string; facts: Fact[] };
type Control = { reportingAreaId: string; reportedQuantity: number; reportedAmount: number; detailQuantity: number; detailAmount: number; quantityDifference: number; amountDifference: number };
type Summary = { reportedQuantity: number; reportedAmount: number; controls: Control[] };

export function HistoricalSeason({ module, access, language }: { module: ModuleId; access: DNSAccessContext | null; language: 'it' | 'de' }) {
 const [records,setRecords]=useState<RecordData[]>([]);
 const [summary,setSummary]=useState<Summary|null>(null);
 const [status,setStatus]=useState('');
 const domain=module==='sales'?'sales':module==='orders'?'orders':module==='kp'?'kp':module==='pricing'?'pricing':null;
 const it=language==='it';
 useEffect(()=>{
  let current=true;setRecords([]);setSummary(null);setStatus(it?'Caricamento storico…':'Historie wird geladen…');
  async function load() {
   if (!access?.profile?.active) throw new Error(it?'Accedi per consultare i dati storici.':'Zum Lesen der Historie anmelden.');
   let found:RecordData[]=[];
   if (domain) {
    const base=[where('seasonId','==','2025-26'),where('domain','==',domain)];
    const permission:DNSPermission=domain==='sales'?'ticketSales.read':domain==='orders'?'ticketOrders.read':domain==='kp'?'kp.read':'pricing.read';
    const grants=access.grants.filter(g=>g.active && g.permissions.includes(permission));
    const unrestricted=access.isAdmin || domain==='pricing' || grants.some(g=>g.scopeType==='network' && g.scopeId==='dolomiti-nordicski');
    const snapshots=await Promise.all((unrestricted?[base]:grants.filter(g=>['organization','reportingArea'].includes(g.scopeType)).map(g=>[...base,where(g.scopeType==='organization'?'organizationId':'reportingAreaId','==',g.scopeId)])).map(filters=>getDocs(query(collection(db,'historicalSeasonRecords'),...filters))));
    found=[...new Map(snapshots.flatMap(s=>s.docs.map(d=>[d.id,{id:d.id,...d.data()} as RecordData] as const))).values()];
   }
   let control:Summary|null=null;
   if (access.isAdmin) {const snapshot=await getDoc(doc(db,'historicalSeasonImports','2025-26'));if(snapshot.exists())control=snapshot.data() as Summary;}
   if(current){setRecords(found);setSummary(control);setStatus(found.length || control?'':it?'Storico non ancora disponibile per questo ambito.':'Historie für diesen Bereich noch nicht verfügbar.');}
  }
  load().catch(e=>{if(current)setStatus(e.message);});return()=>{current=false;};
 },[domain,access,language,it]);
 const labels:Record<string,string> = it ? {item:'Articolo',quantity:'Quantità',sourceCell:'Cella originale',date:'Data',referenceKm:'Km unici di riferimento',naturalKm:'Km neve naturale',artificialKm:'Km neve artificiale',productCode:'Biglietto',salesChannel:'Canale',salesPeriod:'Periodo',amount:'Importo',currency:'Valuta',unitPrice:'Prezzo unitario'} : {item:'Artikel',quantity:'Menge',sourceCell:'Quellzelle',date:'Datum',referenceKm:'Einzelkm Referenz',naturalKm:'Km Naturschnee',artificialKm:'Km Kunstschnee',productCode:'Ticket',salesChannel:'Verkaufskanal',salesPeriod:'Zeitraum',amount:'Betrag',currency:'Währung',unitPrice:'Einzelpreis'};
 const number=(value:unknown)=>typeof value==='number'?value.toLocaleString(it?'it-IT':'de-DE',{maximumFractionDigits:2}):value===null?(it?'Non disponibile':'Nicht verfügbar'):String(value);
 return <div className="space-y-5">
  <section className="dns-card p-6"><h2 className="dns-section-title">WS 2025–26 · {it?'Storico in sola lettura':'Unveränderliche Historie'}</h2>
   <p className="mt-2 text-sm text-dns-muted">{it?'Dati originali importati da Excel. I riepiloghi dichiarati e i dettagli sono conservati separatamente.':'Originaldaten aus Excel. Gemeldete Summen und Detaildaten werden getrennt aufbewahrt.'}</p>
   {status && <p role="status" className="mt-3 text-sm">{status}</p>}
  </section>
  {summary && (module==='season' || module==='sales' || module==='verification') && <section className="dns-card p-6">
   <h3 className="dns-section-title">{it?'Riepilogo dichiarato nel file':'Gemeldete Gesamtsumme'}</h3>
   <p className="mt-3 text-lg">{number(summary.reportedQuantity)} {it?'biglietti':'Tickets'} · {number(summary.reportedAmount)} €</p>
   <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr>{(it?['Regione','Quantità dichiarata','Quantità dettagli','Importo dichiarato €','Importo dettagli €','Differenza €']:['Region','Gemeldete Menge','Detailmenge','Gemeldet €','Details €','Differenz €']).map(h=><th className="p-2 text-left" key={h}>{h}</th>)}</tr></thead><tbody>{summary.controls.map(c=><tr key={c.reportingAreaId}><td className="p-2">{c.reportingAreaId}</td>{[c.reportedQuantity,c.detailQuantity,c.reportedAmount,c.detailAmount,c.amountDifference].map((v,i)=><td className="p-2" key={i}>{number(v)}</td>)}</tr>)}</tbody></table></div>
   <p className="mt-3 text-sm">{it?'Le differenze sono anomalie del file originale e richiedono una decisione prima di usarle come base riconciliata in Analytics.':'Abweichungen stammen aus der Quelldatei und müssen vor der Verwendung als abgestimmte Analytics-Basis geklärt werden.'}</p>
  </section>}
  {records.map(record=><section className="dns-card p-5" key={record.id}><h3 className="dns-section-title flex items-center gap-3"><RegionLogos entityType="organization" entityId={record.organizationId} />{record.label}</h3><p className="mt-1 text-xs text-dns-muted">{record.sheet}</p>
   <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr>{[...new Set(record.facts.flatMap(f=>Object.keys(f)))].map(key=><th className="p-2 text-left" key={key}>{labels[key] ?? key}</th>)}</tr></thead><tbody>{record.facts.map((fact,i)=><tr key={i}>{[...new Set(record.facts.flatMap(f=>Object.keys(f)))].map(key=><td className="p-2" key={key}>{number(fact[key]??null)}</td>)}</tr>)}</tbody></table></div>
  </section>)}
 </div>;
}
