import type { TicketNumberingResult, TicketNumberingRow } from './ticketNumbering';

/** Pure, read-only resolution of printed physical numbers against the existing matrix.
 * Does not claim that a pass was sold, registered or digitally valid. */
export type PassNumberResolution =
  | { status: 'FOUND'; normalizedNumber: number; assignment: TicketNumberingRow }
  | { status: 'NOT_FOUND' | 'AMBIGUOUS' | 'INVALID_NUMBER'; normalizedNumber?: number };

export function resolvePhysicalPassNumber(
  printedNumber: string,
  numbering: Pick<TicketNumberingResult, 'rows'>,
  eligibleItemCodes: readonly string[],
): PassNumberResolution {
  const raw = printedNumber.trim();
  if (!/^\d{1,12}$/.test(raw)) return { status: 'INVALID_NUMBER' };
  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < 1) return { status: 'INVALID_NUMBER' };

  const eligible = new Set(eligibleItemCodes);
  const matching = numbering.rows.filter(
    (row) =>
      eligible.has(row.itemCode) &&
      Number.isInteger(row.from) &&
      Number.isInteger(row.to) &&
      number >= row.from &&
      number <= row.to,
  );
  if (matching.length === 0) return { status: 'NOT_FOUND', normalizedNumber: number };
  if (matching.length !== 1) return { status: 'AMBIGUOUS', normalizedNumber: number };
  return { status: 'FOUND', normalizedNumber: number, assignment: matching[0] };
}

/** This helper operates on a *single-season* matrix. A caller must enforce season
 * and product scope and check persisted sale/activation state on the server. */
/** Exports the exact rows currently calculated by Data Entry; never an approval. */
export function exportDigitalPassInventory(
  numbering: Pick<TicketNumberingResult, 'rows'>,
  seasonId: string,
  revision: string,
) {
  if (seasonId !== '2026-27' || !revision) throw new Error('PILOT_INVENTORY_ONLY');
  const rows = numbering.rows.map(row => {
    if (!Number.isSafeInteger(row.from) || !Number.isSafeInteger(row.to) || row.from < 1 || row.to < row.from || !row.organizationId || !row.itemCode) throw new Error('INVALID_NUMBERING_ROW');
    return { itemCode: row.itemCode, organizationId: row.organizationId, from: row.from, to: row.to };
  });
  const ordered = [...rows].sort((a,b) => a.from - b.from);
  if (ordered.some((row,index) => index > 0 && row.from <= ordered[index - 1].to)) throw new Error('AMBIGUOUS_NUMBERING');
  return { schema: 'dns.digital-pass-inventory.v1', seasonId, revision, approved: false, rows };
}
