import * as XLSX from 'xlsx';
import {
  initDNSFoundation,
  type DNSFoundationRuntimeHandle,
} from '@dolomitinordicski/dns-shared-data/foundation';
import type { DNSCapabilityAdapter } from '@dolomitinordicski/dns-shared-data/capability-runtime';

type Language = 'de' | 'it';

const xlsxAdapter: DNSCapabilityAdapter<{
  workbook: XLSX.WorkBook;
  filename: string;
  compression?: boolean;
}> = {
  id: 'dns-data-entry-xlsx',
  capabilities: ['export.xlsx'],
  execute(input) {
    XLSX.writeFile(input.workbook, input.filename, {
      compression: input.compression ?? true,
    });
    return {
      filename: input.filename,
      sheets: input.workbook.SheetNames.length,
    };
  },
};

let foundation: DNSFoundationRuntimeHandle | null = null;

export function initDNSDataEntryFoundation(language: Language = 'de') {
  if (!foundation) {
    foundation = initDNSFoundation({
      language,
      shellProfile: 'operational',
      capabilities: ['export.xlsx', 'print'],
      capabilityAdapters: [xlsxAdapter],
      accessibility: false,
    });
  } else if (foundation.getLanguage() !== language) {
    foundation.setLanguage(language);
  }

  return foundation;
}

export function syncDNSDataEntryFoundationLanguage(language: Language) {
  initDNSDataEntryFoundation(language).setLanguage(language);
}

export const dnsDataEntryCapabilities = {
  run<T = unknown>(capability: 'export.xlsx' | 'print', input?: unknown) {
    return initDNSDataEntryFoundation().capabilityRuntime.run<T>(capability, input);
  },
};
