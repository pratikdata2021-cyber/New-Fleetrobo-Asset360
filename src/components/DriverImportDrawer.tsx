import React from 'react';
import { X } from 'lucide-react';
import {
  Driver,
  DRIVER_LOOKUPS,
  isGlobalDriverAdminContext,
  normalizeLicenceNumber,
  canDriverBeActivated
} from '../types/driver';
import { parseCsvLine } from '../types/modalMaster';
import {
  DirectBulkUploadView,
  formatUploadFileSize,
  useDirectUploadState
} from './common/DirectBulkUploadView';

interface DriverImportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  existingDrivers: Driver[];
  companyContext?: string;
  onImportComplete: (createdDrivers: Driver[], skippedCount: number) => void;
}

const SAMPLE_CSV_CONTENT = `Driver Name,Mobile Number,Date of Birth,Licence Number,Licence Valid From,Licence Valid To,Company,Transporter,Blood Group,Experience,RTO Certified,Police Verified,Training Completed,RFID Enabled
Devendra Sharma,9876501234,1989-05-15,DL0420160012345,2016-01-10,2030-01-09,Adani Port,Western Logistics,B+,9,Yes,Yes,Yes,Yes
Gurpreet Singh,9812301234,1986-11-20,PB0220130099887,2013-04-12,2029-04-11,Adani Mundra,TMS Transporter,O+,12,Yes,No,Yes,No
Mohan Lal Verma,9765401234,1993-02-28,RJ1420170054321,2017-08-15,2027-08-14,Binary Semantics Ltd,Binary Logistics,A+,7,Yes,Yes,No,No
Kalyan Rao,9845101234,1984-09-10,KA0120080033445,2008-03-20,2028-03-19,Adani Port,Western Logistics,AB+,16,No,No,No,Yes
Ajay Kumar,9934501234,1995-12-05,UP3220190077889,2019-10-01,2029-09-30,Adani Mundra,Western Logistics,B+,5,Yes,Yes,Yes,No`;

function parseStrictIsoOrSlashDate(raw?: string): string | null {
  const s = (raw || '').trim();
  if (!s) return null;

  // YYYY-MM-DD
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
    }
    return null;
  }

  // DD/MM/YYYY
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    }
    return null;
  }

  return null;
}

function parseExplicitBooleanFlag(raw?: string): boolean {
  const val = (raw || '').trim().toLowerCase();
  return ['yes', 'true', '1', 'y', 'verified', 'certified', 'completed'].includes(val);
}

export interface ParsedDriverImportResult {
  created: Driver[];
  skipped: number;
  skippedReasons: Array<{ line: number; reason: string }>;
  error?: string;
}

