import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Employee, Holiday, PayPeriodConfig, PointLog } from '../types';
import {
  computeWorkedMinutes,
  formatDateBR,
  formatHM,
  formatHMColon,
  formatPayPeriodKey,
  getDayLabelShort,
  isDateInPayPeriod,
  isHoliday,
  isNonWorkDay,
} from './time';

export interface ExportMonthPdfOpts {
  employee: Employee;
  logs: PointLog[];
  holidays: Holiday[];
  monthKey: string; // YYYY-MM
  payPeriodConfig: PayPeriodConfig;
}

function formatSigned(mins: number): string {
  if (mins === 0) return '00:00';
  const sign = mins > 0 ? '+' : '-';
  return `${sign}${formatHMColon(Math.abs(mins))}`;
}

export function exportMonthPDF(opts: ExportMonthPdfOpts): boolean {
  const { employee, logs, holidays, monthKey, payPeriodConfig } = opts;
  const monthLogs = logs.filter(
    (l) => l.employeeId === employee.id && isDateInPayPeriod(l.date, monthKey, payPeriodConfig)
  );
  if (monthLogs.length === 0) return false;

  const holidaySet = new Set(holidays.map((h) => h.date));
  const holidayMap = new Map(holidays.map((h) => [h.date, h.label]));

  // Agrupa por data
  const byDate = new Map<string, PointLog[]>();
  for (const l of monthLogs) {
    const arr = byDate.get(l.date);
    if (arr) arr.push(l);
    else byDate.set(l.date, [l]);
  }

  const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));

  let totalWorked = 0;
  let totalExpected = 0;
  const rows: (string | number)[][] = [];
  for (const date of dates) {
    const dayLogs = byDate.get(date) ?? [];
    const ent = dayLogs.find((l) => l.type === 'Entrada')?.time || '--:--';
    const almS = dayLogs.find((l) => l.type === 'Saída Almoço')?.time || '--:--';
    const almR = dayLogs.find((l) => l.type === 'Retorno Almoço')?.time || '--:--';
    const sai = dayLogs.find((l) => l.type === 'Saída')?.time || '--:--';
    const worked = computeWorkedMinutes(dayLogs, false);
    const workedLabel = worked > 0 ? formatHMColon(worked) : '--:--';
    const nonWork = isNonWorkDay(date, employee.weekdaysOnly, holidaySet);
    const expected = nonWork ? 0 : employee.dailyMinutes;
    const balance = worked > 0 ? worked - expected : 0;
    const balanceLabel = worked > 0 ? formatSigned(balance) : '--:--';
    const holidayLabel = isHoliday(date, holidaySet) ? holidayMap.get(date) || 'Feriado' : '';

    const observations = [
      holidayLabel,
      ...dayLogs.map((l) => l.note).filter(Boolean),
    ]
      .filter(Boolean)
      .join(' · ');

    if (worked > 0) {
      totalWorked += worked;
      totalExpected += expected;
    }

    rows.push([
      `${formatDateBR(date)}\n${getDayLabelShort(date)}`,
      ent,
      almS,
      almR,
      sai,
      workedLabel,
      balanceLabel,
      observations || '-',
    ]);
  }

  const balanceMonth = totalWorked - totalExpected;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Folha de Ponto', 14, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(formatPayPeriodKey(monthKey, payPeriodConfig), 14, 21);

  // Linha de identificação do colaborador
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(employee.name, 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const meta: string[] = [];
  if (employee.role) meta.push(employee.role);
  if (employee.email) meta.push(employee.email);
  meta.push(`Jornada: ${formatHM(employee.dailyMinutes)}`);
  meta.push(`Almoço: ${employee.lunchMinutes} min`);
  doc.text(meta.join('  ·  '), 14, 44);

  autoTable(doc, {
    startY: 50,
    head: [['Data', 'Entrada', 'S. Almoço', 'V. Almoço', 'Saída', 'Total', 'Saldo', 'Observações']],
    body: rows,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      7: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      // colorir a coluna de saldo
      if (data.section === 'body' && data.column.index === 6) {
        const txt = String(data.cell.raw ?? '');
        if (txt.startsWith('+')) data.cell.styles.textColor = [16, 134, 90];
        else if (txt.startsWith('-')) data.cell.styles.textColor = [185, 28, 28];
      }
    },
  });

  // Totais — adicionados no fim
  type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };
  const docWithAutoTable = doc as DocWithAutoTable;
  const endY = docWithAutoTable.lastAutoTable?.finalY ?? 60;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, endY + 5, pageW - 28, 18, 'F');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAIS DO PERÍODO', 18, endY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dias trabalhados: ${dates.filter((d) => (byDate.get(d) ?? []).length > 0 && computeWorkedMinutes(byDate.get(d) ?? [], false) > 0).length}`, 18, endY + 17);
  doc.text(`Trabalhado: ${formatHM(totalWorked)}`, 70, endY + 17);
  doc.text(`Esperado: ${formatHM(totalExpected)}`, 110, endY + 17);
  if (balanceMonth >= 0) doc.setTextColor(16, 134, 90);
  else doc.setTextColor(185, 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.text(`Saldo: ${balanceMonth >= 0 ? '+' : '−'}${formatHM(Math.abs(balanceMonth))}`, 148, endY + 17);

  // Rodapé
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const today = new Date();
  const stamp = `Gerado em ${today.toLocaleString('pt-BR')}`;
  const pageH = doc.internal.pageSize.getHeight();
  doc.text(stamp, 14, pageH - 8);
  doc.text('Ponto Certo', pageW - 14, pageH - 8, { align: 'right' });

  const filename = `folha_ponto_${monthKey}_${employee.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`;
  doc.save(filename);
  return true;
}
