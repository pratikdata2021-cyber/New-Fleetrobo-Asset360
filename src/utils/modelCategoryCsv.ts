import {
  DeviceFunction,
  MainCategory,
  MEASUREMENT_TYPE_OPTIONS,
  MEASUREMENT_UNIT_OPTIONS,
  ModelCategoryRecord,
  ModelCategoryStatus,
  SENSOR_CONNECTION_MODE_OPTIONS,
  SensorConnectionMode,
  SensorMeasurementType,
  SensorMeasurementUnit,
  SIM_FORM_FACTOR_OPTIONS,
  SIM_SUPPORTED_OPTIONS,
  SIM_TYPE_OPTIONS,
  SimFormFactorChoice,
  SimSupportedChoice,
  SimTypeChoice,
  buildModelDuplicateKey,
  getRecordIdentifierTypes,
  isValidHttpUrl,
  parseStrictPositiveInteger,
  sensorMeasurementNeedsUnit,
} from '../types/modelCategoryMaster';

export const CANONICAL_CSV_HEADERS = [
  'Category',
  'Model Type',
  'Manufacturer / Provider',
  'Model Name / Number',
  'Identifier Types',
  'Device Function',
  'Supported Modes',
  'Supported Protocols',
  'Connectivity Types',
  'SIM Supported',
  'Maximum Camera Channels',
  'Measurement Type',
  'Measurement Unit',
  'Connection Mode',
  'SIM Type',
  'Form Factor',
  'Default Validity (Months)',
  'Description',
  'Documentation URL',
  'Model Status',
] as const;

export const MULTI_VALUE_SEPARATOR = ';';

export function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * RFC-4180 compliant CSV parser supporting UTF-8 BOM, quoted commas,
 * escaped quotes (""), and embedded line breaks inside quoted cells.
 */
export function parseCsvText(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') {
        i += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Drop completely empty trailing lines
  return rows.filter((row) => row.some((cell) => cell.trim().length > 0));
}

function splitMultiValueCell(cell: string): string[] {
  const trimmed = cell.trim();
  if (!trimmed) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  trimmed.split(MULTI_VALUE_SEPARATOR).forEach((part) => {
    const val = part.trim();
    if (!val) return;
    const key = val.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(val);
    }
  });
  return out;
}

function matchChoiceCaseInsensitive<T extends string>(
  raw: string,
  allowed: readonly T[]
): T | undefined {
  const norm = raw.trim().toLowerCase();
  return allowed.find((item) => item.toLowerCase() === norm);
}

export interface CsvImportFieldError {
  field: string;
  message: string;
}

export type CsvRowStatus = 'valid' | 'duplicate' | 'unchanged' | 'invalid';
export type CsvDuplicateDecision = 'update' | 'skip';

export interface ParsedCsvImportRow {
  rowNumber: number; // 1-based CSV file line number (header is 1, first data row is 2)
  rawValues: Record<string, string>;
  status: CsvRowStatus;
  errors: CsvImportFieldError[];
  duplicateDecision: CsvDuplicateDecision;
  matchedExistingId?: string;
  matchedExistingLabel?: string;
  parsedRecord?: Omit<ModelCategoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'supportingDocs'>;
}

export interface CsvImportAnalysis {
  headerError?: string;
  missingHeaders: string[];
  rows: ParsedCsvImportRow[];
  counts: {
    total: number;
    valid: number;
    duplicate: number;
    unchanged: number;
    invalid: number;
  };
}

function arraysEqualNormalized(a?: string[], b?: string[]): boolean {
  const normA = (a || []).map((v) => v.trim()).filter(Boolean);
  const normB = (b || []).map((v) => v.trim()).filter(Boolean);
  if (normA.length !== normB.length) return false;
  return normA.every((v, idx) => v === normB[idx]);
}

