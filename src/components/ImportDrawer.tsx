import React from 'react';
import { X } from 'lucide-react';
import {
  Vehicle,
  DEMO_LOOKUPS,
  formatModelCatalogLabel,
  getVehicleOwningCompany,
  normalizeRegistrationNumber,
  saveVehicleMasterStore,
  syncVehicleOperationalActiveState,
  validateVehicleCandidate
} from '../types/vehicle';
import { loadVehicleModelStore } from '../types/vehicleModelMaster';
import { parseCsvLine } from '../types/modalMaster';
import {
  DirectBulkUploadView,
  formatUploadFileSize,
  useDirectUploadState
} from './common/DirectBulkUploadView';

interface ImportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (createdCount: number, updatedCount: number, skippedCount: number) => void;
  existingVehicles: Vehicle[];
  companyContext?: string;
}

const SAMPLE_VEHICLES_CSV = `Company,Registration Number,Vehicle Name,Make,Model,Year,Status,TransPorter,Internal ID,VIN
Adani Port,MH14XY9900,Tata Signa 5530,Tata Motors,Signa 5530,2023,Available,Western Logistics,TRK-9900,TATA9900XYZ123
Adani Port,GJ01AB1122,Ashok Leyland 2820,Ashok Leyland,2820,2022,Available,TMS Transporter,TRK-1122,ASHOK1122ABC999
Adani Port,MH12AB1234,Tata Signa 5530 (Duplicate),Tata Motors,Signa 5530,2024,In Use,Western Logistics,TRK-0019,MA3FJEB1S00654321`;

const CANONICAL_KEYS = [
  'company',
  'registration_number',
  'name',
  'internal_id',
  'vin',
  'chassis_number',
  'make',
  'model',
  'machine_model',
  'vehicle_model_id',
  'year',
  'type',
  'status',
  'transporter',
  'vendor',
  'driver',
  'fleet',
  'odometer',
  'odometer_unit',
  'fuel_type'
] as const;

