import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/pages/DailyJobsPage.jsx'), 'utf8');

describe('DailyJobsPage summary status wiring', () => {
  it('recarga el resumen cuando cambia el filtro de estado', () => {
    expect(source).toMatch(
      /useEffect\(\(\) => \{\s*if \(user\) fetchSummary\(\);\s*\}, \[user, date, selectedLocation, selectedStatus, debouncedSearchTerm\]\);/
    );
  });

  it('envia selectedStatus al servicio de resumen', () => {
    expect(source).toMatch(
      /jobsService\.getDailyJobsSummary\(\{\s*date,\s*location: selectedLocation,\s*status: selectedStatus,\s*search: debouncedSearchTerm,\s*\}\)/
    );
  });

  it('actualiza el resumen despues de cambiar el estado de una fila', () => {
    expect(source).toMatch(
      /const applyStatusChange = async[\s\S]*jobsService\.updateJob[\s\S]*fetchSummary\(\);/
    );
  });
});
