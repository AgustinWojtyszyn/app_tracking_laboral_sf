import { beforeEach, describe, expect, it, vi } from 'vitest';

const buildJobsService = async ({ rpcResult, rpcError = null, rpcImpl = null } = {}) => {
  vi.resetModules();

  const supabase = {
    rpc: rpcImpl || vi.fn().mockResolvedValue({
      data: rpcResult,
      error: rpcError,
    }),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/image.jpg' } })),
      })),
    },
  };

  vi.doMock('@/lib/customSupabaseClient', () => ({
    supabase,
    customSupabaseClient: supabase,
    default: supabase,
  }));

  const { jobsService } = await import('./jobs.service');
  return { jobsService, supabase };
};

describe('jobsService.listJobsPaginated', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('llama exclusivamente a list_jobs_paginated con fecha, lugar, busqueda y paginacion', async () => {
    const { jobsService, supabase } = await buildJobsService({
      rpcResult: {
        items: [{ id: '1', title: 'Campana', image_attachments: [] }],
        total_count: 31,
        page: 2,
        page_size: 30,
        total_pages: 2,
        has_previous_page: true,
        has_next_page: false,
      },
    });

    const result = await jobsService.listJobsPaginated({
      date: '2026-07-10',
      location: 'Clorox',
      search: 'campana',
      page: 2,
      pageSize: 30,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_paginated', {
      p_date: '2026-07-10',
      p_location: 'Clorox',
      p_status: null,
      p_search: 'campana',
      p_page: 2,
      p_page_size: 30,
    });
    expect(result.success).toBe(true);
    expect(result.data.items).toHaveLength(1);
    expect(result.data.total_count).toBe(31);
    expect(result.data.has_previous_page).toBe(true);
    expect(result.data.has_next_page).toBe(false);
  });

  it('envia null para fecha, todos los lugares y busqueda vacia', async () => {
    const { jobsService, supabase } = await buildJobsService({
      rpcResult: {
        items: [],
        total_count: 0,
        page: 1,
        page_size: 10,
        total_pages: 1,
        has_previous_page: false,
        has_next_page: false,
      },
    });

    await jobsService.listJobsPaginated({
      date: '',
      location: 'all',
      search: '   ',
      page: 1,
      pageSize: 10,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_paginated', {
      p_date: null,
      p_location: null,
      p_status: null,
      p_search: null,
      p_page: 1,
      p_page_size: 10,
    });
  });

  it('envia estado especifico al listado paginado', async () => {
    const { jobsService, supabase } = await buildJobsService({
      rpcResult: {
        items: [{ id: '1', title: 'Campana', status: 'completed' }],
        total_count: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
        has_previous_page: false,
        has_next_page: false,
      },
    });

    const result = await jobsService.listJobsPaginated({
      date: '2026-07-10',
      location: 'Clorox',
      status: 'completed',
      search: 'campana',
      page: 1,
      pageSize: 10,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_paginated', {
      p_date: '2026-07-10',
      p_location: 'Clorox',
      p_status: 'completed',
      p_search: 'campana',
      p_page: 1,
      p_page_size: 10,
    });
    expect(result.success).toBe(true);
    expect(result.data.items).toHaveLength(1);
  });

  it('normaliza data null, respuesta incompleta e items no array', async () => {
    const { jobsService } = await buildJobsService({ rpcResult: null });
    const nullResult = await jobsService.listJobsPaginated({ page: 3, pageSize: 50 });

    expect(nullResult.success).toBe(true);
    expect(nullResult.data).toMatchObject({
      items: [],
      total_count: 0,
      page: 3,
      page_size: 50,
      total_pages: 1,
      has_previous_page: false,
      has_next_page: false,
    });

    const incomplete = await buildJobsService({ rpcResult: { items: 'no-array' } });
    const incompleteResult = await incomplete.jobsService.listJobsPaginated({ page: 1, pageSize: 10 });

    expect(incompleteResult.success).toBe(true);
    expect(incompleteResult.data.items).toEqual([]);
    expect(incompleteResult.data.total_pages).toBe(1);
  });

  it('propaga errores controlados de Supabase en paginacion', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { jobsService } = await buildJobsService({ rpcError: new Error('rpc failed') });
    const result = await jobsService.listJobsPaginated({ page: 2, pageSize: 30 });

    expect(result.success).toBe(false);
    expect(result.data.items).toEqual([]);
    expect(result.data.page).toBe(2);
    expect(result.data.page_size).toBe(30);
  });

  it('llama list_jobs_for_export con fecha, lugar y busqueda', async () => {
    const rpcImpl = vi.fn().mockResolvedValue({
      data: { items: [{ id: '1', title: 'Campana' }] },
      error: null,
    });
    const { jobsService, supabase } = await buildJobsService({ rpcImpl });

    const result = await jobsService.listJobsForExport({
      date: '2026-07-10',
      location: 'ServiFood',
      search: 'campana',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_for_export', {
      p_date: '2026-07-10',
      p_location: 'ServiFood',
      p_status: null,
      p_search: 'campana',
    });
    expect(result.success).toBe(true);
    expect(result.data.items).toHaveLength(1);
  });

  it('envia estado especifico a exportacion', async () => {
    const rpcImpl = vi.fn().mockResolvedValue({
      data: { items: [{ id: '1', title: 'Campana', status: 'pending' }] },
      error: null,
    });
    const { jobsService, supabase } = await buildJobsService({ rpcImpl });

    const result = await jobsService.listJobsForExport({
      date: '2026-07-10',
      location: 'ServiFood',
      status: 'pending',
      search: 'campana',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_for_export', {
      p_date: '2026-07-10',
      p_location: 'ServiFood',
      p_status: 'pending',
      p_search: 'campana',
    });
    expect(result.success).toBe(true);
    expect(result.data.items).toHaveLength(1);
  });

  it('normaliza parametros vacios y maneja error de exportacion', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const rpcImpl = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('export failed'),
    });
    const { jobsService, supabase } = await buildJobsService({ rpcImpl });

    const result = await jobsService.listJobsForExport({
      date: '',
      location: 'all',
      search: ' ',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_for_export', {
      p_date: null,
      p_location: null,
      p_status: null,
      p_search: null,
    });
    expect(result.success).toBe(false);
    expect(result.data.items).toEqual([]);
  });

  it('carga trabajos para copiar reutilizando el listado sin paginacion', async () => {
    const rpcImpl = vi.fn().mockResolvedValue({
      data: { items: [{ id: 'job-1', title: 'Reparación' }] },
      error: null,
    });
    const { jobsService, supabase } = await buildJobsService({ rpcImpl });

    const result = await jobsService.listJobsForCopyByDate('2026-07-20');

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_for_export', {
      p_date: '2026-07-20',
      p_location: null,
      p_status: null,
      p_search: null,
    });
    expect(result.success).toBe(true);
    expect(result.data.items).toEqual([{ id: 'job-1', title: 'Reparación' }]);
  });

  it('rechaza cargar trabajos para copiar sin fecha de origen', async () => {
    const { jobsService, supabase } = await buildJobsService();

    const result = await jobsService.listJobsForCopyByDate('');

    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.data.items).toEqual([]);
  });

  it('llama la RPC de copia con ids deduplicados, destino y request id', async () => {
    const rpcImpl = vi.fn().mockResolvedValue({
      data: { copied_count: 2, failed_count: 0, target_date: '2026-07-21' },
      error: null,
    });
    const { jobsService, supabase } = await buildJobsService({ rpcImpl });

    const result = await jobsService.copyJobsFromDate({
      jobIds: ['job-1', 'job-1', 'job-2', null],
      targetDate: '2026-07-21',
      copyRequestId: 'copy-request-1',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('copy_daily_jobs_from_date', {
      p_job_ids: ['job-1', 'job-2'],
      p_target_date: '2026-07-21',
      p_copy_request_id: 'copy-request-1',
    });
    expect(result).toMatchObject({
      success: true,
      copiedCount: 2,
      failedCount: 0,
      targetDate: '2026-07-21',
    });
  });

  it('no llama la RPC de copia si faltan seleccion, destino o request id', async () => {
    const { jobsService, supabase } = await buildJobsService();

    const noSelection = await jobsService.copyJobsFromDate({
      jobIds: [],
      targetDate: '2026-07-21',
      copyRequestId: 'copy-request-1',
    });
    const noDate = await jobsService.copyJobsFromDate({
      jobIds: ['job-1'],
      targetDate: '',
      copyRequestId: 'copy-request-1',
    });
    const noRequest = await jobsService.copyJobsFromDate({
      jobIds: ['job-1'],
      targetDate: '2026-07-21',
      copyRequestId: '',
    });

    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(noSelection.success).toBe(false);
    expect(noDate.success).toBe(false);
    expect(noRequest.success).toBe(false);
  });

  it('informa copia parcial sin marcar exito total', async () => {
    const rpcImpl = vi.fn().mockResolvedValue({
      data: { copied_count: 1, failed_count: 2, target_date: '2026-07-21' },
      error: null,
    });
    const { jobsService } = await buildJobsService({ rpcImpl });

    const result = await jobsService.copyJobsFromDate({
      jobIds: ['job-1', 'job-2', 'job-3'],
      targetDate: '2026-07-21',
      copyRequestId: 'copy-request-1',
    });

    expect(result.success).toBe(false);
    expect(result.copiedCount).toBe(1);
    expect(result.failedCount).toBe(2);
    expect(result.error).toBe('Se copiaron 1 trabajos y fallaron 2.');
  });
});

