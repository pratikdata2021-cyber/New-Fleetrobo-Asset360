import React from 'react';
import { X } from 'lucide-react';
import { Vehicle } from '../types/vehicle';
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
}

const SAMPLE_VEHICLES_CSV = `Company,Registration Number,Vehicle Name,Make,Model,Year,Status,TransPorter,Internal ID,VIN
Adani Port,MH14XY9900,Tata Signa 5530,Tata Motors,Signa 5530,2023,Available,Western Logistics,TRK-9900,TATA9900XYZ123
Adani Port,GJ01AB1122,Ashok Leyland 2820,Ashok Leyland,2820,2022,Available,TMS Transporter,TRK-1122,ASHOK1122ABC999
Adani Port,MH12AB1234,Tata Signa 5530 (Updated),Tata Motors,Signa 5530,2024,In Use,Western Logistics,TRK-0019,MA3FJEB1S00654321`;

const CANONICAL_KEYS = [
  'company',
  'registration_number',
  'name',
  'internal_id',
  'vin',
  'make',
  'model',
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
  existingVehicles
}) => {
  const upload = useDirectUploadState(isOpen);

  if (!isOpen) return null;

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

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
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
          (key === 'name' && (lower === 'vehicle name' || lower === 'vehicle'))
        );
      });
      if (matched) columnMap[key] = matched;
    });

    const regCol = columnMap['registration_number'] || headers[1] || headers[0];
    const compCol = columnMap['company'] || headers[0];

    const seenPlates = new Set<string>();
    const newVehicles: Vehicle[] = [];
    let skipped = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const comp = (row[compCol] || 'Adani Port').trim();
      const rawReg = (row[regCol] || '').trim().toUpperCase();
      const cleanReg = rawReg.replace(/[^A-Z0-9]/g, '');

      if (!cleanReg || cleanReg.length < 5 || seenPlates.has(cleanReg)) {
        skipped++;
        continue;
      }
      seenPlates.add(cleanReg);

      const exists = existingVehicles.some(
        (v) =>
          v.company.toLowerCase() === comp.toLowerCase() &&
          v.registration_number.replace(/[^A-Z0-9]/g, '') === cleanReg
      );
      if (exists) {
        skipped++;
        continue;
      }

      const vName =
        row[columnMap['name']] ||
        [row[columnMap['make']], row[columnMap['model']]].filter(Boolean).join(' ') ||
        rawReg;

      newVehicles.push({
        id: `veh-imp-${Date.now()}-${i}`,
        public_id: `VEH-${Math.floor(2000 + Math.random() * 8000)}`,
        company: comp,
        registration_number: rawReg,
        name: vName,
        internal_id: row[columnMap['internal_id']] || `TRK-${cleanReg.slice(-4)}`,
        vin: row[columnMap['vin']] || '',
        make: row[columnMap['make']] || 'Tata Motors',
        model: row[columnMap['model']] || 'Signa 5530',
        year: Number(row[columnMap['year']]) || 2024,
        type: (row[columnMap['type']] as Vehicle['type']) || 'Truck',
        status: (row[columnMap['status']] as Vehicle['status']) || 'Available',
        transporter: row[columnMap['transporter']] || 'Western Logistics',
        vendor: row[columnMap['vendor']] || undefined,
        driver: row[columnMap['driver']] || undefined,
        fleets: row[columnMap['fleet']] ? [row[columnMap['fleet']]] : [],
        odometer: Number(row[columnMap['odometer']]) || 0,
        odometer_unit: (row[columnMap['odometer_unit']] as 'km' | 'mi') || 'km',
        fuel_type: (row[columnMap['fuel_type']] as Vehicle['fuel_type']) || 'Diesel',
        created_at: today,
        updated_at: today
      });
    }

    if (newVehicles.length === 0) {
      upload.fail('No new valid vehicle rows found (all rows were invalid or duplicates).');
      return;
    }

    upload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      try {
        const merged = [...newVehicles, ...existingVehicles];
        localStorage.setItem('fleetrobo_vehicle_master_v3', JSON.stringify(merged));
      } catch {
        // ignore storage quota errors
      }
      onImportComplete(newVehicles.length, 0, skipped);
      return {
        headline: 'Vehicles uploaded successfully',
        description: `${newVehicles.length} vehicle record${newVehicles.length === 1 ? '' : 's'} imported from ${fileName}.${
          skipped > 0 ? ` ${skipped} duplicate or invalid row${skipped === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: newVehicles.length, tone: 'emerald' },
          { label: 'Skipped', value: skipped, tone: skipped > 0 ? 'amber' : 'slate' }
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
    const csvContent =
      'Company,Registration Number,Vehicle Name,Make,Model,Year,Status,TransPorter,Internal ID,VIN\nAdani Port,MH12AA0001,Tata Signa 5530,Tata Motors,Signa 5530,2023,Available,Western Logistics,TRK-001,MA3FJEB1S00000001';
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
    processCsvUpload(SAMPLE_VEHICLES_CSV, 'sample_vehicles.csv', SAMPLE_VEHICLES_CSV.length);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

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
