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
