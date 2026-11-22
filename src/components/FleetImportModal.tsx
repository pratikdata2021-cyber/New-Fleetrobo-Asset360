import React from 'react';
import { Upload, X } from 'lucide-react';
import { Fleet } from '../types/fleet';
import {
  DirectBulkUploadView,
  formatUploadFileSize,
  useDirectUploadState
} from './common/DirectBulkUploadView';

interface FleetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingFleets: Fleet[];
  onImportComplete: (createdFleets: Fleet[]) => void;
}

const DEMO_FLEETS_CSV = `fleet_name,status,parent_fleet
Chennai Terminal Transit,active,
Adani Mundra Operations,active,
Mundra Gate Logistics,scaling,
Pune Express Cargo,active,`;

export const FleetImportModal: React.FC<FleetImportModalProps> = ({
  isOpen,
  onClose,
  existingFleets,
  onImportComplete
}) => {
  const upload = useDirectUploadState(isOpen);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const templateContent = 'fleet_name\r\nAdani Mundra Cargo Hub\r\nHazira Fertilizer Depot';
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'FleetRobo_Fleet_Import_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processCsvText = (name: string, text: string, size?: number) => {
    const lines = text
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      upload.fail('CSV file is empty or missing data rows.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
    const colIndex = Math.max(
      0,
      headers.findIndex((h) => {
        const lower = h.toLowerCase();
        return lower === 'fleet_name' || lower === 'fleet' || lower === 'name';
      })
    );

    const existingNames = new Set(existingFleets.map((f) => f.name.toLowerCase().trim()));
    const seenInFile = new Set<string>();
    const validNames: string[] = [];
    let skipped = 0;

    lines.slice(1).forEach((line) => {
      const cells = line.split(',').map((cell) => cell.replace(/^["']|["']$/g, '').trim());
      const rawName = (cells[colIndex] || '').trim();
      const lower = rawName.toLowerCase();
      if (!rawName || rawName.length > 191 || existingNames.has(lower) || seenInFile.has(lower)) {
        skipped++;
        return;
      }
      seenInFile.add(lower);
      validNames.push(rawName);
    });

    if (validNames.length === 0) {
      upload.fail('No new valid fleet names found (all rows were empty or duplicates).');
      return;
    }

    upload.startUploading(name, formatUploadFileSize(size), () => {
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const newFleets: Fleet[] = validNames.map((fleetName, idx) => ({
        id: `flt-imp-${Date.now()}-${idx}`,
        public_id: `FLT-${Math.floor(2000 + Math.random() * 8000)}`,
        name: fleetName,
        company: 'Adani Port',
        parent: '',
        service_area: '',
        zone: '',
        vendor: '',
        status: 'active',
        task: '',
        driverIds: [],
        vehicleIds: [],
        driverVehicleAssignments: {},
        created_at: nowStr,
        updated_at: nowStr
      }));

      onImportComplete(newFleets);
      return {
        headline: 'Fleets uploaded successfully',
        description: `${newFleets.length} fleet group${newFleets.length === 1 ? '' : 's'} created from ${name}.${
          skipped > 0 ? ` ${skipped} duplicate or invalid row${skipped === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: newFleets.length, tone: 'emerald' },
          { label: 'Skipped', value: skipped, tone: skipped > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  const handleFileSelected = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      upload.fail('Only CSV files are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      processCsvText(file.name, String(event.target?.result || ''), file.size);
    };
    reader.onerror = () => upload.fail('Unable to read the selected CSV file.');
    reader.readAsText(file);
  };

  const handleUseDemoFile = () => {
    processCsvText('demo_fleets_sample.csv', DEMO_FLEETS_CSV, DEMO_FLEETS_CSV.length);
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[85vh] font-sans text-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FA8A63] flex items-center justify-center font-bold">
              <Upload size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import Fleets via CSV</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload a CSV file to create fleets directly in your workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <DirectBulkUploadView
            status={upload.status}
            progress={upload.progress}
            fileLabel={upload.fileLabel}
            fileMeta={upload.fileMeta}
            errorMessage={upload.errorMessage}
            doneSummary={upload.doneSummary}
            accept=".csv,text/csv"
            dropTitle="Choose CSV or drag & drop"
            dropSubtitle="Headers supported: fleet_name, fleet, or name"
            chooseButtonLabel="Choose CSV file"
            downloadLabel="Download template"
            sampleLabel="Use demo CSV"
            templateTitle="Need a starter template?"
            templateSubtitle="Download header template or upload sample fleets."
            doneButtonLabel="Done"
            onFileSelected={handleFileSelected}
            onDownloadTemplate={handleDownloadTemplate}
            onUseSample={handleUseDemoFile}
            onReset={upload.reset}
            onDone={onClose}
          />
        </div>
      </div>
    </div>
  );
};
