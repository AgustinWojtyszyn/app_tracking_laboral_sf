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
      p_search: null,
      p_page: 1,
      p_page_size: 10,
    });
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
      p_search: null,
    });
    expect(result.success).toBe(false);
    expect(result.data.items).toEqual([]);
  });
});