export const ImportDrawer: React.FC<ImportDrawerProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingVehicles,
  companyContext
}) => {
  const upload = useDirectUploadState(isOpen);

  if (!isOpen) return null;

  const isTenantScoped =
    Boolean(companyContext) &&
    companyContext !== 'All Clients' &&
    companyContext !== 'Platform Admin' &&
    companyContext !== 'Binary';

  const processCsvUpload = (text: string, fileName: string, fileSize?: number) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      upload.fail('CSV must contain a header row and at least one data row.');
      return;
    }
    if (lines.length > 1001) {
      upload.fail('Maximum 1,000 vehicle rows are allowed per upload.');
      return;
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ''));
    const columnMap: Record<string, string> = {};
    CANONICAL_KEYS.forEach((key) => {
      const matched = headers.find((h) => {
        const lower = h.toLowerCase();
        const normH = lower.replace(/[^a-z0-9]/g, '');
        const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          lower === key.toLowerCase() ||
          normH === normKey ||
          (key === 'registration_number' &&
            (lower.includes('plate') || lower.includes('registration'))) ||
          (key === 'name' && (lower === 'vehicle name' || lower === 'vehicle')) ||
          (key === 'vin' && lower.includes('chassis'))
        );
      });
      if (matched) columnMap[key] = matched;
    });

    const regCol = columnMap['registration_number'] || headers[1] || headers[0];
    const compCol = columnMap['company'] || headers[0];

    const modelCatalog = loadVehicleModelStore();
    const seenKeys = new Set<string>();
    const newVehicles: Vehicle[] = [];
    const skipReasons: string[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]).map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const rawComp = (row[compCol] || '').trim();
      const comp = rawComp || (isTenantScoped ? companyContext! : 'Adani Port');

      if (isTenantScoped && comp.toLowerCase() !== companyContext!.trim().toLowerCase()) {
        skipReasons.push(`Row ${i}: Company "${comp}" outside current tenant "${companyContext}"`);
        continue;
      }

      const rawReg = (row[regCol] || '').trim().toUpperCase();
      const cleanReg = normalizeRegistrationNumber(rawReg);
      const dedupeKey = `${comp.toLowerCase()}::${cleanReg}`;

      if (cleanReg && seenKeys.has(dedupeKey)) {
        skipReasons.push(`Row ${i} (${rawReg}): Duplicate registration number within CSV`);
        continue;
      }

      const rawModel = (
        row[columnMap['machine_model']] ||
        row[columnMap['model']] ||
        ''
      ).trim();
      const rawModelId = (row[columnMap['vehicle_model_id']] || '').trim();
      const rawMake = (row[columnMap['make']] || '').trim();
      const combinedModelHint =
        rawMake && rawModel && !rawModel.toLowerCase().includes(rawMake.toLowerCase())
          ? `${rawMake} ${rawModel}`
          : rawModel;

      const rawStatus = (row[columnMap['status']] || 'Available').trim();
      const rawChassis = (
        row[columnMap['chassis_number']] ||
        row[columnMap['vin']] ||
        ''
      ).trim().toUpperCase();

      const validation = validateVehicleCandidate(
        {
          mode: 'import',
          company: comp,
          registration_number: rawReg,
          vehicle_model_id: rawModelId || undefined,
          machine_model: combinedModelHint || rawModel,
          chassis_number: rawChassis,
          vin: rawChassis,
          status: rawStatus
        },
        [...existingVehicles, ...newVehicles],
        modelCatalog
      );

      if (!validation.valid) {
        const firstErr = Object.values(validation.errors)[0] || 'Invalid row data';
        skipReasons.push(`Row ${i}${rawReg ? ` (${rawReg})` : ''}: ${firstErr}`);
        continue;
      }

      const yearRaw = (row[columnMap['year']] || '').trim();
      const parsedYear = yearRaw ? Number(yearRaw) : undefined;
      if (
        yearRaw &&
        (parsedYear === undefined ||
          Number.isNaN(parsedYear) ||
          !Number.isInteger(parsedYear) ||
          parsedYear < 1900 ||
          parsedYear > 2100)
      ) {
        skipReasons.push(`Row ${i} (${rawReg}): Year must be an integer between 1900 and 2100`);
        continue;
      }

      seenKeys.add(dedupeKey);

      const resolvedModel = validation.resolvedModel;
      const machineModelDisplay = resolvedModel
        ? formatModelCatalogLabel(resolvedModel)
        : combinedModelHint || rawModel;
      const modelNameDisplay = resolvedModel?.modelName || rawModel || machineModelDisplay;
      const makeDisplay = resolvedModel?.manufacturer || rawMake;
      const operationalStatus = rawStatus as Vehicle['status'];
      const syncedActive = syncVehicleOperationalActiveState(operationalStatus);

      const vName =
        (row[columnMap['name']] || '').trim() ||
        [makeDisplay, modelNameDisplay].filter(Boolean).join(' ') ||
        rawReg;

      const existingMatch = existingVehicles.find(
        (v) =>
          getVehicleOwningCompany(v).toLowerCase() === comp.toLowerCase() &&
          normalizeRegistrationNumber(v.registration_number) === cleanReg
      );
      if (existingMatch) {
        skipReasons.push(`Row ${i} (${rawReg}): Duplicate already exists in ${comp}`);
        continue;
      }

      newVehicles.push({
        id: `veh-imp-${Date.now()}-${i}`,
        public_id: `VH-${Math.floor(200000 + Math.random() * 800000)}`,
        company: comp,
        client: comp,
        registration_number: rawReg,
        name: vName,
        internal_id: (row[columnMap['internal_id']] || '').trim() || undefined,
        vin: rawChassis || undefined,
        chassis_number: rawChassis || undefined,
        make: makeDisplay || undefined,
        model: modelNameDisplay,
        machine_model: machineModelDisplay,
        vehicle_model_id: resolvedModel?.id,
        vehicle_segment: resolvedModel?.vehicleSegment,
        year: parsedYear,
        type:
          (row[columnMap['type']] as Vehicle['type']) ||
          resolvedModel?.vehicleType ||
          'Truck',
        status: operationalStatus,
        active_status: syncedActive,
        transporter: (row[columnMap['transporter']] || '').trim() || undefined,
        vendor: (row[columnMap['vendor']] || '').trim() || undefined,
        driver: (row[columnMap['driver']] || '').trim() || undefined,
        fleets: row[columnMap['fleet']] ? [row[columnMap['fleet']].trim()] : [],
        odometer: row[columnMap['odometer']] ? Number(row[columnMap['odometer']]) || 0 : undefined,
        odometer_unit:
          (row[columnMap['odometer_unit']] as 'km' | 'mi') ||
          (row[columnMap['odometer']] ? 'km' : undefined),
        fuel_type: (row[columnMap['fuel_type']] as Vehicle['fuel_type']) || 'Diesel',
        created_at: today,
        updated_at: today
      });
    }

    if (newVehicles.length === 0) {
      const reasonPreview =
        skipReasons.length > 0
          ? ` Reasons: ${skipReasons.slice(0, 3).join('; ')}${
              skipReasons.length > 3 ? ` (+${skipReasons.length - 3} more)` : ''
            }`
          : '';
      upload.fail(`No new valid vehicle rows found.${reasonPreview}`);
      return;
    }

    upload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      const merged = [...newVehicles, ...existingVehicles];
      saveVehicleMasterStore(merged);
      onImportComplete(newVehicles.length, 0, skipReasons.length);
      const skipNote =
        skipReasons.length > 0
          ? ` ${skipReasons.length} row${skipReasons.length === 1 ? '' : 's'} skipped (${skipReasons
              .slice(0, 2)
              .join('; ')}${skipReasons.length > 2 ? '…' : ''}).`
          : '';
      return {
        headline: 'Vehicles uploaded successfully',
        description: `${newVehicles.length} vehicle record${
          newVehicles.length === 1 ? '' : 's'
        } imported from ${fileName}.${skipNote}`,
        stats: [
          { label: 'Uploaded', value: newVehicles.length, tone: 'emerald' },
          {
            label: 'Skipped',
            value: skipReasons.length,
            tone: skipReasons.length > 0 ? 'amber' : 'slate'
          }
        ]
      };
    });
  };

  const handleFileSelected = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv') && selectedFile.type !== 'text/csv') {
      upload.fail('Please upload a valid .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      processCsvUpload(text, selectedFile.name, selectedFile.size);
    };
    reader.onerror = () => upload.fail('Unable to read the selected CSV file.');
    reader.readAsText(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const sampleCompany = isTenantScoped ? companyContext : 'Adani Port';
    const csvContent = `Company,Registration Number,Vehicle Name,Make,Model,Year,Status,TransPorter,Internal ID,VIN\n${sampleCompany},MH12AA0001,Tata Signa 5530,Tata Motors,Signa 5530,2023,Available,${DEMO_LOOKUPS.transporters[0]},TRK-001,MA3FJEB1S00000001`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fleetrobo_vehicle_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUseSample = () => {
    const sampleCsv = isTenantScoped
      ? SAMPLE_VEHICLES_CSV.replace(/^Adani Port,/gm, `${companyContext},`)
      : SAMPLE_VEHICLES_CSV;
    processCsvUpload(sampleCsv, 'sample_vehicles.csv', sampleCsv.length);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-[640px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-900">Import Vehicles via CSV</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a CSV file to add vehicles directly to your directory.
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
            dropTitle="Choose CSV or drag & drop"
            dropSubtitle="Maximum 1,000 vehicle records per import file"
            chooseButtonLabel="Choose CSV file"
            downloadLabel="Download template"
            sampleLabel="Use sample CSV"
            templateTitle="Need a starting format?"
            templateSubtitle="Download canonical CSV header template or upload sample vehicles."
            doneButtonLabel="Done"
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
