import React from 'react';
import { X } from 'lucide-react';
import { Driver } from '../types/driver';
import {
  DirectBulkUploadView,
  formatUploadFileSize,
  useDirectUploadState
} from './common/DirectBulkUploadView';

interface DriverImportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  existingDrivers: Driver[];
  onImportComplete: (createdDrivers: Driver[], skippedCount: number) => void;
}

const SAMPLE_CSV_CONTENT = `Driver Name,Mobile Number,Date of Birth,Licence Number,Licence Valid From,Licence Valid To,Company,Transporter,Blood Group,Experience
Devendra Sharma,9876501234,1989-05-15,DL0420160012345,2016-01-10,2030-01-09,Adani Pvt Ltd,Western Logistics,B+,9
Gurpreet Singh,9812301234,1986-11-20,PB0220130099887,2013-04-12,2029-04-11,Adani Pvt Ltd,TMS Transporter,O+,12
Mohan Lal Verma,9765401234,1993-02-28,RJ1420170054321,2017-08-15,2027-08-14,Binary Semantics Ltd,Binary Logistics,A+,7
Kalyan Rao,9845101234,1984-09-10,KA0120080033445,2008-03-20,2028-03-19,Adani Pvt Ltd,Western Logistics,AB+,16
Ajay Kumar,9934501234,1995-12-05,UP3220190077889,2019-10-01,2029-09-30,Adani Pvt Ltd,Western Logistics,B+,5`;

export const DriverImportDrawer: React.FC<DriverImportDrawerProps> = ({
  isOpen,
  onClose,
  existingDrivers,
  onImportComplete
}) => {
  const upload = useDirectUploadState(isOpen);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
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
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      upload.fail('CSV must contain a header line and at least one data row.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const created: Driver[] = [];
    const seenDlInFile = new Set<string>();
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      if (i > 1000) break;
      const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
      const raw: Record<string, string> = {};
      headers.forEach((h, idx) => {
        raw[h] = values[idx] || '';
      });

      const driverName = raw['Driver Name'] || raw['Name'] || raw['First Name'] || '';
      const phone = (raw['Mobile Number'] || raw['Mobile No.'] || raw['Phone'] || '').replace(/\D/g, '');
      const dob = raw['Date of Birth'] || raw['Date of Birth (dd/mm/yyyy)'] || raw['DOB'] || '';
      const licence = (raw['Licence Number'] || raw['License No.'] || raw['Licence'] || '').toUpperCase();
      const licenceFrom = raw['Licence Valid From'] || raw['Licence Valid From (dd/mm/yyyy)'] || '2020-01-01';
      const licenceTo = raw['Licence Valid To'] || raw['License Valid To (dd/mm/yyyy)'] || '2030-01-01';
      const company = raw['Company'] || 'Adani Pvt Ltd';
      const transporter = raw['Transporter'] || 'Western Logistics';
      const blood = (raw['Blood Group'] || 'B+') as Driver['blood'];
      const experience = Number(raw['Experience'] || raw['Driving Experience']) || 5;

      const isDuplicate =
        !licence ||
        seenDlInFile.has(licence) ||
        existingDrivers.some((d) => d.licence.toLowerCase() === licence.toLowerCase());

      if (!driverName || driverName.length < 2 || phone.length !== 10 || !dob || isDuplicate) {
        skipped++;
        continue;
      }

      seenDlInFile.add(licence);
      created.push({
        id: `drv-imp-${Date.now()}-${i}`,
        name: driverName,
        phone,
        dob,
        licence,
        licenceFrom,
        licenceTo,
        company,
        transporter,
        blood,
        experience,
        status: 'Active',
        rto: true,
        police: true,
        training: true,
        rfid: true
      });
    }

    if (created.length === 0) {
      upload.fail('No new valid driver rows found (missing required fields or duplicate licences).');
      return;
    }

    upload.startUploading(name, formatUploadFileSize(size), () => {
      onImportComplete(created, skipped);
      return {
        headline: 'Drivers uploaded successfully',
        description: `${created.length} driver record${created.length === 1 ? '' : 's'} added from ${name}.${
          skipped > 0 ? ` ${skipped} duplicate or invalid row${skipped === 1 ? '' : 's'} skipped.` : ''
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
    processCsvText(SAMPLE_CSV_CONTENT, 'Demo_FleetRobo_Drivers.csv', SAMPLE_CSV_CONTENT.length);
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
