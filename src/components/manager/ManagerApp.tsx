import React, { useState, useRef } from 'react';
import type { SessionUser, InventoryAudit, InventoryItem } from '../../types';
import { Storage } from '../../services/storage';
import { parseInventoryExcel, exportToExcel } from '../excelUtils';
import {
  PackageIcon, PlusIcon, SearchIcon, TrashIcon, DownloadIcon,
  UploadIcon, CheckCircleIcon, LogOutIcon, ChevronRightIcon, FilterIcon, AlertIcon,
} from '../icons';

interface Props {
  user: SessionUser;
  audits: InventoryAudit[];
  onUpdate: (a: InventoryAudit) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
}

type ManagerView = 'list' | 'create' | 'detail';

const ManagerApp: React.FC<Props> = ({ user, audits, onUpdate, onDelete, onLogout }) => {
  const [view, setView] = useState<ManagerView>('list');
  const [selected, setSelected] = useState<InventoryAudit | null>(null);

  if (view === 'create') {
    return (
      <CreateWizard
        user={user}
        onCreated={a => { onUpdate(a); setSelected(a); setView('detail'); }}
        onCancel={() => setView('list')}
      />
    );
  }
  if (view === 'detail' && selected) {
    const current = audits.find(a => a.id === selected.id) ?? selected;
    return (
      <AuditDetail
        audit={current}
        onUpdate={a => { onUpdate(a); setSelected(a); }}
        onDelete={id => { onDelete(id); setView('list'); setSelected(null); }}
        onBack={() => setView('list')}
      />
    );
  }

  return <AuditList audits={audits} user={user} onSelect={a => { setSelected(a); setView('detail'); }} onCreate={() => setView('create')} onLogout={onLogout} />;
};