describe('jobsService.getDailyJobsSummary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calcula el resumen sin filtro de estado y envia p_status null', async () => {
    const rpcImpl = vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 'job-1',
            status: 'pending',
            worker_id: 'worker-1',
            location: 'ServiFood',
            amount_to_charge: 1000,
            cost_spent: 400,
          },
          {
            id: 'job-2',
            status: 'completed',
            worker_id: 'worker-2',
            location: 'Clorox',
            amount_to_charge: 2000,
            cost_spent: 700,
          },
        ],
      },
      error: null,
    });
    const { jobsService, supabase } = await buildJobsService({ rpcImpl });

    const result = await jobsService.getDailyJobsSummary({
      date: '2026-07-10',
      location: 'all',
      status: 'all',
      search: ' ',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_for_export', {
      p_date: '2026-07-10',
      p_location: null,
      p_status: null,
      p_search: null,
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      total: 2,
      pending: 1,
      completed: 1,
      workers: 2,
      locations: 2,
      totalCharge: 3000,
      workerCost: 1100,
      balance: 1900,
    });
  });

  it('calcula el resumen filtrado por pending', async () => {
    const rpcImpl = vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 'job-1',
            status: 'pending',
            worker_id: 'worker-1',
            location: 'ServiFood',
            amount_to_charge: 1000,
            cost_spent: 400,
          },
        ],
      },
      error: null,
    });
    const { jobsService, supabase } = await buildJobsService({ rpcImpl });

    const result = await jobsService.getDailyJobsSummary({
      date: '2026-07-10',
      location: 'ServiFood',
      status: 'pending',
      search: 'reparacion',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_for_export', {
      p_date: '2026-07-10',
      p_location: 'ServiFood',
      p_status: 'pending',
      p_search: 'reparacion',
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      total: 1,
      pending: 1,
      completed: 0,
      totalCharge: 1000,
      workerCost: 400,
      balance: 600,
    });
  });

  it('calcula el resumen filtrado por completed', async () => {
    const rpcImpl = vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 'job-1',
            status: 'completed',
            workers: { id: 'worker-1' },
            location: 'Clorox',
            amount_to_charge: 2500,
            cost_spent: 1000,
          },
        ],
      },
      error: null,
    });
    const { jobsService, supabase } = await buildJobsService({ rpcImpl });

    const result = await jobsService.getDailyJobsSummary({
      date: '2026-07-10',
      location: 'Clorox',
      status: 'completed',
      search: 'campana',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_for_export', {
      p_date: '2026-07-10',
      p_location: 'Clorox',
      p_status: 'completed',
      p_search: 'campana',
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      total: 1,
      pending: 0,
      completed: 1,
      workers: 1,
      locations: 1,
      totalCharge: 2500,
      workerCost: 1000,
      balance: 1500,
    });
  });

  it('mantiene coherentes fecha, lugar, busqueda y estado entre listado, resumen y exportacion', async () => {
    const rpcImpl = vi.fn().mockResolvedValue({
      data: { items: [] },
      error: null,
    });
    const { jobsService, supabase } = await buildJobsService({ rpcImpl });
    const filters = {
      date: '2026-07-10',
      location: 'ServiFood',
      status: 'completed',
      search: 'campana',
    };

    await jobsService.listJobsPaginated({ ...filters, page: 2, pageSize: 30 });
    await jobsService.getDailyJobsSummary(filters);
    await jobsService.listJobsForExport(filters);

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'list_jobs_paginated', {
      p_date: filters.date,
      p_location: filters.location,
      p_status: filters.status,
      p_search: filters.search,
      p_page: 2,
      p_page_size: 30,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'list_jobs_for_export', {
      p_date: filters.date,
      p_location: filters.location,
      p_status: filters.status,
      p_search: filters.search,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(3, 'list_jobs_for_export', {
      p_date: filters.date,
      p_location: filters.location,
      p_status: filters.status,
      p_search: filters.search,
    });
  });
});
