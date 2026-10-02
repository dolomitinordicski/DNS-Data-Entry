import * as XLSX from 'xlsx';
import type { PublicOrderShareDocument } from './publicOrderShares';
import { buildTicketNumbering, formatTicketNumber } from './ticketNumbering';

type Language = 'de' | 'it';

function safeTimestamp(value: string) {
  return value.replace(/[:.]/g, '-').replace('T', '_');
}

function categoryLabel(category: PublicOrderShareDocument['category']) {
  if (category === 'wristband') return 'Wristbands';
  if (category === 'pocketfolder') return 'Pocketfolder';
  return 'Tickets';
}

function exportTimestamp() {
  return new Date().toISOString();
}

function fileBase(share: PublicOrderShareDocument) {
  return [
    'DNS',
    categoryLabel(share.snapshot.category),
    share.snapshot.seasonId,
    safeTimestamp(share.snapshot.generatedAt),
  ].join('_');
}

function quantities(share: PublicOrderShareDocument) {
  return new Map(
    share.snapshot.cells.map((cell) => [
      `${cell.organizationId}::${cell.catalogItemId}`,
      cell.quantity,
    ]),
  );
}

function rowTotal(
  share: PublicOrderShareDocument,
  organizationId: string,
  quantityMap: Map<string, number | null>,
) {
  return share.snapshot.items.reduce(
    (sum, item) =>
      sum + (quantityMap.get(`${organizationId}::${item.id}`) ?? 0),
    0,
  );
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportPublicOrderCsv(
  share: PublicOrderShareDocument,
  language: Language,
) {
  if (share.snapshot.category === 'ticket' && share.snapshot.ticketNumberingStart) {
    const numbering = buildTicketNumbering({
      items: share.snapshot.items,
      organizations: share.snapshot.organizations,
      cells: share.snapshot.cells,
      startNumber: share.snapshot.ticketNumberingStart,
    });
    const ranges = new Map(
      numbering.rows.map((row) => [
        `${row.organizationId}::${row.itemId}`,
        `${formatTicketNumber(row.from)} - ${formatTicketNumber(row.to)}`,
      ]),
    );
    const totals = new Map(
      share.snapshot.items.map((item) => [
        item.id,
        numbering.rows
          .filter((row) => row.itemId === item.id)
          .reduce((sum, row) => sum + row.quantity, 0),
      ]),
    );
    const rows: unknown[][] = [
      [
        share.snapshot.seasonId,
        ...share.snapshot.items.map((item) =>
          language === 'de' ? item.label.de : item.label.it,
        ),
      ],
      ...share.snapshot.organizations.map((organization) => [
        organization.sourceLabel,
        ...share.snapshot.items.map(
          (item) =>
            ranges.get(`${organization.organizationId}::${item.id}`) ?? '',
        ),
      ]),
      [
        'Kontroll TOT',
        ...share.snapshot.items.map((item) => totals.get(item.id) ?? 0),
      ],
      [],
      [
        language === 'de' ? 'Nächste Startnummer' : 'Prossimo numero iniziale',
        formatTicketNumber(numbering.nextNumber),
      ],
    ];

    const csv =
      '\uFEFF' +
      rows.map((row) => row.map(csvEscape).join(';')).join('\r\n');
    downloadText(
      `${fileBase(share)}_Nummerierung.csv`,
      csv,
      'text/csv;charset=utf-8',
    );
    return;
  }

  const q = quantities(share);
  const exportedAt = exportTimestamp();
  const numbering =
    share.snapshot.category === 'ticket' && share.snapshot.ticketNumberingStart
      ? buildTicketNumbering({
          items: share.snapshot.items,
          organizations: share.snapshot.organizations,
          cells: share.snapshot.cells,
          startNumber: share.snapshot.ticketNumberingStart,
        })
      : null;
  const numberingByCell = new Map(
    (numbering?.rows ?? []).map((row) => [
      `${row.organizationId}::${row.itemId}`,
      row,
    ]),
  );
  const rows: unknown[][] = [[
    'Snapshot timestamp',
    'Export timestamp',
    'Season',
    'Category',
    'Organization',
    'Delivery recipient',
    'Address',
    'Locality',
    'Phone',
    'Delivery status',
    'Item',
    'Item code',
    'Back language',
    'Quantity',
    'Number from',
    'Number to',
  ]];

  for (const organization of share.snapshot.organizations) {
    for (const item of share.snapshot.items) {
      const quantity = q.get(`${organization.organizationId}::${item.id}`);
      if (quantity === null || quantity === undefined || quantity <= 0) continue;

      const numberingRow = numberingByCell.get(
        `${organization.organizationId}::${item.id}`,
      );

      rows.push([
        share.snapshot.generatedAt,
        exportedAt,
        share.snapshot.seasonId,
        share.snapshot.category,
        organization.sourceLabel,
        organization.deliveryLocation?.recipientName ?? '',
        organization.deliveryLocation?.addressLine1 ?? '',
        organization.deliveryLocation?.postalLocality ?? '',
        organization.deliveryLocation?.phone ?? '',
        organization.deliveryLocation?.status ?? '',
        language === 'de' ? item.label.de : item.label.it,
        item.code,
        item.pocketfolder?.backLanguageOrder ?? '',
        quantity,
        numberingRow ? formatTicketNumber(numberingRow.from) : '',
        numberingRow ? formatTicketNumber(numberingRow.to) : '',
      ]);
    }
  }

  const csv =
    '\uFEFF' +
    rows.map((row) => row.map(csvEscape).join(';')).join('\r\n');

  downloadText(
    `${fileBase(share)}.csv`,
    csv,
    'text/csv;charset=utf-8',
  );
}

export function exportPublicOrderExcel(
  share: PublicOrderShareDocument,
  language: Language,
) {
  const workbook = XLSX.utils.book_new();

  if (share.snapshot.category === 'ticket' && share.snapshot.ticketNumberingStart) {
    const numbering = buildTicketNumbering({
      items: share.snapshot.items,
      organizations: share.snapshot.organizations,
      cells: share.snapshot.cells,
      startNumber: share.snapshot.ticketNumberingStart,
    });
    const ranges = new Map(
      numbering.rows.map((row) => [
        `${row.organizationId}::${row.itemId}`,
        `${formatTicketNumber(row.from)} - ${formatTicketNumber(row.to)}`,
      ]),
    );
    const totals = new Map(
      share.snapshot.items.map((item) => [
        item.id,
        numbering.rows
          .filter((row) => row.itemId === item.id)
          .reduce((sum, row) => sum + row.quantity, 0),
      ]),
    );
    const rows: unknown[][] = [
      [
        share.snapshot.seasonId,
        ...share.snapshot.items.map((item) =>
          language === 'de' ? item.label.de : item.label.it,
        ),
      ],
      ...share.snapshot.organizations.map((organization) => [
        organization.sourceLabel,
        ...share.snapshot.items.map(
          (item) =>
            ranges.get(`${organization.organizationId}::${item.id}`) ?? '',
        ),
      ]),
      [
        'Kontroll TOT',
        ...share.snapshot.items.map((item) => totals.get(item.id) ?? 0),
      ],
      [],
      [
        '',
        '',
        '',
        '',
        '',
        '',
        language === 'de' ? 'Nächste Startnummer' : 'Prossimo numero iniziale',
        formatTicketNumber(numbering.nextNumber),
      ],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!freeze'] = { xSplit: 1, ySplit: 1 };
    sheet['!cols'] = [
      { wch: 32 },
      ...share.snapshot.items.map(() => ({ wch: 24 })),
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Nummerierung');
    XLSX.writeFile(workbook, `${fileBase(share)}_Nummerierung.xlsx`, {
      compression: true,
    });
    return;
  }

  const q = quantities(share);
  const exportedAt = exportTimestamp();

  const itemHeaders = share.snapshot.items.map((item) =>
    language === 'de' ? item.label.de : item.label.it,
  );

  const orderRows: unknown[][] = [[
    'Organization',
    ...(share.snapshot.category === 'pocketfolder'
      ? ['Delivery recipient', 'Address', 'Locality', 'Phone', 'Delivery status']
      : []),
    ...itemHeaders,
    'Total',
  ]];

  for (const organization of share.snapshot.organizations) {
    orderRows.push([
      organization.sourceLabel,
      ...(share.snapshot.category === 'pocketfolder'
        ? [
            organization.deliveryLocation?.recipientName ?? '',
            organization.deliveryLocation?.addressLine1 ?? '',
            organization.deliveryLocation?.postalLocality ?? '',
            organization.deliveryLocation?.phone ?? '',
            organization.deliveryLocation?.status ?? '',
          ]
        : []),
      ...share.snapshot.items.map(
        (item) => q.get(`${organization.organizationId}::${item.id}`) ?? '',
      ),
      rowTotal(share, organization.organizationId, q),
    ]);
  }

  orderRows.push([
    'TOTAL',
    ...(share.snapshot.category === 'pocketfolder' ? ['', '', '', '', ''] : []),
    ...share.snapshot.items.map((item) =>
      share.snapshot.organizations.reduce(
        (sum, organization) =>
          sum +
          (q.get(`${organization.organizationId}::${item.id}`) ?? 0),
        0,
      ),
    ),
    share.snapshot.totalQuantity,
  ]);

  const orderSheet = XLSX.utils.aoa_to_sheet(orderRows);
  orderSheet['!freeze'] = { xSplit: 1, ySplit: 1 };
  orderSheet['!cols'] = [
    { wch: 30 },
    ...(share.snapshot.category === 'pocketfolder'
      ? [
          { wch: 32 },
          { wch: 34 },
          { wch: 24 },
          { wch: 22 },
          { wch: 20 },
        ]
      : []),
    ...share.snapshot.items.map(() => ({ wch: 18 })),
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, orderSheet, 'Order');

  if (
    share.snapshot.category === 'ticket' &&
    share.snapshot.ticketNumberingStart
  ) {
    const numbering = buildTicketNumbering({
      items: share.snapshot.items,
      organizations: share.snapshot.organizations,
      cells: share.snapshot.cells,
      startNumber: share.snapshot.ticketNumberingStart,
    });
    const numberingRows: unknown[][] = [
      ['Ticket type', 'Code', 'Organization', 'Quantity', 'From', 'To'],
      ...numbering.rows.map((row) => [
        language === 'de' ? row.itemLabel.de : row.itemLabel.it,
        row.itemCode,
        row.organizationLabel,
        row.quantity,
        formatTicketNumber(row.from),
        formatTicketNumber(row.to),
      ]),
      [
        'NEXT START',
        '',
        '',
        numbering.totalQuantity,
        '',
        formatTicketNumber(numbering.nextNumber),
      ],
    ];
    const numberingSheet = XLSX.utils.aoa_to_sheet(numberingRows);
    numberingSheet['!freeze'] = { ySplit: 1 };
    numberingSheet['!cols'] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 32 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, numberingSheet, 'Numbering');
  }

  if (share.snapshot.category === 'pocketfolder') {
    const distributionRows: unknown[][] = [[
      'Snapshot timestamp',
      'Export timestamp',
      'Organization',
      'Delivery recipient',
      'Address',
      'Locality',
      'Phone',
      'Delivery status',
      'Edition',
      'Edition code',
      'Back language',
      'Quantity',
    ]];

    for (const organization of share.snapshot.organizations) {
      for (const item of share.snapshot.items) {
        const quantity = q.get(`${organization.organizationId}::${item.id}`);
        if (quantity === null || quantity === undefined || quantity <= 0) continue;

        distributionRows.push([
          share.snapshot.generatedAt,
          exportedAt,
          organization.sourceLabel,
          organization.deliveryLocation?.recipientName ?? '',
          organization.deliveryLocation?.addressLine1 ?? '',
          organization.deliveryLocation?.postalLocality ?? '',
          organization.deliveryLocation?.phone ?? '',
          organization.deliveryLocation?.status ?? '',
          language === 'de' ? item.label.de : item.label.it,
          item.code,
          item.pocketfolder?.backLanguageOrder ?? '',
          quantity,
        ]);
      }
    }

    const distributionSheet = XLSX.utils.aoa_to_sheet(distributionRows);
    distributionSheet['!freeze'] = { ySplit: 1 };
    distributionSheet['!cols'] = [
      { wch: 24 }, { wch: 24 }, { wch: 30 }, { wch: 32 }, { wch: 34 },
      { wch: 24 }, { wch: 22 }, { wch: 18 }, { wch: 30 }, { wch: 22 },
      { wch: 18 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, distributionSheet, 'Distribution');
  }

  const metaSheet = XLSX.utils.aoa_to_sheet([
    ['DNS Supplier Order Snapshot'],
    ['Snapshot timestamp', share.snapshot.generatedAt],
    ['Export timestamp', exportedAt],
    ['Share ID', share.id],
    ['Season', share.snapshot.seasonId],
    ['Category', share.snapshot.category],
    ['Total quantity', share.snapshot.totalQuantity],
    ...(share.snapshot.ticketNumberingStart
      ? [
          ['Ticket numbering start', share.snapshot.ticketNumberingStart],
          [
            'Ticket numbering next start',
            buildTicketNumbering({
              items: share.snapshot.items,
              organizations: share.snapshot.organizations,
              cells: share.snapshot.cells,
              startNumber: share.snapshot.ticketNumberingStart,
            }).nextNumber,
          ],
        ]
      : []),
    ['Generated from', 'DNS Data Entry / public supplier snapshot'],
  ]);
  metaSheet['!cols'] = [{ wch: 28 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(workbook, metaSheet, 'Meta');

  const itemSheet = XLSX.utils.aoa_to_sheet([
    ['Code', 'DE', 'IT', 'Supplier reference', 'Back language'],
    ...share.snapshot.items.map((item) => [
      item.code,
      item.label.de,
      item.label.it,
      item.supplierColorReference ?? '',
      item.pocketfolder?.backLanguageOrder ?? '',
    ]),
  ]);
  itemSheet['!cols'] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 30 },
    { wch: 24 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, itemSheet, 'Items');

  XLSX.writeFile(workbook, `${fileBase(share)}.xlsx`, {
    compression: true,
  });
}