export function parseDriverImportCsv(
  text: string,
  existingDrivers: Driver[],
  companyContext?: string,
  nowMs: number = Date.now()
): ParsedDriverImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      created: [],
      skipped: 0,
      skippedReasons: [],
      error: 'CSV must contain a header line and at least one data row.'
    };
  }

  const isGlobalAdmin = isGlobalDriverAdminContext(companyContext);
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const created: Driver[] = [];
  const seenDlInFile = new Set<string>();
  const existingDls = new Set(existingDrivers.map((d) => normalizeLicenceNumber(d.licence)));
  const skippedReasons: Array<{ line: number; reason: string }> = [];
  let skipped = 0;

  const todayLocal = new Date(nowMs);
  const todayMidnight = new Date(
    todayLocal.getFullYear(),
    todayLocal.getMonth(),
    todayLocal.getDate()
  ).getTime();

  for (let i = 1; i < lines.length; i++) {
    if (i > 1000) break;
    const values = parseCsvLine(lines[i]);
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      raw[h] = (values[idx] || '').trim();
    });

    const driverName = (raw['Driver Name'] || raw['Name'] || raw['First Name'] || '').trim();
    const phone = (raw['Mobile Number'] || raw['Mobile No.'] || raw['Phone'] || '').replace(/\D/g, '');
    const dob = parseStrictIsoOrSlashDate(
      raw['Date of Birth'] || raw['Date of Birth (dd/mm/yyyy)'] || raw['DOB']
    );
    const licence = normalizeLicenceNumber(
      raw['Licence Number'] || raw['License No.'] || raw['Licence']
    );
    const licenceFrom = parseStrictIsoOrSlashDate(
      raw['Licence Valid From'] || raw['Licence Valid From (dd/mm/yyyy)']
    );
    const licenceTo = parseStrictIsoOrSlashDate(
      raw['Licence Valid To'] || raw['License Valid To (dd/mm/yyyy)']
    );

    if (!driverName || driverName.length < 2 || phone.length !== 10 || !dob) {
      skipped++;
      skippedReasons.push({ line: i + 1, reason: 'Missing or invalid Driver Name, Mobile Number, or DOB' });
      continue;
    }
    const dobMs = new Date(`${dob}T00:00:00`).getTime();
    if (Number.isNaN(dobMs) || dobMs > todayMidnight) {
      skipped++;
      skippedReasons.push({ line: i + 1, reason: 'Invalid or future Date of Birth' });
      continue;
    }

    if (!licence || licence.length < 6 || !licenceFrom || !licenceTo) {
      skipped++;
      skippedReasons.push({ line: i + 1, reason: 'Missing or invalid Licence Number / validity dates' });
      continue;
    }
    if (new Date(`${licenceTo}T00:00:00`).getTime() < new Date(`${licenceFrom}T00:00:00`).getTime()) {
      skipped++;
      skippedReasons.push({ line: i + 1, reason: 'Licence Valid To is earlier than Licence Valid From' });
      continue;
    }

    if (seenDlInFile.has(licence) || existingDls.has(licence)) {
      skipped++;
      skippedReasons.push({ line: i + 1, reason: `Duplicate Licence Number (${licence})` });
      continue;
    }

    const rawCompany = (raw['Company'] || '').trim();
    let resolvedCompany = '';
    if (!isGlobalAdmin && companyContext) {
      if (rawCompany && rawCompany.toLowerCase() !== companyContext.trim().toLowerCase()) {
        skipped++;
        skippedReasons.push({ line: i + 1, reason: `Cross-tenant company "${rawCompany}" blocked` });
        continue;
      }
      resolvedCompany = companyContext.trim();
    } else {
      if (!rawCompany || isGlobalDriverAdminContext(rawCompany)) {
        skipped++;
        skippedReasons.push({ line: i + 1, reason: 'Valid client Company is required' });
        continue;
      }
      resolvedCompany = rawCompany;
    }

    const rawTransporter = (raw['Transporter'] || '').trim();
    const rawBlood = (raw['Blood Group'] || '').trim();
    const resolvedBlood = DRIVER_LOOKUPS.bloodGroups.includes(rawBlood as any)
      ? (rawBlood as Driver['blood'])
      : undefined;

    const expRaw = raw['Experience'] ?? raw['Driving Experience'];
    const parsedExp =
      expRaw !== undefined && expRaw !== '' && Number.isFinite(Number(expRaw)) && Number(expRaw) >= 0
        ? Number(expRaw)
        : undefined;

    // DRIVER-IMPORT-01: Do not fabricate 'HMV' or 'Active' defaults when CSV cells are omitted
    const rawLicenceType = (raw['Licence Type'] || raw['License Type'] || '').trim();
    let resolvedLicenceType: string | undefined;
    if (rawLicenceType) {
      const matchedLicType = DRIVER_LOOKUPS.licenceTypes.find(
        (lt) => lt.toLowerCase() === rawLicenceType.toLowerCase()
      );
      if (!matchedLicType) {
        skipped++;
        skippedReasons.push({ line: i + 1, reason: `Unrecognized Licence Type "${rawLicenceType}"` });
        continue;
      }
      resolvedLicenceType = matchedLicType;
    }

    const rawStatus = (raw['Driver Status'] || raw['Status'] || '').trim();
    let status: Driver['status'] = 'Inactive';
    if (rawStatus) {
      const matchedStatus = DRIVER_LOOKUPS.driverStatuses.find(
        (st) => st.toLowerCase() === rawStatus.toLowerCase()
      );
      if (!matchedStatus) {
        skipped++;
        skippedReasons.push({ line: i + 1, reason: `Unrecognized Driver Status "${rawStatus}"` });
        continue;
      }
      status = matchedStatus;
    }

    // DRIVER-LICENCE-01: Active status requires a compliant non-expired licence
    if (status === 'Active') {
      const licenceCheck = canDriverBeActivated({ licenceTo }, nowMs);
      if (!licenceCheck.allowed) {
        skipped++;
        skippedReasons.push({
          line: i + 1,
          reason: licenceCheck.reason || 'Cannot import Active driver with expired licence'
        });
        continue;
      }
    }

    const parts = driverName.split(/\s+/);
    const first = parts[0] || driverName;
    const last = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

    seenDlInFile.add(licence);
    created.push({
      id: `drv-imp-${nowMs}-${i}`,
      name: driverName,
      first,
      firstName: first,
      last,
      lastName: last,
      phone,
      dob,
      licence,
      ...(resolvedLicenceType ? { licenceType: resolvedLicenceType } : {}),
      licenceFrom,
      licenceTo,
      company: resolvedCompany,
      ...(rawTransporter ? { transporter: rawTransporter } : {}),
      ...(resolvedBlood ? { blood: resolvedBlood } : {}),
      ...(parsedExp !== undefined ? { experience: parsedExp } : {}),
      status,
      rto: parseExplicitBooleanFlag(raw['RTO Certified'] || raw['RTO']),
      police: parseExplicitBooleanFlag(raw['Police Verified'] || raw['Police']),
      training: parseExplicitBooleanFlag(raw['Training Completed'] || raw['Training']),
      rfid: parseExplicitBooleanFlag(raw['RFID Enabled'] || raw['RFID']),
      vendor: parseExplicitBooleanFlag(raw['Vendor Linked'] || raw['Vendor'])
    });
  }

  return { created, skipped, skippedReasons };
}

