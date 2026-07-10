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
    const fields = [job?.title, job?.description, job?.location];
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
  const byLocation = filterMonthlyJobsByLocation(byWorker, filters.location);
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
