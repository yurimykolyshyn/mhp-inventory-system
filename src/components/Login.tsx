import React, { useState } from 'react';
import type { SessionUser, Role } from '../types';
import { PackageIcon, UserIcon } from './icons';

interface Props {
  onLogin: (user: SessionUser) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('auditor');
  const [err, setErr] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Введіть ім'я"); return; }
    onLogin({ id: `u${Date.now()}`, name: name.trim(), role });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg mb-4">
            <PackageIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">MHP Інвентаризація</h1>
          <p className="text-neutral-500 text-sm mt-1">Система обліку обладнання</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-neutral-700">Ваше ім'я</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text" value={name}
                onChange={e => { setName(e.target.value); setErr(''); }}
                placeholder="Іваненко Іван"
                className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-700">Роль</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'manager', label: 'Менеджер', desc: 'Планування аудитів' },
                { value: 'auditor', label: 'Аудитор', desc: 'Підтвердження обладнання' },
              ] as { value: Role; label: string; desc: string }[]).map(r => (
                <button
                  key={r.value} type="button"
                  onClick={() => setRole(r.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${role === r.value ? 'border-primary bg-blue-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                  <div className={`text-sm font-semibold ${role === r.value ? 'text-primary' : 'text-neutral-700'}`}>{r.label}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Увійти
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
