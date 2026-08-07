export const MONTHLY_LOCATION_CATALOG = [
  'Adium (Monteverde)',
  'Aes Sarmiento',
  'Aes Ullum',
  'Argentilemon',
  'Baez Laspiur',
  'Bodegas Callia',
  'CAPS Bermejo',
  'Caps Tamberia',
  'CARF',
  'CCP (Calidra)',
  'Centro Por La Vida',
  'Ceramica San Lorenzo',
  'Clorox',
  'Easy (Better)',
  'Ferva',
  'Genneia',
  'Greif',
  'Grupo Comeca',
  'Hosp Valle Fertil',
  'Hospital Barreal',
  'Hospital Calingasta',
  'Hospital mental (Zonda)',
  'Hospital Pocito',
  'Hospital Sarmiento',
  'Igarreta',
  'La Segunda Seguros',
  'Los Berros',
  'Micro Hospital Berros',
  'Molinos',
  'Padre Bueno',
  'Proviser Sarmiento',
  'Proviser Ullum',
  'Saint Gobain (Placo)',
  'ServiFood',
  'Vicunha',
];

export const normalizeSearchValue = (value) => (
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
);

export const filterMonthlyJobsBySearch = (jobs, search) => {
  const term = normalizeSearchValue(search);
  if (!term) return Array.isArray(jobs) ? jobs : [];

  return (Array.isArray(jobs) ? jobs : []).filter((job) => {
    const fields = [job?.title, job?.description, job?.location, job?.requested_by];
    return fields.some((field) => normalizeSearchValue(field).includes(term));
  });
};

export const normalizeDateOnly = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const filterMonthlyJobsByDateRange = (jobs, startDate, endDate) => {
  const start = normalizeDateOnly(startDate);
  const end = normalizeDateOnly(endDate);
  if (!start || !end) return Array.isArray(jobs) ? jobs : [];

  return (Array.isArray(jobs) ? jobs : []).filter((job) => {
    const recordDate = normalizeDateOnly(job?.date || job?.fecha);
    return Boolean(recordDate && recordDate >= start && recordDate <= end);
  });
};

export const filterMonthlyJobsByStatus = (jobs, status, normalizeStatus) => {
  if (!status || status === 'all') return Array.isArray(jobs) ? jobs : [];
  return (Array.isArray(jobs) ? jobs : []).filter((job) => normalizeStatus(job) === status);
};

export const filterMonthlyJobsByGroup = (jobs, groupId) => {
  if (!groupId || groupId === 'all') return Array.isArray(jobs) ? jobs : [];
  return (Array.isArray(jobs) ? jobs : []).filter((job) => String(job?.group_id || '') === String(groupId));
};

export const filterMonthlyJobsByWorker = (jobs, workerId) => {
  if (!workerId || workerId === 'all') return Array.isArray(jobs) ? jobs : [];
  return (Array.isArray(jobs) ? jobs : []).filter((job) => String(job?.worker_id || '') === String(workerId));
};

export const filterMonthlyJobsByLocation = (jobs, location) => {
  if (!location || location === 'all') return Array.isArray(jobs) ? jobs : [];
  const selected = normalizeSearchValue(location);
  return (Array.isArray(jobs) ? jobs : []).filter((job) => normalizeSearchValue(job?.location) === selected);
};

export const filterMonthlyJobsByRequester = (jobs, requestedBy) => {
  const term = normalizeSearchValue(requestedBy);
  if (!term) return Array.isArray(jobs) ? jobs : [];
  return (Array.isArray(jobs) ? jobs : []).filter((job) => normalizeSearchValue(job?.requested_by).includes(term));
};

export const sortMonthlyJobsByCurrentOrder = (jobs) => (
  [...(Array.isArray(jobs) ? jobs : [])].sort((a, b) => {
    const dateCompare = String(b?.date || b?.fecha || '').localeCompare(String(a?.date || a?.fecha || ''));
    if (dateCompare !== 0) return dateCompare;
    return String(b?.created_at || '').localeCompare(String(a?.created_at || ''));
  })
);

export const applyMonthlyPanelFilters = (jobs, filters, normalizeStatus) => {
  const byDate = filterMonthlyJobsByDateRange(jobs, filters.startDate, filters.endDate);
  const bySearch = filterMonthlyJobsBySearch(byDate, filters.search);
  const byStatus = filterMonthlyJobsByStatus(bySearch, filters.status, normalizeStatus);
  const byGroup = filterMonthlyJobsByGroup(byStatus, filters.groupId);
  const byWorker = filterMonthlyJobsByWorker(byGroup, filters.workerId);
  const byRequester = filterMonthlyJobsByRequester(byWorker, filters.requestedBy);
  const byLocation = filterMonthlyJobsByLocation(byRequester, filters.location);
  return sortMonthlyJobsByCurrentOrder(byLocation);
};

