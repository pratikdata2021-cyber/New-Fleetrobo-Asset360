import { ModelCategoryRecord } from '../types/modelCategoryMaster';
import { loadModalMasterStore } from '../types/modalMaster';
import {
  ClientCompany,
  INITIAL_COMPANY_IN_USE_MAP,
  InUseDetail,
  loadClientCompanies,
  loadCompanyInUseMap,
  loadCompanyModelAccessMap,
} from '../types/companyModelEnablement';

export interface ModelReferenceSummary {
  modelId: string;
  devicesCount: number;
  sensorsCount: number;
  simsCount: number;
  mappingsCount: number;
  enabledCompaniesCount: number;
  enabledCompanyNames: string[];
  inUseTrackedCount: number;
  totalReferences: number;
  isReferenced: boolean;
  shortReason: string;
  summaryLines: string[];
  hasKnownData: boolean;
}

export function getModelCategoryReferences(
  model: ModelCategoryRecord
): ModelReferenceSummary {
  let devicesCount = 0;
  let sensorsCount = 0;
  let simsCount = 0;
  let mappingsCount = 0;
  let enabledCompanyNames: string[] = [];
  let inUseTrackedCount = 0;
  let hasKnownData = true;

  try {
    const store = loadModalMasterStore();
    const modelId = model.id;
    const normRef = (model.modelReference || '').trim().toLowerCase();
    const normMfg = (model.manufacturer || '').trim().toLowerCase();
    const normType = (model.typeName || '').trim().toLowerCase();

    const matchedDeviceIds = new Set<string>();
    const matchedSensorIds = new Set<string>();
    const matchedSimIds = new Set<string>();

    (store.devices || []).forEach((d) => {
      const idMatch = d.modelTypeId === modelId;
      const legacyMatch =
        !d.modelTypeId &&
        model.category === 'Device' &&
        Boolean(normRef) &&
        (d.modelText || '').trim().toLowerCase() === normRef &&
        (!normMfg || (d.manufacturer || '').trim().toLowerCase() === normMfg);
      if (idMatch || legacyMatch) {
        devicesCount += 1;
        matchedDeviceIds.add(d.id);
      }
    });

    (store.sensors || []).forEach((s) => {
      const idMatch = s.modelTypeId === modelId;
      const legacyMatch =
        !s.modelTypeId &&
        model.category === 'Sensor' &&
        (s.category || '').trim().toLowerCase() === normType &&
        (!normMfg || (s.manufacturer || '').trim().toLowerCase() === normMfg);
      if (idMatch || legacyMatch) {
        sensorsCount += 1;
        matchedSensorIds.add(s.id);
      }
    });

    (store.sims || []).forEach((sim) => {
      const idMatch = sim.modelTypeId === modelId;
      const legacyMatch =
        !sim.modelTypeId &&
        model.category === 'SIM' &&
        (sim.category || '').trim().toLowerCase() === normType &&
        (!normMfg || (sim.operator || '').trim().toLowerCase() === normMfg);
      if (idMatch || legacyMatch) {
        simsCount += 1;
        matchedSimIds.add(sim.id);
      }
    });

    (store.connections || []).forEach((conn) => {
      const memberRef = (conn.members || []).some(
        (m) =>
          m.modelTypeId === modelId ||
          matchedDeviceIds.has(m.hardwareId) ||
          matchedSensorIds.has(m.hardwareId) ||
          matchedSimIds.has(m.hardwareId)
      );
      const compatRef =
        (conn.hardwareId &&
          (matchedDeviceIds.has(conn.hardwareId) || matchedSensorIds.has(conn.hardwareId))) ||
        (conn.parentId && matchedDeviceIds.has(conn.parentId)) ||
        (conn.simId && matchedSimIds.has(conn.simId));
      if (memberRef || compatRef) {
        mappingsCount += 1;
      }
    });

    const companies = loadClientCompanies();
    const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
    const accessMap = loadCompanyModelAccessMap();
    const inUseMap = loadCompanyInUseMap();

    const enabledSet = new Set<string>();
    Object.entries(accessMap).forEach(([companyId, modelFlags]) => {
      if (modelFlags && modelFlags[modelId]) {
        const comp = companies.find((c) => c.id === companyId);
        if (!comp?.isPlatformOwner) {
          enabledSet.add(companyNameById.get(companyId) || companyId);
        }
      }
    });
    enabledCompanyNames = Array.from(enabledSet);

    Object.values(inUseMap).forEach((companyUsage) => {
      const count = companyUsage?.[modelId];
      if (typeof count === 'number' && count > 0) {
        inUseTrackedCount += count;
      }
    });
  } catch {
    hasKnownData = false;
  }

  const enabledCompaniesCount = enabledCompanyNames.length;
  const totalReferences =
    devicesCount +
    sensorsCount +
    simsCount +
    mappingsCount +
    enabledCompaniesCount +
    inUseTrackedCount;

  const summaryLines: string[] = [];
  if (devicesCount > 0) {
    summaryLines.push(`${devicesCount} registered Device record${devicesCount === 1 ? '' : 's'}`);
  }
  if (sensorsCount > 0) {
    summaryLines.push(`${sensorsCount} registered Sensor record${sensorsCount === 1 ? '' : 's'}`);
  }
  if (simsCount > 0) {
    summaryLines.push(`${simsCount} registered SIM record${simsCount === 1 ? '' : 's'}`);
  }
  if (mappingsCount > 0) {
    summaryLines.push(`${mappingsCount} Asset Mapping connection${mappingsCount === 1 ? '' : 's'}`);
  }
  if (enabledCompaniesCount > 0) {
    summaryLines.push(
      `Enabled for ${enabledCompaniesCount} client ${enabledCompaniesCount === 1 ? 'company' : 'companies'} (${enabledCompanyNames.slice(0, 3).join(', ')}${enabledCompaniesCount > 3 ? ` +${enabledCompaniesCount - 3} more` : ''})`
    );
  }
  if (inUseTrackedCount > 0 && devicesCount + sensorsCount + simsCount === 0) {
    summaryLines.push(`${inUseTrackedCount} active client-tracked unit${inUseTrackedCount === 1 ? '' : 's'}`);
  }

  const shortParts: string[] = [];
  const inventoryTotal = devicesCount + sensorsCount + simsCount;
  if (inventoryTotal > 0) shortParts.push(`${inventoryTotal} asset${inventoryTotal === 1 ? '' : 's'}`);
  if (mappingsCount > 0) shortParts.push(`${mappingsCount} mapping${mappingsCount === 1 ? '' : 's'}`);
  if (enabledCompaniesCount > 0) {
    shortParts.push(`${enabledCompaniesCount} ${enabledCompaniesCount === 1 ? 'company' : 'companies'}`);
  }
  if (shortParts.length === 0 && inUseTrackedCount > 0) {
    shortParts.push(`${inUseTrackedCount} in-use`);
  }

  const isReferenced = totalReferences > 0;
  const shortReason = isReferenced
    ? `In use (${shortParts.join(', ')}) — deactivate instead`
    : 'Unreferenced — safe to delete';

  return {
    modelId: model.id,
    devicesCount,
    sensorsCount,
    simsCount,
    mappingsCount,
    enabledCompaniesCount,
    enabledCompanyNames,
    inUseTrackedCount,
    totalReferences,
    isReferenced,
    shortReason,
    summaryLines,
    hasKnownData,
  };
}