function recordsMatchContent(
  existing: ModelCategoryRecord,
  incoming: Omit<ModelCategoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'supportingDocs'>
): boolean {
  if (existing.category !== incoming.category) return false;
  if (existing.typeName.trim() !== incoming.typeName.trim()) return false;
  if (existing.manufacturer.trim() !== incoming.manufacturer.trim()) return false;
  if ((existing.modelReference || '').trim() !== (incoming.modelReference || '').trim()) return false;
  if (!arraysEqualNormalized(getRecordIdentifierTypes(existing), incoming.identifierTypes)) return false;
  if ((existing.description || '').trim() !== (incoming.description || '').trim()) return false;
  if ((existing.documentationUrl || '').trim() !== (incoming.documentationUrl || '').trim()) return false;
  if (existing.status !== incoming.status) return false;

  if (incoming.category === 'Device') {
    const existingModes =
      existing.supportedModes && existing.supportedModes.length > 0
        ? existing.supportedModes
        : existing.deviceMode
        ? [existing.deviceMode]
        : [];
    if ((existing.deviceFunction || '') !== (incoming.deviceFunction || '')) return false;
    if (!arraysEqualNormalized(existingModes, incoming.supportedModes)) return false;
    if (!arraysEqualNormalized(existing.supportedProtocols, incoming.supportedProtocols)) return false;
    if (!arraysEqualNormalized(existing.connectivity, incoming.connectivity)) return false;
    if ((existing.simSupported || 'Unknown') !== (incoming.simSupported || 'Unknown')) return false;
    if ((existing.maxCameraChannels ?? null) !== (incoming.maxCameraChannels ?? null)) return false;
  } else if (incoming.category === 'Sensor') {
    if ((existing.measurementType || '') !== (incoming.measurementType || '')) return false;
    if ((existing.measurementUnit || '') !== (incoming.measurementUnit || '')) return false;
    if ((existing.connectionMode || 'Unknown') !== (incoming.connectionMode || 'Unknown')) return false;
  } else if (incoming.category === 'SIM') {
    if ((existing.simType || '') !== (incoming.simType || '')) return false;
    if ((existing.simFormFactor || '') !== (incoming.simFormFactor || '')) return false;
    if ((existing.validityMonths ?? null) !== (incoming.validityMonths ?? null)) return false;
  }

  return true;
}

