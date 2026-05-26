import React, { useState } from 'react';
import type { SessionUser, InventoryAudit, InventoryItem, ConfirmMethod } from '../../types';
import { Storage } from '../../services/storage';
import { PackageIcon, SearchIcon, CheckCircleIcon, LogOutIcon, XIcon, CheckIcon, AlertIcon } from '../icons';
import QRScanner from '../QRScanner';

interface Props {
  user: SessionUser;
  audits: InventoryAudit[];
  onUpdate: (a: InventoryAudit) => void;
  onLogout: () => void;
}

type AuditorView = 'list' | 'audit';

const AuditorApp: React.FC<Props> = ({ user, audits, onUpdate, onLogout }) => {
  const [view, setView] = useState<AuditorView>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeAudits = audits.filter(a => a.status === 'active');
  const selected = audits.find(a => a.id === selectedId) ?? null;

  if (view === 'audit' && selected) {
    return (
      <AuditView
        audit={selected}
        user={user}
        onUpdate={a => onUpdate(a)}
        onBack={() => { setView('list'); setSelectedId(null); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <PackageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-neutral-900 text-sm">MHP Інвентаризація</h1>
              <p className="text-xs text-neutral-500">{user.name} · Аудитор</p>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl">
            <LogOutIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-4">
        <h2 className="font-semibold text-neutral-700">Активні аудити</h2>
        {activeAudits.length === 0 ? (
          <div className="text-center py-16 text-neutral-400">
            <PackageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Немає активних аудитів</p>
            <p className="text-xs mt-1">Зверніться до менеджера</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAudits.map(a => {
              const confirmed = a.items.filter(i => i.isConfirmed).length;
              const pct = a.items.length > 0 ? Math.round((confirmed / a.items.length) * 100) : 0;
              return (
                <button key={a.id} onClick={() => { setSelectedId(a.id); setView('audit'); }}
                  className="w-full bg-white border border-neutral-200 rounded-2xl p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 truncate">{a.title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {a.items.length} позицій
                        {a.deadline && ` · до ${new Date(a.deadline).toLocaleDateString('uk-UA')}`}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary shrink-0">{pct}%</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>{confirmed} підтверджено</span>
                      <span>{a.items.length - confirmed} залишилось</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Audit View ──────────────────────────────────────────────────────────── */
const AuditView: React.FC<{
  audit: InventoryAudit; user: SessionUser;
  onUpdate: (a: InventoryAudit) => void; onBack: () => void;
}> = ({ audit, user, onUpdate, onBack }) => {
  const [q, setQ] = useState('');
  const [confirmingItem, setConfirmingItem] = useState<InventoryItem | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrError, setQrError] = useState('');
  const [toast, setToast] = useState('');

  const confirmed = audit.items.filter(i => i.isConfirmed).length;
  const pct = audit.items.length > 0 ? Math.round((confirmed / audit.items.length) * 100) : 0;

  const filtered = audit.items.filter(item => {
    if (!q) return true;
    return item.equipmentName.toLowerCase().includes(q.toLowerCase()) || item.equipmentCode.toLowerCase().includes(q.toLowerCase());
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const confirm = (item: InventoryItem, method: ConfirmMethod, notes?: string) => {
    const updated: InventoryAudit = {
      ...audit,
      items: audit.items.map(i => i.id === item.id
        ? { ...i, isConfirmed: true, confirmMethod: method, confirmedBy: user.name, confirmedAt: new Date().toISOString(), notes: notes || i.notes }
        : i),
    };
    Storage.saveAudit(updated);
    onUpdate(updated);
    setConfirmingItem(null);
    showToast(`✓ ${item.equipmentCode} підтверджено`);
  };

  const unconfirm = (item: InventoryItem) => {
    const updated: InventoryAudit = {
      ...audit,
      items: audit.items.map(i => i.id === item.id
        ? { ...i, isConfirmed: false, confirmMethod: undefined, confirmedBy: undefined, confirmedAt: undefined }
        : i),
    };
    Storage.saveAudit(updated);
    onUpdate(updated);
  };

  const handleQRScan = (raw: string) => {
    setShowQR(false);
    // Формат QR: "ЦБ[МОЛ]-ЦБ[обладнання]" — беремо останній ЦБ-код (код обладнання)
    // Також підтримується просто "ЦБ[обладнання]"
    const parts = raw.match(/ЦБ\d+/g) ?? [];
    const equipmentCode = parts.length >= 2 ? parts[parts.length - 1] : parts[0] ?? raw.trim();

    if (!equipmentCode) { setQrError(`Не вдалося розпізнати код: "${raw}"`); return; }

    const item = audit.items.find(i => i.equipmentCode === equipmentCode);
    if (!item) { setQrError(`Обладнання не знайдено в аудиті: "${equipmentCode}"`); return; }
    if (item.isConfirmed) { showToast(`⚠ Вже підтверджено: ${equipmentCode}`); return; }

    const updated: InventoryAudit = {
      ...audit,
      items: audit.items.map(i => i.id === item.id
        ? { ...i, isConfirmed: true, confirmMethod: 'qr', confirmedBy: user.name, confirmedAt: new Date().toISOString() }
        : i),
    };
    Storage.saveAudit(updated);
    onUpdate(updated);
    showToast(`✓ ${equipmentCode} підтверджено`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500">←</button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-neutral-900 text-sm truncate">{audit.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-semibold text-primary shrink-0">{confirmed}/{audit.items.length}</span>
            </div>
          </div>
          <button onClick={() => setShowQR(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-xl">
            QR
          </button>
        </div>
      </header>

      {qrError && (
        <div className="mx-4 mt-3 flex gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          <AlertIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{qrError}</span>
          <button onClick={() => setQrError('')}><XIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Пошук…"
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-24 space-y-2">
        {filtered.map(item => (
          <div key={item.id}
            className={`bg-white border rounded-2xl p-4 flex items-center gap-3 ${item.isConfirmed ? 'border-green-200' : 'border-neutral-200'}`}>
            <button
              onClick={() => item.isConfirmed ? unconfirm(item) : setConfirmingItem(item)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${item.isConfirmed ? 'bg-green-500 text-white' : 'bg-neutral-100 text-neutral-400 hover:bg-primary hover:text-white'}`}>
              {item.isConfirmed ? <CheckIcon className="w-5 h-5" /> : <div className="w-3 h-3 rounded border-2 border-current" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 leading-tight">{item.equipmentName}</p>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">{item.equipmentCode}</p>
              {item.isConfirmed && item.confirmedBy && (
                <p className="text-xs text-green-600 mt-0.5">{item.confirmedBy} · {item.confirmMethod === 'qr' ? 'QR' : item.confirmMethod === 'manual' ? 'Вручну' : 'Вибір'}</p>
              )}
            </div>
            {!item.isConfirmed && (
              <button onClick={() => setConfirmingItem(item)}
                className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-xl hover:bg-primary hover:text-white transition-colors">
                Підтвердити
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmingItem && (
        <ConfirmModal
          item={confirmingItem}
          audit={audit}
          onConfirm={(method, notes) => confirm(confirmingItem, method, notes)}
          onClose={() => setConfirmingItem(null)}
        />
      )}

      {/* QR Scanner */}
      {showQR && <QRScanner onScan={handleQRScan} onClose={() => setShowQR(false)} />}
    </div>
  );
};

/* ─── Confirm Modal ───────────────────────────────────────────────────────── */
const ConfirmModal: React.FC<{
  item: InventoryItem; audit: InventoryAudit;
  onConfirm: (method: ConfirmMethod, notes?: string) => void; onClose: () => void;
}> = ({ item, audit, onConfirm, onClose }) => {
  const [notes, setNotes] = useState(item.notes ?? '');
  const [manualCode, setManualCode] = useState('');
  const [manualErr, setManualErr] = useState('');
  const [tab, setTab] = useState<'select' | 'manual'>('select');

  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) { setManualErr('Введіть код'); return; }
    if (code !== item.equipmentCode) {
      const other = audit.items.find(i => i.equipmentCode === code);
      if (!other) { setManualErr('Код не знайдено'); return; }
      setManualErr(`Це код іншого обладнання: ${other.equipmentName}`);
      return;
    }
    onConfirm('manual', notes);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="bg-white rounded-t-3xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-bold text-neutral-900 truncate">{item.equipmentName}</h3>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">{item.equipmentCode}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100"><XIcon className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
          {(['select', 'manual'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tab === t ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}>
              {t === 'select' ? 'Вибір зі списку' : 'Ввести код'}
            </button>
          ))}
        </div>

        {tab === 'select' && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">Підтвердити наявність обладнання?</p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500">Нотатка (необов'язково)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Стан обладнання, зауваження…"
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button onClick={() => onConfirm('select', notes)}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 flex items-center justify-center gap-2">
              <CheckIcon className="w-4 h-4" /> Підтвердити наявність
            </button>
          </div>
        )}

        {tab === 'manual' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500">Інвентарний код обладнання</label>
              <input value={manualCode} onChange={e => { setManualCode(e.target.value); setManualErr(''); }}
                placeholder={item.equipmentCode}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus onKeyDown={e => e.key === 'Enter' && submitManual()}
              />
              {manualErr && <p className="text-xs text-red-500">{manualErr}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500">Нотатка</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Необов'язково"
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button onClick={submitManual}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2">
              <CheckIcon className="w-4 h-4" /> Підтвердити
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditorApp;