export const buildMonthlyLocationOptions = (jobs, catalog = MONTHLY_LOCATION_CATALOG) => {
  const byNormalized = new Map();

  catalog.forEach((location) => {
    const normalized = normalizeSearchValue(location);
    if (normalized && !byNormalized.has(normalized)) {
      byNormalized.set(normalized, { label: location, source: 'catalog' });
    }
  });

  (Array.isArray(jobs) ? jobs : []).forEach((job) => {
    const label = String(job?.location || '').replace(/\s+/g, ' ').trim();
    const normalized = normalizeSearchValue(label);
    if (!normalized || byNormalized.has(normalized)) return;
    byNormalized.set(normalized, { label, source: 'records' });
  });

  const catalogItems = [];
  const recordItems = [];
  byNormalized.forEach((item) => {
    if (item.source === 'catalog') catalogItems.push(item.label);
    else recordItems.push(item.label);
  });

  const sortByLabel = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });
  return [
    ...catalogItems.sort(sortByLabel),
    ...recordItems.sort(sortByLabel),
  ];
};

export const getMonthlyUnknownLocations = (jobs, catalog = MONTHLY_LOCATION_CATALOG) => {
  const catalogSet = new Set(catalog.map(normalizeSearchValue));
  const unique = new Map();

  (Array.isArray(jobs) ? jobs : []).forEach((job) => {
    const label = String(job?.location || '').replace(/\s+/g, ' ').trim();
    const normalized = normalizeSearchValue(label);
    if (!normalized || catalogSet.has(normalized) || unique.has(normalized)) return;
    unique.set(normalized, label);
  });

  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
};

export const paginateMonthlyJobs = (jobs, page, pageSize) => {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 10;
  const totalPages = Math.max(1, Math.ceil(safeJobs.length / safePageSize));
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, safeJobs.length);

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    records: safeJobs.slice(startIndex, endIndex),
  };
};

export const getPreviousDateRange = (startDate, endDate) => {
  const start = normalizeDateOnly(startDate);
  const end = normalizeDateOnly(endDate);
  if (!start || !end) return { startDate: '', endDate: '' };

  const startDateValue = new Date(`${start}T00:00:00`);
  const endDateValue = new Date(`${end}T00:00:00`);
  const duration = Math.round((endDateValue - startDateValue) / (1000 * 60 * 60 * 24)) + 1;
  const previousEnd = new Date(startDateValue);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - duration + 1);

  const formatDateValue = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDateValue(previousStart),
    endDate: formatDateValue(previousEnd),
  };
};

