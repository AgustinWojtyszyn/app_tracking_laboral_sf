import { beforeEach, describe, expect, it, vi } from 'vitest';

const buildJobsService = async ({ rpcResult, rpcError = null } = {}) => {
  vi.resetModules();

  const supabase = {
    rpc: vi.fn().mockResolvedValue({
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

  it('llama exclusivamente a list_jobs_paginated con filtros de lugar, busqueda y paginacion', async () => {
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
      location: 'Clorox',
      search: 'campana',
      page: 2,
      pageSize: 30,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_paginated', {
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

  it('envia null para todos los lugares y busqueda vacia', async () => {
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
      location: 'all',
      search: '   ',
      page: 1,
      pageSize: 10,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('list_jobs_paginated', {
      p_location: null,
      p_search: null,
      p_page: 1,
      p_page_size: 10,
    });
  });
});
