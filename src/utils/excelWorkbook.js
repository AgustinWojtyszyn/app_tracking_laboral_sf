const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CONTROL_OR_SPACE_PREFIX = /^[\s\u0000-\u001f\u007f-\u009f]*/u;
const UNSAFE_FORMULA_START = new Set(['=', '+', '-', '@']);
let excelJsPromise;

export const safeExcelCell = (value) => {
  if (typeof value !== 'string') return value;

  const prefix = value.match(CONTROL_OR_SPACE_PREFIX)?.[0] || '';
  const firstSignificant = value.charAt(prefix.length);
  if (!UNSAFE_FORMULA_START.has(firstSignificant)) return value;

  return `'${value}`;
};

export const normalizeExcelFileName = (filename = 'export.xlsx') => {
  const rawName = String(filename || 'export.xlsx').trim() || 'export.xlsx';
  if (/\.(xlsx|xls)$/i.test(rawName)) {
    return rawName.replace(/\.(xlsx|xls)$/i, '.xlsx');
  }
  return `${rawName}.xlsx`;
};

const loadExcelJs = async () => {
  if (!excelJsPromise) {
    excelJsPromise = import('exceljs');
  }
  const module = await excelJsPromise;
  return module.default || module;
};

export const createExcelWorkbook = async () => {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tracking Laboral';
  workbook.created = new Date();
  return workbook;
};

const resolveHeaders = (rows) => {
  const rowWithKeys = rows.find((row) => row && typeof row === 'object' && Object.keys(row).length > 0);
  return rowWithKeys ? Object.keys(rowWithKeys) : [];
};

export const appendJsonWorksheet = (workbook, rows, sheetName, columnWidths = []) => {
  const worksheet = workbook.addWorksheet(sheetName);
  const safeRows = rows.length ? rows : [{}];
  const headers = resolveHeaders(safeRows);

  if (headers.length === 0) {
    worksheet.addRow([]);
    return worksheet;
  }

  worksheet.addRow(headers.map(safeExcelCell));
  worksheet.getRow(1).font = { bold: true };

  safeRows.forEach((row) => {
    worksheet.addRow(headers.map((header) => (
      Object.prototype.hasOwnProperty.call(row, header)
        ? safeExcelCell(row[header])
        : undefined
    )));
  });

  headers.forEach((_, index) => {
    const width = columnWidths[index]?.wch;
    if (width) worksheet.getColumn(index + 1).width = width;
  });

  return worksheet;
};

export const saveWorkbookAsXlsx = async (workbook, filename) => {
  const safeFilename = normalizeExcelFileName(filename);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = safeFilename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return safeFilename;
};
