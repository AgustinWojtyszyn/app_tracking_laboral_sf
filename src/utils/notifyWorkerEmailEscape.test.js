import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const loadEscapeHtml = () => {
  const filePath = path.resolve(process.cwd(), 'supabase/functions/notify-worker-email/index.ts');
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/export const escapeHtml = \(value\) => \{([\s\S]*?)\n\};/);
  if (!match) {
    throw new Error('escapeHtml helper not found');
  }

  return Function(`return (value) => {${match[1]}\n};`)();
};

describe('notify-worker-email escapeHtml', () => {
  const escapeHtml = loadEscapeHtml();

  it('muestra payload con img onerror como texto', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('muestra tags HTML como texto', () => {
    expect(escapeHtml('<b>Texto</b>')).toBe('&lt;b&gt;Texto&lt;/b&gt;');
  });

  it('escapa ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapa comillas dobles y simples', () => {
    expect(escapeHtml('"comillas" y \'simples\'')).toBe('&quot;comillas&quot; y &#39;simples&#39;');
  });
});