/* ─── Audit List ──────────────────────────────────────────────────────────── */
const AuditList: React.FC<{
  audits: InventoryAudit[]; user: SessionUser;
  onSelect: (a: InventoryAudit) => void; onCreate: () => void; onLogout: () => void;
}> = ({ audits, user, onSelect, onCreate, onLogout }) => {
  const [q, setQ] = useState('');
  const filtered = audits.filter(a => a.title.toLowerCase().includes(q.toLowerCase()));
  const active = audits.filter(a => a.status === 'active').length;
  const completed = audits.filter(a => a.status === 'completed').length;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <PackageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-neutral-900">MHP Інвентаризація</h1>
              <p className="text-xs text-neutral-500">{user.name} · Менеджер</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
              <PlusIcon className="w-4 h-4" /> Новий аудит
            </button>
            <button onClick={onLogout} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl hover:bg-neutral-100">
              <LogOutIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Всього аудитів', value: audits.length, color: 'text-neutral-900' },
            { label: 'Активних', value: active, color: 'text-blue-600' },
            { label: 'Завершених', value: completed, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-neutral-200 p-5">
              <p className="text-sm text-neutral-500">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Пошук аудитів…"
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-neutral-400">
            <PackageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{q ? 'Нічого не знайдено' : 'Аудитів поки немає'}</p>
            {!q && <button onClick={onCreate} className="mt-3 text-primary text-sm font-semibold hover:underline">Створити перший аудит →</button>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const confirmed = a.items.filter(i => i.isConfirmed).length;
              const pct = a.items.length > 0 ? Math.round((confirmed / a.items.length) * 100) : 0;
              return (
                <button key={a.id} onClick={() => onSelect(a)}
                  className="w-full bg-white border border-neutral-200 rounded-2xl p-5 text-left hover:border-primary/40 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-neutral-900 truncate">{a.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {a.status === 'active' ? 'Активний' : 'Завершено'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        {new Date(a.createdAt).toLocaleDateString('uk-UA')}
                        {a.deadline && ` · Дедлайн: ${new Date(a.deadline).toLocaleDateString('uk-UA')}`}
                      </p>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs text-neutral-500">
                          <span>{confirmed} / {a.items.length} підтверджено</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-neutral-300 shrink-0 mt-0.5" />
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

/* ─── Create Wizard ───────────────────────────────────────────────────────── */
type WizStep = 1 | 2 | 3;

const CreateWizard: React.FC<{ user: SessionUser; onCreated: (a: InventoryAudit) => void; onCancel: () => void }> = ({ user, onCreated, onCancel }) => {
  const [step, setStep] = useState<WizStep>(1);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseErr, setParseErr] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setParseErr('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseInventoryExcel(e.target!.result as ArrayBuffer);
        if (parsed.length === 0) { setParseErr('Не знайдено жодного рядка з кодом ЦБ'); return; }
        setItems(parsed);
      } catch { setParseErr('Помилка читання файлу. Перевірте формат.'); }
    };
    reader.readAsArrayBuffer(file);
  };

  const finish = () => {
    const audit: InventoryAudit = {
      id: `a${Date.now()}`,
      title: title.trim(),
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      deadline: deadline || undefined,
      status: 'active',
      items,
    };
    Storage.saveAudit(audit);
    onCreated(audit);
  };

  const steps = ['Назва', 'Завантаження', 'Підтвердження'];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h2 className="font-bold text-neutral-900">Новий аудит</h2>
          <button onClick={onCancel} className="text-sm text-neutral-500 hover:text-neutral-700">Скасувати</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-8">
        {/* Steps */}
        <div className="flex items-center gap-0">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i + 1 < step ? 'bg-green-500 text-white' : i + 1 === step ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-medium ${i + 1 === step ? 'text-neutral-900' : 'text-neutral-400'}`}>{s}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${i + 1 < step ? 'bg-green-500' : 'bg-neutral-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-neutral-700">Назва аудиту *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="напр. Інвентаризація КЦ Травень 2026"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus onKeyDown={e => e.key === 'Enter' && title.trim() && setStep(2)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-neutral-700">Дедлайн (необов'язково)</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button disabled={!title.trim()} onClick={() => setStep(2)}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Далі →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-neutral-900">Завантажте Excel-файл</h3>
              <p className="text-sm text-neutral-500 mt-1">Вивантаження залишків ОЗ з 1C (формат МХП)</p>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${drag ? 'border-primary bg-blue-50' : 'border-neutral-300 hover:border-primary hover:bg-blue-50/50'}`}
            >
              <UploadIcon className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
              {fileName ? (
                <div>
                  <p className="font-medium text-neutral-700">{fileName}</p>
                  <p className="text-sm text-green-600 mt-1">{items.length > 0 ? `✓ Завантажено ${items.length} позицій` : ''}</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-neutral-700">Перетягніть файл або натисніть</p>
                  <p className="text-sm text-neutral-400 mt-1">.xlsx, .xls</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            {parseErr && (
              <div className="flex gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                <AlertIcon className="w-4 h-4 shrink-0 mt-0.5" /> {parseErr}
              </div>
            )}
            {items.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                ✓ Зчитано <strong>{items.length}</strong> позицій обладнання
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border-2 border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50">← Назад</button>
              <button disabled={items.length === 0} onClick={() => setStep(3)}
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
                Далі →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-neutral-900">Підтвердження</h3>
              <p className="text-sm text-neutral-500 mt-1">Перевірте дані перед створенням</p>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Назва', value: title },
                { label: 'Дедлайн', value: deadline ? new Date(deadline).toLocaleDateString('uk-UA') : '—' },
                { label: 'Позицій', value: items.length.toString() },
                { label: 'Створює', value: user.name },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-2 border-b border-neutral-100 last:border-0">
                  <span className="text-neutral-500">{r.label}</span>
                  <span className="font-medium text-neutral-900">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 border-2 border-neutral-200 text-neutral-600 font-semibold rounded-xl hover:bg-neutral-50">← Назад</button>
              <button onClick={finish}
                className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700">
                Створити аудит
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Audit Detail ────────────────────────────────────────────────────────── */
type FilterTab = 'all' | 'confirmed' | 'pending';

const AuditDetail: React.FC<{
  audit: InventoryAudit;
  onUpdate: (a: InventoryAudit) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}> = ({ audit, onUpdate, onDelete, onBack }) => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [q, setQ] = useState('');
  const [groupByMol, setGroupByMol] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const confirmed = audit.items.filter(i => i.isConfirmed).length;
  const total = audit.items.length;
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  const filtered = audit.items.filter(item => {
    if (filter === 'confirmed' && !item.isConfirmed) return false;
    if (filter === 'pending' && item.isConfirmed) return false;
    if (q && !item.equipmentName.toLowerCase().includes(q.toLowerCase()) && !item.equipmentCode.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const toggleComplete = () => {
    onUpdate({ ...audit, status: audit.status === 'active' ? 'completed' : 'active' });
  };

  const grouped: Record<string, InventoryItem[]> = {};
  filtered.forEach(item => {
    const key = `${item.molName} (${item.molCode})`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 shrink-0">←</button>
              <div className="min-w-0">
                <h2 className="font-bold text-neutral-900 truncate">{audit.title}</h2>
                <p className="text-xs text-neutral-500">
                  {new Date(audit.createdAt).toLocaleDateString('uk-UA')}
                  {audit.deadline && ` · до ${new Date(audit.deadline).toLocaleDateString('uk-UA')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => exportToExcel(audit)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50">
                <DownloadIcon className="w-4 h-4" /> Експорт
              </button>
              <button onClick={toggleComplete}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl ${audit.status === 'active' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'}`}>
                <CheckCircleIcon className="w-4 h-4" />
                {audit.status === 'active' ? 'Завершити' : 'Відновити'}
              </button>
              <button onClick={() => setConfirmDelete(true)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-neutral-500">
              <span>{confirmed} / {total} підтверджено</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-6 py-4 space-y-4 flex-1">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Пошук обладнання…"
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button onClick={() => setGroupByMol(g => !g)}
            className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm font-medium transition-colors ${groupByMol ? 'border-primary bg-blue-50 text-primary' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}`}>
            <FilterIcon className="w-4 h-4" /> МОЛ
          </button>
        </div>

        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
          {([
            { key: 'all', label: `Всі (${audit.items.length})` },
            { key: 'confirmed', label: `Підтверджені (${confirmed})` },
            { key: 'pending', label: `Не підтверджені (${total - confirmed})` },
          ] as { key: FilterTab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filter === t.key ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {groupByMol ? (
          <div className="space-y-4">
            {(Object.entries(grouped) as [string, InventoryItem[]][]).map(([mol, molItems]) => (
              <div key={mol} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex justify-between items-center">
                  <span className="text-sm font-semibold text-neutral-700">{mol}</span>
                  <span className="text-xs text-neutral-500">{molItems.filter(i => i.isConfirmed).length}/{molItems.length}</span>
                </div>
                <div className="divide-y divide-neutral-100">
                  {molItems.map(item => <ItemRow key={item.id} item={item} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-neutral-400 text-sm">Нічого не знайдено</p>
            ) : filtered.map(item => <ItemRow key={item.id} item={item} />)}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-neutral-900">Видалити аудит?</h3>
            <p className="text-sm text-neutral-500">Цю дію не можна скасувати. Всі дані аудиту будуть видалені.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-50">Скасувати</button>
              <button onClick={() => onDelete(audit.id)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Видалити</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ItemRow: React.FC<{ item: InventoryItem }> = ({ item }) => (
  <div className="px-4 py-3 flex items-center gap-3">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${item.isConfirmed ? 'bg-green-100' : 'bg-neutral-100'}`}>
      {item.isConfirmed ? <CheckCircleIcon className="w-4 h-4 text-green-600" /> : <div className="w-2 h-2 rounded-full bg-neutral-300" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-neutral-900 truncate">{item.equipmentName}</p>
      <p className="text-xs text-neutral-400 font-mono">{item.equipmentCode}</p>
    </div>
    {item.isConfirmed && item.confirmedBy && (
      <div className="text-right">
        <p className="text-xs text-neutral-400">{item.confirmedBy}</p>
        {item.confirmedAt && <p className="text-xs text-neutral-300">{new Date(item.confirmedAt).toLocaleDateString('uk-UA')}</p>}
      </div>
    )}
  </div>
);

export default ManagerApp;
