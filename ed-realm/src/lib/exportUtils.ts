import jsPDF from 'jspdf';

type Cell = string | number | null | undefined;
type Row = Cell[];

const sanitize = (value: Cell) => (value === null || value === undefined ? '' : String(value));

export const exportToCSV = (filename: string, headers: string[], rows: Row[]) => {
  const headerLine = headers.join(',');
  const bodyLines = rows.map((row) =>
    row
      .map((cell) => {
        const text = sanitize(cell).replace(/"/g, '""');
        return `"${text}"`;
      })
      .join(',')
  );

  const content = [headerLine, ...bodyLines].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const safeName = filename.endsWith('.csv') || filename.endsWith('.xls') ? filename : `${filename}.csv`;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

import autoTable from 'jspdf-autotable';



export const exportToPDF = (filename: string, title: string, headers: string[], rows: Row[]) => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(title, 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: rows.map(row => row.map(cell => sanitize(cell))),
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 8 },
  });

  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(safeName);
};
