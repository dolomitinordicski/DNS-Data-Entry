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

const csvAdapter: DNSCapabilityAdapter<{
  filename: string;
  text: string;
  mimeType?: string;
}> = {
  id: 'dns-data-entry-csv',
  capabilities: ['export.csv'],
  execute(input) {
    const blob = new Blob([input.text], {
      type: input.mimeType ?? 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = input.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return { filename: input.filename, size: blob.size };
  },
};

let foundation: DNSFoundationRuntimeHandle | null = null;

export function initDNSDataEntryFoundation(language: Language = 'de') {
  if (!foundation) {
    foundation = initDNSFoundation({
      language,
      shellProfile: 'operational',
      capabilities: ['export.csv', 'export.xlsx', 'clipboard.copy', 'print'],
      capabilityAdapters: [csvAdapter, xlsxAdapter],
      accessibility: {
        enabled: true,
        mountSelector: '[data-dns-accessibility-mount]',
        storageKey: 'dns-accessibility-v1',
      },
    });
  } else if (foundation.getLanguage() !== language) {
    foundation.setLanguage(language);
  }

  return foundation;
}

export function setDNSDataEntryLanguage(language: Language) {
  initDNSDataEntryFoundation().setLanguage(language);
}

export function getDNSDataEntryLanguage(): Language {
  return initDNSDataEntryFoundation().getLanguage();
}

export function subscribeDNSDataEntryLanguage(listener: (language: Language) => void) {
  return initDNSDataEntryFoundation().subscribeLanguage(listener);
}

export const dnsDataEntryCapabilities = {
  run<T = unknown>(capability: 'export.csv' | 'export.xlsx' | 'clipboard.copy' | 'print', input?: unknown) {
    return initDNSDataEntryFoundation().capabilityRuntime.run<T>(capability, input);
  },
};
