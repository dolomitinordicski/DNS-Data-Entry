import { collection, doc, getDocs, query, where, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './dnsCore';
import { auth } from './auth';
import type { PricingDraftRow } from '../types/pricing';
import type { SalesDraftRow } from '../types/sales';

export function resolvePricing(rows: PricingDraftRow[], sale: SalesDraftRow) {
  return (['organization', 'reportingArea', 'network'] as const).map((scope) => rows.find((row) =>
    row.seasonId === sale.seasonId && row.scopeType === scope &&
    row.scopeId === (scope === 'organization' ? sale.organizationId : scope === 'reportingArea' ? sale.reportingAreaId : 'dolomiti-nordicski') &&
    row.productCode === sale.productCode && row.salesChannel === sale.salesChannel && row.salesPeriod === sale.salesPeriod,
  )).find((row) => row?.unitPrice !== null && row?.unitPrice !== undefined);
}

export async function loadPricing(seasonId: string): Promise<PricingDraftRow[]> {
  const snapshot = await getDocs(query(collection(db, 'ticketPricingConfigs'), where('seasonId', '==', seasonId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as PricingDraftRow));
}

async function saveRevision(collectionName: string, id: string, expectedRevision: number, payload: Record<string, unknown>, pricing?: PricingDraftRow) {
  if (!auth.currentUser) throw new Error('LOGIN_REQUIRED');
  const uid = auth.currentUser.uid;
  const ref = doc(db, collectionName, id);
  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    const previous = existing.exists() ? existing.data() : null;
    if (previous && Object.entries(payload).filter(([key]) => !['updatedAt','updatedBy','provenance','revision'].includes(key)).every(([key, value]) => JSON.stringify(previous[key]) === JSON.stringify(value))) return previous.revision as number;
    if ((previous?.revision ?? 0) !== expectedRevision) throw new Error('CONFLICT_RELOAD');
    if (previous?.provenance?.dataStatus && previous.provenance.dataStatus !== 'draft') throw new Error('RECORD_LOCKED');
    if (pricing) {
      const config = await transaction.get(doc(db, 'ticketPricingConfigs', pricing.id));
      if (!config.exists() || config.data().revision !== pricing.revision || config.data().unitPrice !== pricing.unitPrice || config.data().settlementUnitPrice !== (pricing.settlementUnitPrice ?? pricing.unitPrice)) throw new Error('SAVE_PRICING_FIRST');
    }
    if (previous) transaction.set(doc(ref, 'revisions', String(expectedRevision)), previous);
    transaction.set(ref, {
      ...payload, id, revision: expectedRevision + 1,
      provenance: { sourceSystem: 'manual-data-entry', methodVersion: 1, dataStatus: 'draft' },
      updatedBy: uid, updatedAt: serverTimestamp(),
    });
    return expectedRevision + 1;
  });
}

export async function savePricing(rows: PricingDraftRow[]) {
  const filled = rows.filter((row) => row.unitPrice !== null);
  if (!filled.length) throw new Error('INVALID_PRICE');
  if (rows.some((row) => row.revision && row.unitPrice === null)) throw new Error('SAVED_VALUE_CANNOT_BE_CLEARED');
  for (const row of filled) {
    if (!Number.isFinite(row.unitPrice) || row.unitPrice! < 0 || (row.settlementUnitPrice !== null && (!Number.isFinite(row.settlementUnitPrice) || row.settlementUnitPrice < 0))) throw new Error('INVALID_PRICE');
  }
  const result: PricingDraftRow[] = [];
  for (const row of filled) {
    const { revision, ...data } = row;
    const next = await saveRevision('ticketPricingConfigs', row.id, revision ?? 0, {
      ...data, currency: 'EUR', active: true,
      settlementUnitPrice: row.settlementUnitPrice ?? row.unitPrice,
    });
    result.push({ ...row, revision: next });
  }
  return result;
}

export async function loadSales(seasonId: string, organizationId: string, reportingAreaId: string): Promise<SalesDraftRow[]> {
  const snapshot = await getDocs(query(collection(db, 'ticketSales'), where('seasonId', '==', seasonId), where('organizationId', '==', organizationId), where('reportingAreaId', '==', reportingAreaId)));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.data().draftKey } as SalesDraftRow));
}