export function analyzeModelCategoryCsv(
  csvText: string,
  existingRecords: ModelCategoryRecord[]
): CsvImportAnalysis {
  const matrix = parseCsvText(csvText);
  if (matrix.length === 0) {
    return {
      headerError: 'The uploaded CSV file is empty.',
      missingHeaders: [...CANONICAL_CSV_HEADERS],
      rows: [],
      counts: { total: 0, valid: 0, duplicate: 0, unchanged: 0, invalid: 0 },
    };
  }

  const headerRow = matrix[0].map((h) => h.trim());
  const headerIndexMap = new Map<string, number>();
  headerRow.forEach((h, idx) => {
    headerIndexMap.set(h.toLowerCase(), idx);
  });

  const requiredHeaders = [
    'Category',
    'Model Type',
    'Manufacturer / Provider',
    'Identifier Types',
  ];
  const missingHeaders = requiredHeaders.filter(
    (h) => !headerIndexMap.has(h.toLowerCase())
  );

  if (missingHeaders.length > 0) {
    return {
      headerError: `Missing required CSV column header(s): ${missingHeaders.join(', ')}. Download the template for exact column names.`,
      missingHeaders,
      rows: [],
      counts: { total: 0, valid: 0, duplicate: 0, unchanged: 0, invalid: 0 },
    };
  }

  const existingByKey = new Map<string, ModelCategoryRecord>();
  existingRecords.forEach((rec) => {
    existingByKey.set(buildModelDuplicateKey(rec), rec);
  });

  const seenInCsvKeys = new Map<string, number>();
  const rows: ParsedCsvImportRow[] = [];

  for (let r = 1; r < matrix.length; r += 1) {
    const lineCells = matrix[r];
    const rowNumber = r + 1;
    const rawValues: Record<string, string> = {};

    CANONICAL_CSV_HEADERS.forEach((header) => {
      const idx = headerIndexMap.get(header.toLowerCase());
      rawValues[header] = idx !== undefined && idx < lineCells.length ? lineCells[idx].trim() : '';
    });

    const errors: CsvImportFieldError[] = [];

    // 1. Category
    const categoryMatch = matchChoiceCaseInsensitive(rawValues['Category'], [
      'Device',
      'Sensor',
      'SIM',
    ] as const);
    if (!rawValues['Category']) {
      errors.push({ field: 'Category', message: 'Category is required (Device, Sensor, or SIM).' });
    } else if (!categoryMatch) {
      errors.push({
        field: 'Category',
        message: `Invalid Category "${rawValues['Category']}". Expected Device, Sensor, or SIM.`,
      });
    }

    // 2. Model Type
    const typeName = rawValues['Model Type'];
    if (!typeName) {
      errors.push({ field: 'Model Type', message: 'Model Type is required.' });
    }

    // 3. Manufacturer / Provider
    const manufacturer = rawValues['Manufacturer / Provider'];
    if (!manufacturer) {
      errors.push({
        field: 'Manufacturer / Provider',
        message:
          categoryMatch === 'SIM'
            ? 'Network Operator / Provider is required.'
            : 'Manufacturer / Brand is required.',
      });
    }

    // 4. Model Name / Number
    const modelReference = rawValues['Model Name / Number'];
    if (categoryMatch === 'Device' && !modelReference) {
      errors.push({
        field: 'Model Name / Number',
        message: 'Model Name / Number is required for Device definitions.',
      });
    }

    // 5. Identifier Types
    const identifierTypes = splitMultiValueCell(rawValues['Identifier Types']);
    if (identifierTypes.length === 0) {
      errors.push({
        field: 'Identifier Types',
        message: 'At least one Identifier Type is required (use ; to separate multiple values).',
      });
    }

    // 6. Documentation URL
    const documentationUrl = rawValues['Documentation URL'];
    if (documentationUrl && !isValidHttpUrl(documentationUrl)) {
      errors.push({
        field: 'Documentation URL',
        message: 'Documentation URL must start with http:// or https:// and be valid.',
      });
    }

    // 7. Model Status
    let status: ModelCategoryStatus = 'Active';
    if (rawValues['Model Status']) {
      const matchedStatus = matchChoiceCaseInsensitive(rawValues['Model Status'], [
        'Active',
        'Inactive',
      ] as const);
      if (!matchedStatus) {
        errors.push({
          field: 'Model Status',
          message: `Invalid Model Status "${rawValues['Model Status']}". Expected Active or Inactive.`,
        });
      } else {
        status = matchedStatus;
      }
    }

    // Category-specific validations
    let deviceFunction: DeviceFunction | undefined;
    let supportedModes: string[] | undefined;
    let supportedProtocols: string[] | undefined;
    let connectivity: string[] | undefined;
    let simSupported: SimSupportedChoice | undefined;
    let maxCameraChannels: number | null | undefined;

    let measurementType: SensorMeasurementType | undefined;
    let measurementUnit: SensorMeasurementUnit | undefined;
    let connectionMode: SensorConnectionMode | undefined;

    let simType: SimTypeChoice | undefined;
    let simFormFactor: SimFormFactorChoice | undefined;
    let validityMonths: number | null | undefined;

    if (categoryMatch === 'Device') {
      const fn = rawValues['Device Function'];
      if (!fn) {
        errors.push({
          field: 'Device Function',
          message: 'Device Function is required for Device rows.',
        });
      } else {
        deviceFunction = fn as DeviceFunction;
      }

      const modes = splitMultiValueCell(rawValues['Supported Modes']);
      if (modes.length > 0) supportedModes = modes;

      const protos = splitMultiValueCell(rawValues['Supported Protocols']);
      if (protos.length > 0) supportedProtocols = protos;

      const conns = splitMultiValueCell(rawValues['Connectivity Types']);
      if (conns.length > 0) connectivity = conns;

      if (rawValues['SIM Supported']) {
        const matchedSimSup = matchChoiceCaseInsensitive(
          rawValues['SIM Supported'],
          SIM_SUPPORTED_OPTIONS
        );
        if (!matchedSimSup) {
          errors.push({
            field: 'SIM Supported',
            message: `Invalid SIM Supported "${rawValues['SIM Supported']}". Expected Yes, No, or Unknown.`,
          });
        } else {
          simSupported = matchedSimSup;
        }
      } else {
        simSupported = 'Unknown';
      }

      if (rawValues['Maximum Camera Channels']) {
        const parsedCh = parseStrictPositiveInteger(rawValues['Maximum Camera Channels']);
        if (Number.isNaN(parsedCh)) {
          errors.push({
            field: 'Maximum Camera Channels',
            message: 'Maximum Camera Channels must be a positive whole integer.',
          });
        } else {
          maxCameraChannels = parsedCh;
        }
      } else {
        maxCameraChannels = null;
      }
    } else if (categoryMatch === 'Sensor') {
      if (!rawValues['Measurement Type']) {
        errors.push({
          field: 'Measurement Type',
          message: 'Measurement Type is required for Sensor rows.',
        });
      } else {
        const matchedMeas = matchChoiceCaseInsensitive(
          rawValues['Measurement Type'],
          MEASUREMENT_TYPE_OPTIONS
        );
        if (!matchedMeas) {
          errors.push({
            field: 'Measurement Type',
            message: `Invalid Measurement Type "${rawValues['Measurement Type']}". Allowed: ${MEASUREMENT_TYPE_OPTIONS.join(', ')}.`,
          });
        } else {
          measurementType = matchedMeas;
        }
      }

      if (rawValues['Measurement Unit']) {
        const matchedUnit = matchChoiceCaseInsensitive(
          rawValues['Measurement Unit'],
          MEASUREMENT_UNIT_OPTIONS
        );
        if (!matchedUnit) {
          errors.push({
            field: 'Measurement Unit',
            message: `Invalid Measurement Unit "${rawValues['Measurement Unit']}". Allowed: ${MEASUREMENT_UNIT_OPTIONS.join(', ')}.`,
          });
        } else {
          measurementUnit = matchedUnit;
        }
      } else if (measurementType && sensorMeasurementNeedsUnit(measurementType)) {
        errors.push({
          field: 'Measurement Unit',
          message: `Measurement Unit is required for ${measurementType} sensors.`,
        });
      }

      if (rawValues['Connection Mode']) {
        const matchedConnMode = matchChoiceCaseInsensitive(
          rawValues['Connection Mode'],
          SENSOR_CONNECTION_MODE_OPTIONS
        );
        if (!matchedConnMode) {
          errors.push({
            field: 'Connection Mode',
            message: `Invalid Connection Mode "${rawValues['Connection Mode']}". Allowed: ${SENSOR_CONNECTION_MODE_OPTIONS.join(', ')}.`,
          });
        } else {
          connectionMode = matchedConnMode;
        }
      } else {
        connectionMode = 'Unknown';
      }
    } else if (categoryMatch === 'SIM') {
      if (!rawValues['SIM Type']) {
        errors.push({
          field: 'SIM Type',
          message: 'SIM Type is required for SIM rows.',
        });
      } else {
        const matchedSimType = matchChoiceCaseInsensitive(rawValues['SIM Type'], SIM_TYPE_OPTIONS);
        if (!matchedSimType) {
          errors.push({
            field: 'SIM Type',
            message: `Invalid SIM Type "${rawValues['SIM Type']}". Allowed: ${SIM_TYPE_OPTIONS.join(', ')}.`,
          });
        } else {
          simType = matchedSimType;
        }
      }

      if (rawValues['Form Factor']) {
        const matchedFF = matchChoiceCaseInsensitive(
          rawValues['Form Factor'],
          SIM_FORM_FACTOR_OPTIONS
        );
        if (!matchedFF) {
          errors.push({
            field: 'Form Factor',
            message: `Invalid Form Factor "${rawValues['Form Factor']}". Allowed: ${SIM_FORM_FACTOR_OPTIONS.join(', ')}.`,
          });
        } else {
          simFormFactor = matchedFF;
        }
      }

      if (rawValues['Default Validity (Months)']) {
        const parsedMonths = parseStrictPositiveInteger(rawValues['Default Validity (Months)']);
        if (Number.isNaN(parsedMonths)) {
          errors.push({
            field: 'Default Validity (Months)',
            message: 'Default Validity (Months) must be a positive whole integer (no decimals or text).',
          });
        } else {
          validityMonths = parsedMonths;
        }
      } else {
        validityMonths = null;
      }
    }

    // Intra-file duplicate key check
    const dupKey = categoryMatch
      ? buildModelDuplicateKey({
          category: categoryMatch,
          typeName,
          manufacturer,
          modelReference,
        })
      : '';

    if (dupKey && errors.length === 0) {
      const priorRow = seenInCsvKeys.get(dupKey);
      if (priorRow !== undefined) {
        errors.push({
          field: 'Model Type',
          message: `Duplicate entry within uploaded CSV (already appears on row ${priorRow}).`,
        });
      } else {
        seenInCsvKeys.set(dupKey, rowNumber);
      }
    }

    if (errors.length > 0 || !categoryMatch) {
      rows.push({
        rowNumber,
        rawValues,
        status: 'invalid',
        errors,
        duplicateDecision: 'skip',
      });
      continue;
    }

    const parsedRecord: Omit<
      ModelCategoryRecord,
      'id' | 'createdAt' | 'updatedAt' | 'supportingDocs'
    > = {
      category: categoryMatch as MainCategory,
      typeName,
      manufacturer,
      modelReference,
      identifierType: identifierTypes.join(', '),
      identifierTypes,
      description: rawValues['Description'],
      documentationUrl,
      status,
      deviceFunction,
      deviceMode: supportedModes?.[0],
      supportedModes,
      supportedProtocols,
      connectivity,
      simSupported,
      maxCameraChannels,
      measurementType,
      measurementUnit,
      connectionMode,
      simType,
      simFormFactor,
      validityMonths,
    };

    const existing = existingByKey.get(dupKey);
    if (existing) {
      const isUnchanged = recordsMatchContent(existing, parsedRecord);
      rows.push({
        rowNumber,
        rawValues,
        status: isUnchanged ? 'unchanged' : 'duplicate',
        errors: [],
        duplicateDecision: 'skip',
        matchedExistingId: existing.id,
        matchedExistingLabel: [existing.typeName, existing.manufacturer, existing.modelReference]
          .filter(Boolean)
          .join(' · '),
        parsedRecord,
      });
    } else {
      rows.push({
        rowNumber,
        rawValues,
        status: 'valid',
        errors: [],
        duplicateDecision: 'skip',
        parsedRecord,
      });
    }
  }

  return {
    missingHeaders: [],
    rows,
    counts: {
      total: rows.length,
      valid: rows.filter((r) => r.status === 'valid').length,
      duplicate: rows.filter((r) => r.status === 'duplicate').length,
      unchanged: rows.filter((r) => r.status === 'unchanged').length,
      invalid: rows.filter((r) => r.status === 'invalid').length,
    },
  };
}