export function buildModelReferenceMap(
  records: ModelCategoryRecord[]
): Record<string, ModelReferenceSummary> {
  const map: Record<string, ModelReferenceSummary> = {};
  records.forEach((rec) => {
    map[rec.id] = getModelCategoryReferences(rec);
  });
  return map;
}

/**
 * Dynamically recomputes per-company per-model in-use counts from live ModalMasterStore
 * (devices, sensors, sims, connections) with clear provenance and verified baseline fallback.
 */
export function computeCompanyInUseDetailsMap(
  companies: ClientCompany[],
  models: ModelCategoryRecord[]
): Record<string, Record<string, InUseDetail>> {
  const result: Record<string, Record<string, InUseDetail>> = {};
  companies.forEach((c) => {
    result[c.id] = {};
  });

  try {
    const store = loadModalMasterStore();
    const companyIdByName = new Map<string, string>();
    const companyIdSet = new Set<string>();
    companies.forEach((c) => {
      companyIdSet.add(c.id);
      companyIdByName.set(c.name.trim().toLowerCase(), c.id);
    });

    const resolveCompanyId = (compId?: string, compName?: string): string | null => {
      if (compId && companyIdSet.has(compId)) return compId;
      const norm = (compName || '').trim().toLowerCase();
      if (norm && companyIdByName.has(norm)) return companyIdByName.get(norm)!;
      return null;
    };

    const resolveModelForDevice = (d: { modelTypeId?: string; modelText?: string; manufacturer?: string }): string | null => {
      if (d.modelTypeId) return d.modelTypeId;
      const normRef = (d.modelText || '').trim().toLowerCase();
      const normMfg = (d.manufacturer || '').trim().toLowerCase();
      const found = models.find(
        (m) =>
          m.category === 'Device' &&
          Boolean(normRef) &&
          (m.modelReference || '').trim().toLowerCase() === normRef &&
          (!normMfg || (m.manufacturer || '').trim().toLowerCase() === normMfg)
      );
      return found ? found.id : null;
    };

    const resolveModelForSensor = (s: { modelTypeId?: string; category?: string; manufacturer?: string }): string | null => {
      if (s.modelTypeId) return s.modelTypeId;
      const normType = (s.category || '').trim().toLowerCase();
      const normMfg = (s.manufacturer || '').trim().toLowerCase();
      const found = models.find(
        (m) =>
          m.category === 'Sensor' &&
          (m.typeName || '').trim().toLowerCase() === normType &&
          (!normMfg || (m.manufacturer || '').trim().toLowerCase() === normMfg)
      );
      return found ? found.id : null;
    };

    const resolveModelForSim = (sim: { modelTypeId?: string; category?: string; operator?: string }): string | null => {
      if (sim.modelTypeId) return sim.modelTypeId;
      const normType = (sim.category || '').trim().toLowerCase();
      const normOp = (sim.operator || '').trim().toLowerCase();
      const found = models.find(
        (m) =>
          m.category === 'SIM' &&
          (m.typeName || '').trim().toLowerCase() === normType &&
          (!normOp || (m.manufacturer || '').trim().toLowerCase() === normOp)
      );
      return found ? found.id : null;
    };

    const ensureEntry = (companyId: string, modelId: string): InUseDetail => {
      if (!result[companyId]) result[companyId] = {};
      if (!result[companyId][modelId]) {
        result[companyId][modelId] = {
          count: 0,
          liveInventoryCount: 0,
          liveMappingCount: 0,
          seedBaselineCount: 0,
          provenance: 'none',
        };
      }
      return result[companyId][modelId];
    };

    const deviceModelById = new Map<string, string>();
    const sensorModelById = new Map<string, string>();
    const simModelById = new Map<string, string>();

    (store.devices || []).forEach((d) => {
      const mId = resolveModelForDevice(d);
      if (mId) deviceModelById.set(d.id, mId);
      const cId = resolveCompanyId(undefined, d.company);
      if (cId && mId) {
        ensureEntry(cId, mId).liveInventoryCount += 1;
      }
    });

    (store.sensors || []).forEach((s) => {
      const mId = resolveModelForSensor(s);
      if (mId) sensorModelById.set(s.id, mId);
      const cId = resolveCompanyId(undefined, s.company);
      if (cId && mId) {
        ensureEntry(cId, mId).liveInventoryCount += 1;
      }
    });

    (store.sims || []).forEach((sim) => {
      const mId = resolveModelForSim(sim);
      if (mId) simModelById.set(sim.id, mId);
      const cId = resolveCompanyId(undefined, sim.owner);
      if (cId && mId) {
        ensureEntry(cId, mId).liveInventoryCount += 1;
      }
    });

    (store.connections || []).forEach((conn) => {
      if (conn.status === 'Inactive') return;
      const cId = resolveCompanyId(conn.companyId, conn.companyName);
      if (!cId) return;
      const connModelIds = new Set<string>();
      (conn.members || []).forEach((mem) => {
        const mId =
          mem.modelTypeId ||
          deviceModelById.get(mem.hardwareId) ||
          sensorModelById.get(mem.hardwareId) ||
          simModelById.get(mem.hardwareId);
        if (mId) connModelIds.add(mId);
      });
      if (conn.hardwareId) {
        const mId = deviceModelById.get(conn.hardwareId) || sensorModelById.get(conn.hardwareId);
        if (mId) connModelIds.add(mId);
      }
      if (conn.parentId) {
        const mId = deviceModelById.get(conn.parentId);
        if (mId) connModelIds.add(mId);
      }
      if (conn.simId) {
        const mId = simModelById.get(conn.simId);
        if (mId) connModelIds.add(mId);
      }
      connModelIds.forEach((mId) => {
        ensureEntry(cId, mId).liveMappingCount += 1;
      });
    });

    // Apply verified demo baseline and finalize counts + provenance
    companies.forEach((comp) => {
      const baselineForComp = INITIAL_COMPANY_IN_USE_MAP[comp.id] || {};
      models.forEach((model) => {
        const baselineCount = baselineForComp[model.id] || 0;
        const existing = result[comp.id]?.[model.id];
        const liveInv = existing?.liveInventoryCount || 0;
        const liveMap = existing?.liveMappingCount || 0;

        if (liveInv > 0 || liveMap > 0) {
          const entry = ensureEntry(comp.id, model.id);
          entry.seedBaselineCount = baselineCount;
          entry.count = liveInv > 0 ? liveInv : liveMap;
          entry.provenance = 'live';
        } else if (baselineCount > 0) {
          const entry = ensureEntry(comp.id, model.id);
          entry.seedBaselineCount = baselineCount;
          entry.count = baselineCount;
          entry.provenance = 'baseline';
        }
      });
    });
  } catch (e) {
    console.error('Failed to compute dynamic in-use map', e);
  }

  return result;
}
