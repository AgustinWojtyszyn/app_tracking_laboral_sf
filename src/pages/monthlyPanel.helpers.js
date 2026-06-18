const normalizeSearchValue = (value) => (
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