export function buildModelCategoryTemplateCsv(): string {
  const sampleRows = [
    [
      'Device',
      'ADAS/DMS Dashcam',
      'MettaX',
      'MC204X',
      'IMEI;Serial Number',
      'Video Telematics',
      'ADAS;DMS',
      'Metta;BSL',
      'Cellular;Wi-Fi',
      'Yes',
      '4',
      '',
      '',
      '',
      '',
      '',
      '',
      'Dual-lens AI dashcam with optional rear camera channels.',
      'https://docs.mettax.example/mc204x',
      'Active',
    ],
    [
      'Sensor',
      'Temperature Sensor',
      'Teltonika',
      'EYE-SENSOR-PRO',
      'Sensor ID;BLE MAC',
      '',
      '',
      '',
      '',
      '',
      '',
      'Temperature',
      '°C',
      'Gateway-connected',
      '',
      '',
      '',
      'Cold-chain BLE temperature sensor.',
      '',
      'Active',
    ],
    [
      'SIM',
      'M2M SIM',
      'Airtel',
      '',
      'ICCID;IMSI',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'M2M',
      'Physical SIM',
      '24',
      'Industrial M2M SIM card for telematics gateways.',
      'https://airtel.in/business/iot',
      'Active',
    ],
  ];

  const lines = [
    CANONICAL_CSV_HEADERS.map(escapeCsvCell).join(','),
    ...sampleRows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

export function buildImportErrorReportCsv(rows: ParsedCsvImportRow[]): string {
  const invalidRows = rows.filter((r) => r.status === 'invalid');
  const headers = ['Row Number', 'Errors', ...CANONICAL_CSV_HEADERS];
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...invalidRows.map((row) => {
      const errorText = row.errors.map((e) => `${e.field}: ${e.message}`).join(' | ');
      return [
        row.rowNumber,
        errorText,
        ...CANONICAL_CSV_HEADERS.map((h) => row.rawValues[h] || ''),
      ]
        .map(escapeCsvCell)
        .join(',');
    }),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

export function formatCategoryDetailSummary(rec: ModelCategoryRecord): string {
  if (rec.category === 'Device') {
    const modeSummary =
      rec.supportedModes && rec.supportedModes.length > 0
        ? rec.supportedModes.join(', ')
        : rec.deviceMode;
    const parts = [rec.deviceFunction, modeSummary].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : '';
  }
  if (rec.category === 'Sensor') {
    const parts = [rec.measurementType, rec.measurementUnit].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : '';
  }
  if (rec.category === 'SIM') {
    const parts = [rec.simType, rec.simFormFactor].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : '';
  }
  return '';
}

export function getRecordValueForColumnKey(rec: ModelCategoryRecord, key: string): string {
  switch (key) {
    case 'category':
      return rec.category || '';
    case 'typeName':
      return rec.typeName || '';
    case 'manufacturer':
      return rec.manufacturer || '';
    case 'modelReference':
      return rec.modelReference || '';
    case 'identifierType':
      return getRecordIdentifierTypes(rec).join(MULTI_VALUE_SEPARATOR);
    case 'categoryDetail':
      return formatCategoryDetailSummary(rec);
    case 'supportingDocs':
      return rec.supportingDocs.map((d) => d.name).join(MULTI_VALUE_SEPARATOR);
    case 'status':
      return rec.status || 'Active';
    case 'updatedAt':
      return rec.updatedAt ? new Date(rec.updatedAt).toLocaleDateString() : '';
    case 'createdAt':
      return rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : '';
    case 'deviceFunction':
      return rec.category === 'Device' ? rec.deviceFunction || '' : '';
    case 'supportedModes': {
      if (rec.category !== 'Device') return '';
      const modes =
        rec.supportedModes && rec.supportedModes.length > 0
          ? rec.supportedModes
          : rec.deviceMode
          ? [rec.deviceMode]
          : [];
      return modes.join(MULTI_VALUE_SEPARATOR);
    }
    case 'supportedProtocols':
      return rec.category === 'Device'
        ? (rec.supportedProtocols || []).join(MULTI_VALUE_SEPARATOR)
        : '';
    case 'connectivity':
      return rec.category === 'Device'
        ? (rec.connectivity || []).join(MULTI_VALUE_SEPARATOR)
        : '';
    case 'simSupported':
      return rec.category === 'Device' ? rec.simSupported || 'Unknown' : '';
    case 'maxCameraChannels':
      return rec.category === 'Device' && rec.maxCameraChannels != null
        ? String(rec.maxCameraChannels)
        : '';
    case 'measurementType':
      return rec.category === 'Sensor' ? rec.measurementType || '' : '';
    case 'measurementUnit':
      return rec.category === 'Sensor' ? rec.measurementUnit || '' : '';
    case 'connectionMode':
      return rec.category === 'Sensor' ? rec.connectionMode || '' : '';
    case 'simType':
      return rec.category === 'SIM' ? rec.simType || '' : '';
    case 'simFormFactor':
      return rec.category === 'SIM' ? rec.simFormFactor || '' : '';
    case 'validityMonths':
      return rec.category === 'SIM' && rec.validityMonths != null
        ? String(rec.validityMonths)
        : '';
    case 'description':
      return rec.description || '';
    case 'documentationUrl':
      return rec.documentationUrl || '';
    default:
      return '';
  }
}

export function exportFullCanonicalCsv(records: ModelCategoryRecord[]): string {
  const fieldKeyByCanonicalHeader: Record<(typeof CANONICAL_CSV_HEADERS)[number], string> = {
    Category: 'category',
    'Model Type': 'typeName',
    'Manufacturer / Provider': 'manufacturer',
    'Model Name / Number': 'modelReference',
    'Identifier Types': 'identifierType',
    'Device Function': 'deviceFunction',
    'Supported Modes': 'supportedModes',
    'Supported Protocols': 'supportedProtocols',
    'Connectivity Types': 'connectivity',
    'SIM Supported': 'simSupported',
    'Maximum Camera Channels': 'maxCameraChannels',
    'Measurement Type': 'measurementType',
    'Measurement Unit': 'measurementUnit',
    'Connection Mode': 'connectionMode',
    'SIM Type': 'simType',
    'Form Factor': 'simFormFactor',
    'Default Validity (Months)': 'validityMonths',
    Description: 'description',
    'Documentation URL': 'documentationUrl',
    'Model Status': 'status',
  };

  const lines = [
    CANONICAL_CSV_HEADERS.map(escapeCsvCell).join(','),
    ...records.map((rec) =>
      CANONICAL_CSV_HEADERS.map((h) =>
        escapeCsvCell(getRecordValueForColumnKey(rec, fieldKeyByCanonicalHeader[h]))
      ).join(',')
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

export function exportVisibleColumnsCsv(
  records: ModelCategoryRecord[],
  visibleColumns: { key: string; label: string }[]
): string {
  const lines = [
    visibleColumns.map((c) => escapeCsvCell(c.label)).join(','),
    ...records.map((rec) =>
      visibleColumns.map((c) => escapeCsvCell(getRecordValueForColumnKey(rec, c.key))).join(',')
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

export function triggerCsvDownload(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
