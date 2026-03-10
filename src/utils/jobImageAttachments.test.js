import { describe, expect, it } from 'vitest';
import {
  JOB_IMAGE_MAX_SIZE_BYTES,
  JOB_IMAGE_SIZE_ERROR,
  JOB_IMAGE_TYPE_ERROR,
  createJobImageDrafts,
  normalizeJobImageDraftInput,
  normalizeStoredJobImageAttachments,
  sanitizeJobImageFileName,
  validateJobImageDescription,
  validateJobImageDrafts,
  validateJobImageFile,
} from './jobImageAttachments';

describe('jobImageAttachments', () => {
  it('sanitizes file names for storage paths', () => {
    expect(sanitizeJobImageFileName('Pantalla rota Ñandú!!.png')).toBe('Pantalla-rota-Nandu.png');
  });

  it('validates max file size', () => {
    const result = validateJobImageFile({
      name: 'photo.png',
      type: 'image/png',
      size: JOB_IMAGE_MAX_SIZE_BYTES + 1,
    });

    expect(result).toEqual({ valid: false, error: JOB_IMAGE_SIZE_ERROR });
  });

  it('validates accepted image formats', () => {
    const result = validateJobImageFile({
      name: 'photo.gif',
      type: 'image/gif',
      size: 1024,
    });

    expect(result).toEqual({ valid: false, error: JOB_IMAGE_TYPE_ERROR });
  });

  it('validates description length', () => {
    const result = validateJobImageDescription('a'.repeat(201));
    expect(result.valid).toBe(false);
  });

  it('normalizes stored attachments and creates three editable slots', () => {
    const drafts = createJobImageDrafts([
      {
        image_path: 'jobs/1/example.png',
        image_url: 'https://example.com/example.png',
        image_description: 'Pantalla rota',
        sort_order: 0,
      },
    ]);

    expect(drafts).toHaveLength(3);
    expect(drafts[0].previewUrl).toBe('https://example.com/example.png');
    expect(drafts[1].image_description).toBe('');
  });

  it('returns per-slot validation messages', () => {
    const errors = validateJobImageDrafts([
      { file: null, image_description: '' },
      { file: { name: 'broken.gif', type: 'image/gif', size: 10 }, image_description: '' },
      { file: null, image_description: 'ok' },
    ]);

    expect(errors[0]).toBe('');
    expect(errors[1]).toBe(JOB_IMAGE_TYPE_ERROR);
    expect(errors[2]).toBe('');
  });

  it('normalizes persisted values defensively', () => {
    const normalized = normalizeStoredJobImageAttachments([{ image_description: 'Detalle' }, null, 'bad']);
    expect(normalized).toEqual([
      {
        image_path: null,
        image_url: null,
        image_description: 'Detalle',
        file_name: null,
        mime_type: null,
        file_size_bytes: null,
        sort_order: 0,
      },
    ]);
  });

  it('preserves selected files in draft input normalization', () => {
    const file = { name: 'panel.png', type: 'image/png', size: 1234 };
    const drafts = normalizeJobImageDraftInput([
      {
        file,
        previewUrl: 'blob:test',
        image_description: 'Panel roto',
      },
    ]);

    expect(drafts[0].file).toBe(file);
    expect(drafts[0].previewUrl).toBe('blob:test');
    expect(drafts[0].image_description).toBe('Panel roto');
  });
});