const getMetricDelta = (current, previous) => current - previous;
const getPercentageDelta = (current, previous) => current - previous;
const buildChangeLabel = ({ value, unit = 'puntos', isPositiveGood = true, isCurrency = false, isPercent = false }) => {
  if (value === 0) return 'Sin cambios';

  const absValue = Math.abs(value);
  const direction = value > 0 ? 'más' : 'menos';
  const sign = value > 0 ? '+' : '-';
  const formatted = isCurrency
    ? `${sign}${absValue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : `${sign}${Number(absValue).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const suffix = isPercent ? `${absValue} puntos` : isCurrency ? '' : absValue;
  const suffixText = isPercent ? ` ${unit}` : isCurrency ? '' : ` ${unit}`;
  const body = `${formatted}${suffixText}`;
  const adjective = value > 0 ? 'más' : 'menos';
  return `${absValue}${isPercent ? ' puntos' : ''} ${adjective} que el período anterior`;
};

const getSimpleSummaryPart = (jobs, normalizeStatus) => {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const total = safeJobs.length;
  const pending = safeJobs.filter((job) => normalizeStatus(job) === 'pending').length;
  const completed = safeJobs.filter((job) => normalizeStatus(job) === 'completed').length;
  return { total, pending, completed };
};

const getActiveJobs = (jobs, normalizeStatus) => (Array.isArray(jobs) ? jobs : []).filter((job) => normalizeStatus(job) !== 'archived');

const getUniqueValues = (jobs, accessor) => {
  const seen = new Set();
  (Array.isArray(jobs) ? jobs : []).forEach((job) => {
    const value = accessor(job);
    if (!value) return;
    seen.add(String(value).trim().toLowerCase());
  });
  return seen.size;
};

export const buildMonthlyPeriodSummary = ({ currentJobs, previousJobs, normalizeStatus, isEn = false }) => {
  const currentSafeJobs = Array.isArray(currentJobs) ? currentJobs : [];
  const previousSafeJobs = Array.isArray(previousJobs) ? previousJobs : [];

  const currentBase = getSimpleSummaryPart(currentSafeJobs, normalizeStatus);
  const previousBase = getSimpleSummaryPart(previousSafeJobs, normalizeStatus);
  const currentActiveJobs = getActiveJobs(currentSafeJobs, normalizeStatus);
  const previousActiveJobs = getActiveJobs(previousSafeJobs, normalizeStatus);
  const currentActiveCount = currentActiveJobs.length;
  const previousActiveCount = previousActiveJobs.length;
  const currentCompletionRate = currentActiveCount === 0 ? 0 : (currentActiveJobs.filter((job) => normalizeStatus(job) === 'completed').length / currentActiveCount) * 100;
  const previousCompletionRate = previousActiveCount === 0 ? 0 : (previousActiveJobs.filter((job) => normalizeStatus(job) === 'completed').length / previousActiveCount) * 100;

  const currentWorkers = getUniqueValues(currentSafeJobs, (job) => job?.worker_id || job?.workers?.id || null);
  const previousWorkers = getUniqueValues(previousSafeJobs, (job) => job?.worker_id || job?.workers?.id || null);
  const currentLocations = getUniqueValues(currentSafeJobs, (job) => String(job?.location || '').trim());
  const previousLocations = getUniqueValues(previousSafeJobs, (job) => String(job?.location || '').trim());

  const currentAmountToCharge = currentActiveJobs.reduce((acc, job) => acc + (Number(job?.amount_to_charge) || 0), 0);
  const previousAmountToCharge = previousActiveJobs.reduce((acc, job) => acc + (Number(job?.amount_to_charge) || 0), 0);
  const currentWorkerCost = currentActiveJobs.reduce((acc, job) => acc + (Number(job?.cost_spent) || 0), 0);
  const previousWorkerCost = previousActiveJobs.reduce((acc, job) => acc + (Number(job?.cost_spent) || 0), 0);
  const currentDifference = currentAmountToCharge - currentWorkerCost;
  const previousDifference = previousAmountToCharge - previousWorkerCost;
  const currentBalance = currentDifference;
  const previousBalance = previousDifference;

  const current = {
    total: currentBase.total,
    pending: currentBase.pending,
    completed: currentBase.completed,
    activeCount: currentActiveCount,
    completionRate: currentCompletionRate,
    workers: currentWorkers,
    locations: currentLocations,
    amountToCharge: currentAmountToCharge,
    workerCost: currentWorkerCost,
    difference: currentDifference,
    balance: currentBalance,
    pendingDelta: previousBase.pending - currentBase.pending,
    completedDelta: currentBase.completed - previousBase.completed,
    complianceDelta: currentCompletionRate - previousCompletionRate,
    workersDelta: currentWorkers - previousWorkers,
    locationsDelta: currentLocations - previousLocations,
    balanceDelta: currentBalance - previousBalance,
  };

  const conclusion = (() => {
    if (current.total === 0 && previousBase.total === 0) {
      return isEn
        ? 'No jobs were found for this period.'
        : 'No hay trabajos suficientes para evaluar este período.';
    }

    const pendingDelta = current.pending - previousBase.pending;
    const complianceDelta = current.completionRate - previousCompletionRate;
    if (pendingDelta > 0 && complianceDelta < 0) {
      return isEn
        ? 'Attention: pending jobs increased and compliance dropped compared to the previous period.'
        : 'Atención: aumentaron los trabajos pendientes y bajó el cumplimiento respecto al período anterior.';
    }
    if (pendingDelta < 0 && complianceDelta >= 0) {
      return isEn
        ? 'Positive trend: pending jobs decreased and compliance improved.'
        : 'Evolución positiva: disminuyeron los pendientes y el cumplimiento mejoró.';
    }
    if (complianceDelta > 0) {
      return isEn
        ? 'Compliance improved compared to the previous period.'
        : 'El cumplimiento mejoró respecto al período anterior.';
    }
    if (complianceDelta < 0) {
      return isEn
        ? 'Compliance declined compared to the previous period.'
        : 'El cumplimiento bajó respecto al período anterior.';
    }
    return isEn
      ? 'Activity remained stable compared to the previous period.'
      : 'La actividad se mantiene estable respecto al período anterior.';
  })();

  return {
    current,
    previous: {
      total: previousBase.total,
      pending: previousBase.pending,
      completed: previousBase.completed,
      activeCount: previousActiveCount,
      completionRate: previousCompletionRate,
      workers: previousWorkers,
      locations: previousLocations,
      amountToCharge: previousAmountToCharge,
      workerCost: previousWorkerCost,
      difference: previousDifference,
      balance: previousBalance,
    },
    conclusion,
  };
};

export const createLatestRequestGuard = () => {
  let currentRequestId = 0;

  return {
    next() {
      currentRequestId += 1;
      return currentRequestId;
    },
    isLatest(requestId) {
      return requestId === currentRequestId;
    },
  };
};

export const shouldApplyMonthlyJobsResult = ({ isMounted, isLatest }) => Boolean(isMounted && isLatest);
