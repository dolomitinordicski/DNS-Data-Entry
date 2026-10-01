import type { PocketfolderSourceCell, PocketfolderSourceRow } from '../../types/orderMatrix';

type Language = 'de' | 'it';

function cell(value: PocketfolderSourceCell, language: Language) {
  if (value === null) return '';
  if (value === '/') return '/';
  return value.toLocaleString(language === 'de' ? 'de-DE' : 'it-IT');
}

export function PocketfolderSourceView({
  rows,
  language,
}: {
  rows: PocketfolderSourceRow[];
  language: Language;
}) {
  const it = language === 'it';

  return (
    <section className="dns-card overflow-hidden">
      <div className="border-b border-dns-mid/10 p-5 md:p-6">
        <div className="dns-section-title">{it ? 'Vista fonte originale' : 'Originale Quellenansicht'}</div>
        <p className="mt-2 max-w-5xl font-alt text-[10px] leading-relaxed text-dns-muted">
          {it
            ? 'Riproduzione read-only del foglio “Folder-Brochure”. Ordine righe, zeri, celle vuote e “/” sono preservati dalla fonte e non seguono la normalizzazione della matrice operativa.'
            : 'Read-only-Wiedergabe des Blatts „Folder-Brochure“. Reihenfolge, Nullwerte, leere Zellen und „/“ werden aus der Quelle unverändert erhalten und folgen nicht der Normalisierung der operativen Matrix.'}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 font-alt text-[11px] text-dns-muted">
          {it ? 'Righe sorgente non disponibili.' : 'Quellenzeilen nicht verfügbar.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr className="border-b border-dns-mid/15 bg-dns-bg text-[9px] uppercase tracking-[.04em] text-dns-mid">
                <th className="w-[54px] px-3 py-3 text-right">#</th>
                <th className="min-w-[280px] px-4 py-3 text-left">
                  {it ? 'Area / distribuzione' : 'Gebiet / Verteilung'}
                </th>
                <th className="min-w-[150px] px-3 py-3 text-right">{it ? 'Confronto 2025/26' : 'Vergleich 2025/26'}</th>
                <th className="min-w-[110px] px-3 py-3 text-right">2026–27</th>
                <th className="min-w-[100px] px-3 py-3 text-right">{it ? 'Per DNS*' : 'Für DNS*'}</th>
                <th className="min-w-[120px] px-3 py-3 text-right">{it ? 'Totale AREA' : 'Gesamt AREA'}</th>
                <th className="min-w-[140px] px-3 py-3 text-right">{it ? 'Totale tipografia' : 'Gesamt Druckerei'}</th>
                <th className="min-w-[170px] px-4 py-3 text-left">{it ? 'Retro' : 'Rückseite'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                if (row.rowKind === 'blank') {
                  return <tr key={row.id} className="h-5 border-b border-dns-mid/5"><td colSpan={8} /></tr>;
                }

                if (row.rowKind === 'note') {
                  return (
                    <tr key={row.id} className="border-b border-dns-mid/5 bg-dns-bg/35">
                      <td className="px-3 py-2 text-right font-alt text-[9px] text-dns-muted">{row.sourceRow}</td>
                      <td colSpan={7} className="px-4 py-2 font-alt text-[10px] italic text-dns-muted">{row.label}</td>
                    </tr>
                  );
                }

                const total = row.rowKind === 'total';
                const area = row.rowKind === 'area';
                const rowClass = total
                  ? 'bg-dns-deep text-white'
                  : area
                    ? 'bg-dns-bg/75 text-dns-deep'
                    : 'bg-white text-dns-deep';

                return (
                  <tr key={row.id} className={`border-b border-dns-mid/10 ${rowClass}`}>
                    <td className={`px-3 py-2.5 text-right font-alt text-[9px] ${total ? 'text-white/65' : 'text-dns-muted'}`}>
                      {row.sourceRow}
                    </td>
                    <td className={`px-4 py-2.5 text-[11px] ${area || total ? 'font-bold' : 'font-medium'}`}>
                      {row.rowKind === 'distribution' ? <span className="pl-4">{row.label}</span> : row.label}
                    </td>
                    {[row.comparison2025, row.requested2026, row.dnsCopies, row.areaTotal2026, row.printerTotal2026].map((value, index) => (
                      <td key={index} className="px-3 py-2.5 text-right font-alt text-[11px] tabular-nums">
                        {cell(value, language)}
                      </td>
                    ))}
                    <td className={`px-4 py-2.5 font-alt text-[9px] ${total ? 'text-white/80' : 'text-dns-muted'}`}>
                      {row.backLanguageNote}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
