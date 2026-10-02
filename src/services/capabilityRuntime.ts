import * as XLSX from 'xlsx';
import {
  createDNSCapabilityRuntime,
  type DNSCapabilityAdapter,
} from '@dolomitinordicski/dns-shared-data/capability-runtime';

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

export const dnsDataEntryCapabilities = createDNSCapabilityRuntime({
  declared: ['export.xlsx'],
  adapters: [xlsxAdapter],
});