export async function saveSales(rows: SalesDraftRow[], prices: PricingDraftRow[]) {
  if (rows.some((row) => row.quantity === null && row.amountOverride !== null)) throw new Error('INVALID_SALES');
  const filled = rows.filter((row) => row.quantity !== null);
  if (!filled.length) throw new Error('INVALID_SALES');
  if (rows.some((row) => row.revision && row.quantity === null)) throw new Error('SAVED_VALUE_CANNOT_BE_CLEARED');
  const configs = filled.map((row) => {
    const price = resolvePricing(prices, row);
    if (!price?.revision || price.unitPrice === null) throw new Error('SAVE_PRICING_FIRST');
    if (!Number.isFinite(row.quantity! * price.unitPrice)) throw new Error('INVALID_SALES');
    if (!Number.isSafeInteger(row.quantity) || row.quantity! < 0 || (row.amountOverride !== null && (!Number.isFinite(row.amountOverride) || row.amountOverride < 0 || !row.amountOverrideReason.trim()))) throw new Error('INVALID_SALES');
    return price;
  });
  const result: SalesDraftRow[] = [];
  for (const [index, row] of filled.entries()) {
    const price = configs[index];
    const { revision, id, quantity, ...data } = row;
    const next = await saveRevision('ticketSales', [row.seasonId, row.organizationId, row.reportingAreaId, row.productCode, row.salesChannel, row.salesPeriod].join('__'), revision ?? 0, {
      ...data, draftKey: id, quantity,
      pricing: { pricingConfigId: price.id, unitPrice: price.unitPrice, settlementUnitPrice: price.settlementUnitPrice ?? price.unitPrice, currency: 'EUR' },
      calculatedAmount: Math.round(quantity! * price.unitPrice! * 100) / 100,
    }, price);
    result.push({ ...row, revision: next, pricing: { pricingConfigId: price.id, unitPrice: price.unitPrice!, settlementUnitPrice: price.settlementUnitPrice ?? price.unitPrice!, currency: 'EUR' }, calculatedAmount: Math.round(quantity! * price.unitPrice! * 100) / 100 });
  }
  return result;
}

export function persistenceMessage(error: unknown, language: 'de' | 'it') {
  const code = (error as { code?: string; message?: string }).code ?? (error as Error).message;
  const messages: Record<string, [string, string]> = {
    CONFLICT_RELOAD: ['Daten wurden inzwischen geändert. Bitte Seite neu laden.', 'I dati sono stati modificati da un altro utente. Ricarica la pagina.'],
    SAVE_PRICING_FIRST: ['Tarife zuerst speichern; geänderte Tarife erneut laden.', 'Salva prima le tariffe; se sono cambiate, ricarica la pagina.'],
    SAVED_VALUE_CANNOT_BE_CLEARED: ['Gespeicherte Werte nicht leeren. Bei keinen Verkäufen 0 eintragen.', 'Non svuotare valori già salvati. Per nessuna vendita inserisci 0.'],
    RECORD_LOCKED: ['Dieser Datensatz ist bereits eingereicht oder geprüft.', 'Questo dato è già inviato o verificato.'],
    INVALID_PRICE: ['Preise prüfen: nur gültige, nicht negative Beträge.', 'Controlla i prezzi: servono importi validi e non negativi.'],
    INVALID_SALES: ['Mengen, Beträge und Begründungen prüfen.', 'Controlla quantità, importi e motivazioni.'],
    'permission-denied': ['Kein Firebase-Zugriff für diesen Vorgang.', 'Accesso Firebase non abilitato per questa operazione.'],
    LOGIN_REQUIRED: ['Bitte anmelden.', 'Accedi con il tuo account.'],
  };
  return messages[code]?.[language === 'de' ? 0 : 1] ?? (language === 'de' ? 'Firebase-Vorgang fehlgeschlagen. Bitte erneut versuchen.' : 'Operazione Firebase non riuscita. Riprova.');
}
