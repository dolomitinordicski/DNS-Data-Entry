import { useMemo, useState } from 'react';
import { checkCollectiveOrder, type CollectiveOrder, type CollectiveOrderLine } from './model';
import { checkAllocations } from './allocation';
import type { CanonicalRecord } from '../../types/master';

type Language = 'de' | 'it';
type Props = { language: Language; seasonId: string; organizations: CanonicalRecord[]; isAdmin: boolean };

const copy = {
  de: {
    title: 'Sammelbestellungen', intro: 'Gemeinsame Beschaffungen — getrennt von der saisonalen Ticket-Bestellmatrix.',
    preview: 'Lokaler Arbeitsentwurf – keine Firebase-Speicherung, keine Faktura-Übertragung',
    reference: 'Referenzprojekt · DNS Teamjacke 2026 (noch nicht importiert)',
    supplier: 'Lieferant', project: 'Projekt', item: 'Artikel', quantity: 'Menge',
    ordering: 'Bestellende Organisation', billed: 'Rechnungsempfänger', recipient: 'Warenempfänger',
    add: 'Position hinzufügen', remove: 'Entfernen', check: 'Entwurf prüfen',
    netCost: 'Lieferantenkosten netto', referencePartner: 'Partneranteile netto', dnsResidual: 'DNS Restkosten netto',
    note: 'Referenzbeträge sind abgestimmt, aber nicht aus diesem lokalen Entwurf errechnet.',
    valid: 'Entwurf formal gültig. Keine Freigabe oder Preisberechnung erfolgt.',
    invalid: 'Entwurf unvollständig. Bitte die aufgeführten Punkte korrigieren.',
    noSave: 'Keine Live-Schreibrechte. Daten gehen beim Neuladen verloren.',
    unavailable: 'Die Bearbeitung von Sammelbestellungen ist derzeit nur für DNS Admin vorbereitet.',
    empty: 'Bitte mindestens eine Artikelposition und gültige Organisationen erfassen.',
  },
  it: {
    title: 'Ordini collettivi', intro: 'Acquisti condivisi, separati dalla matrice stagionale delle tessere.',
    preview: 'Bozza locale di lavoro – nessun salvataggio Firebase né trasferimento a Faktura',
    reference: 'Progetto di riferimento · DNS Teamjacke 2026 (non ancora importato)',
    supplier: 'Fornitore', project: 'Progetto', item: 'Articolo', quantity: 'Quantità',
    ordering: 'Organizzazione ordinante', billed: 'Organizzazione da fatturare', recipient: 'Destinatario merce',
    add: 'Aggiungi posizione', remove: 'Elimina', check: 'Verifica bozza',
    netCost: 'Costo fornitore netto', referencePartner: 'Quote partner nette', dnsResidual: 'Residuo DNS netto',
    note: 'Gli importi di riferimento sono concordati, ma non sono calcolati da questa bozza locale.',
    valid: 'Bozza formalmente valida. Nessuna approvazione o valorizzazione economica.',
    invalid: 'Bozza incompleta. Correggi i punti indicati.',
    noSave: 'Nessuna scrittura live. I dati si perdono ricaricando la pagina.',
    unavailable: 'La modifica degli ordini collettivi è per ora predisposta soltanto per DNS Admin.',
    empty: 'Inserisci almeno una posizione articolo e organizzazioni valide.',
  },
} as const;

function newLine(index: number, orgId: string): CollectiveOrderLine {
  return {
    id: 'draft-line-' + index,
    catalogItemId: '',
    description: '',
    quantity: 1,
    unit: 'piece',
    participant: {organizationId: orgId, billedOrganizationId: orgId, recipientOrganizationId: orgId},
  };
}

