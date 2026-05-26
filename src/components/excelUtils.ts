import * as XLSX from 'xlsx';
import type { InventoryItem, InventoryAudit } from '../types';

export function parseInventoryExcel(buffer: ArrayBuffer): InventoryItem[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null });

  const items: InventoryItem[] = [];
  let molName = '';
  let molCode = '';

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any[];
    if (!row || !Array.isArray(row)) continue;
    const code = row[7];
    if (!code || !String(code).startsWith('ЦБ')) continue;
    const rMol = row[0] ? String(row[0]).trim() : '';
    const rCode = row[3] ? String(row[3]).trim() : '';
    const rName = row[4] ? String(row[4]).trim() : '';
    if (rMol) molName = rMol;
    if (rCode) molCode = rCode;
    if (rName) {
      items.push({
        id: `i${Date.now()}${i}${Math.random().toString(36).slice(2, 6)}`,
        molName, molCode,
        equipmentName: rName,
        equipmentCode: String(code).trim(),
        isConfirmed: false,
      });
    }
  }
  return items;
}

export function exportToExcel(audit: InventoryAudit): void {
  const confirmed = audit.items.filter(i => i.isConfirmed).length;
  const total = audit.items.length;
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ['Звіт інвентаризації обладнання'],
    [],
    ['Аудит:', audit.title],
    ['Дата:', new Date(audit.createdAt).toLocaleDateString('uk-UA')],
    ['Дедлайн:', audit.deadline ? new Date(audit.deadline).toLocaleDateString('uk-UA') : '—'],
    ['Статус:', audit.status === 'completed' ? 'Завершено' : 'Активний'],
    ['Прогрес:', `${confirmed} з ${total} (${pct}%)`],
  ]);
  summary['!cols'] = [{ wch: 15 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, summary, 'Підсумок');

  const header = ['МОЛ', 'Код МОЛ', 'Назва обладнання', 'Інв. код', 'Статус', 'Спосіб', 'Підтвердив', 'Дата', 'Нотатка'];
  const rows = audit.items.map(it => [
    it.molName, it.molCode, it.equipmentName, it.equipmentCode,
    it.isConfirmed ? '✓ Підтверджено' : '— Не підтверджено',
    it.confirmMethod === 'qr' ? 'QR-код' : it.confirmMethod === 'manual' ? 'Ручне' : it.confirmMethod === 'select' ? 'Вибір' : '',
    it.confirmedBy ?? '',
    it.confirmedAt ? new Date(it.confirmedAt).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }) : '',
    it.notes ?? '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 55 }, { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Обладнання');

  const filename = audit.title.replace(/[^\wа-яА-ЯіїєёЁa-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