export const DriverImportDrawer: React.FC<DriverImportDrawerProps> = ({
  isOpen,
  onClose,
  existingDrivers,
  companyContext,
  onImportComplete
}) => {
  const upload = useDirectUploadState(isOpen);

  if (!isOpen) return null;

  const isGlobalAdmin = isGlobalDriverAdminContext(companyContext);

  const buildTemplateCsv = () => {
    if (!isGlobalAdmin && companyContext) {
      const targetComp = companyContext.trim();
      const defaultTransporter =
        DRIVER_LOOKUPS.companyTransporterMap[targetComp]?.[0] || '';
      return `Driver Name,Mobile Number,Date of Birth,Licence Number,Licence Valid From,Licence Valid To,Company,Transporter,Blood Group,Experience,RTO Certified,Police Verified,Training Completed,RFID Enabled
Devendra Sharma,9876501234,1989-05-15,DL0420160012345,2016-01-10,2030-01-09,${targetComp},${defaultTransporter},B+,9,Yes,Yes,Yes,Yes
Gurpreet Singh,9812301234,1986-11-20,PB0220130099887,2013-04-12,2029-04-11,${targetComp},${defaultTransporter},O+,12,Yes,No,Yes,No`;
    }
    return SAMPLE_CSV_CONTENT;
  };

  const handleDownloadTemplate = () => {
    const content = buildTemplateCsv();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Driver_Master_Import_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processCsvText = (text: string, name: string, size?: number) => {
    const result = parseDriverImportCsv(text, existingDrivers, companyContext);
    if (result.error) {
      upload.fail(result.error);
      return;
    }

    const { created, skipped } = result;
    if (created.length === 0) {
      upload.fail(
        'No valid driver rows found (check missing/invalid dates, duplicate licences, expired active rows, or unauthorized company rows).'
      );
      return;
    }

    upload.startUploading(name, formatUploadFileSize(size), () => {
      onImportComplete(created, skipped);
      return {
        headline: 'Drivers uploaded successfully',
        description: `${created.length} driver record${created.length === 1 ? '' : 's'} added from ${name}.${
          skipped > 0
            ? ` ${skipped} duplicate, cross-tenant, or invalid row${skipped === 1 ? '' : 's'} skipped.`
            : ''
        }`,
        stats: [
          { label: 'Uploaded', value: created.length, tone: 'emerald' },
          { label: 'Skipped', value: skipped, tone: skipped > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  const handleFileSelected = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      upload.fail('Please upload a valid .csv spreadsheet file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      upload.fail('File exceeds maximum size limit of 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      processCsvText(String(evt.target?.result || ''), file.name, file.size);
    };
    reader.onerror = () => upload.fail('Unable to read the selected CSV file.');
    reader.readAsText(file);
  };

  const handleUseSample = () => {
    const csv = buildTemplateCsv();
    processCsvText(csv, 'Demo_FleetRobo_Drivers.csv', csv.length);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

      <div className="relative w-[640px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-900">Import Drivers via CSV</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a CSV spreadsheet to import drivers directly into your directory.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <DirectBulkUploadView
            status={upload.status}
            progress={upload.progress}
            fileLabel={upload.fileLabel}
            fileMeta={upload.fileMeta}
            errorMessage={upload.errorMessage}
            doneSummary={upload.doneSummary}
            accept=".csv,text/csv"
            dropTitle="Choose Driver CSV or drag & drop"
            dropSubtitle="UTF-8 CSV up to 5 MB (maximum 1,000 rows per file)"
            chooseButtonLabel="Choose CSV file"
            downloadLabel="Download template"
            sampleLabel="Use sample CSV"
            templateTitle="Need the official Driver CSV schema?"
            templateSubtitle="Download our template or upload sample driver records."
            doneButtonLabel="Return to directory"
            onFileSelected={handleFileSelected}
            onDownloadTemplate={handleDownloadTemplate}
            onUseSample={handleUseSample}
            onReset={upload.reset}
            onDone={onClose}
          />
        </div>
      </div>
    </div>
  );
};