export function CollectiveOrdersWorkspace({language,seasonId,organizations,isAdmin}:Props) {
  const t = copy[language];
  const [title,setTitle]=useState('');
  const [supplier,setSupplier]=useState('');
  const [lines,setLines]=useState<CollectiveOrderLine[]>([]);
  const [validated,setValidated]=useState(false);
  const [nextId,setNextId]=useState(1);
  const organizationIds=useMemo(()=>organizations.map(o=>o.id),[organizations]);
  const options=useMemo(()=>organizations.map(o=>({id:o.id,label:
    String((o as CanonicalRecord & {canonicalName?:string}).canonicalName ?? o.id)})),[organizations]);
  const draft:CollectiveOrder = {
    id:'local-preview',seasonId,title,supplierId:supplier,status:'draft',sourceRevision:1,
    supplierDocumentIds:[],lines,supplierCosts:[],
  };
  const sourceCheck=checkCollectiveOrder(draft);
  const allocationCheck=checkAllocations(lines,{organizationIds});
  const errors=[...sourceCheck.errors.filter(e=>e!=='missing-supplier-documents'),...allocationCheck.errors];
  if (!lines.length) errors.push('missing-order-lines');
  const update=(id:string,fn:(line:CollectiveOrderLine)=>CollectiveOrderLine)=>{
    setLines(old=>old.map(line=>line.id===id?fn(line):line));setValidated(false);
  };
  const setParticipant=(id:string,key:'organizationId'|'billedOrganizationId'|'recipientOrganizationId',value:string)=>{
    update(id,line=>({...line,participant:{...line.participant,[key]:value}}));
  };
  return (
    <section className="dns-card p-5 md:p-7">
      <div className="dns-kicker">{t.title}</div>
      <p className="mt-2 text-sm text-dns-muted">{t.intro}</p>
      <div className="mt-4 rounded-lg border border-dns-border p-4">
        <div className="text-xs font-semibold">{t.reference}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {([
            [t.netCost,'9.910,00 €'],[t.referencePartner,'8.475,60 €'],[t.dnsResidual,'1.434,40 €']
          ] as const).map(([label,value])=>(
            <div key={label}><div className="text-xs text-dns-muted">{label}</div>
              <div className="mt-1 text-lg font-semibold">{value}</div></div>
          ))}
        </div>
        <p className="mt-2 text-xs text-dns-muted">{t.note}</p>
      </div>
      <div role="status" className="mt-4 rounded-md border border-dns-border p-3 text-xs text-dns-muted">
        {t.preview}. {t.noSave}
      </div>
      {!isAdmin ? <p className="mt-4 text-sm text-dns-muted">{t.unavailable}</p> :
      <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">{t.project}
            <input className="mt-1 block w-full rounded-md border border-dns-border bg-white p-2 text-sm text-black"
              value={title} onChange={e=>{setTitle(e.target.value);setValidated(false);}} />
          </label>
          <label className="text-xs font-semibold">{t.supplier}
            <input className="mt-1 block w-full rounded-md border border-dns-border bg-white p-2 text-sm text-black"
              value={supplier} onChange={e=>{setSupplier(e.target.value);setValidated(false);}} />
          </label>
        </div>
        <div className="mt-5 space-y-4">
          {lines.map(line=>(
            <div key={line.id} className="rounded-lg border border-dns-border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold">{t.item}
                  <input className="mt-1 block w-full rounded-md border border-dns-border bg-white p-2 text-sm text-black"
                    value={line.description} onChange={e=>update(line.id,l=>({...l,description:e.target.value,catalogItemId:e.target.value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-')}))}/>
                </label>
                <label className="text-xs font-semibold">{t.quantity}
                  <input type="number" min="0" step="1" className="mt-1 block w-full rounded-md border border-dns-border bg-white p-2 text-sm text-black"
                    value={line.quantity} onChange={e=>update(line.id,l=>({...l,quantity:Number(e.target.value)}))}/>
                </label>
                {([
                  ['organizationId',t.ordering],['billedOrganizationId',t.billed],['recipientOrganizationId',t.recipient]
                ] as const).map(([key,label])=>(
                  <label key={key} className="text-xs font-semibold">{label}
                    <select className="mt-1 block w-full rounded-md border border-dns-border bg-white p-2 text-sm text-black"
                      value={line.participant[key]} onChange={e=>setParticipant(line.id,key,e.target.value)}>
                      <option value="">—</option>
                      {options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <button type="button" className="mt-3 text-xs underline" onClick={()=>{setLines(ls=>ls.filter(l=>l.id!==line.id));setValidated(false);}}>{t.remove}</button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="dns-btn-secondary" onClick={()=>{
            setLines(ls=>[...ls,newLine(nextId,organizationIds[0]??'')]);setNextId(n=>n+1);setValidated(false);
          }}>{t.add}</button>
          <button type="button" className="dns-btn-secondary" onClick={()=>setValidated(true)}>{t.check}</button>
        </div>
        {validated && <div role="status" className="mt-4 rounded-md border border-dns-border p-3 text-sm">
          <p>{errors.length?t.invalid:t.valid}</p>
          {errors.length>0 && <ul className="mt-2 list-disc pl-5">{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>}
        </div>}
      </>}
    </section>
  );
}
