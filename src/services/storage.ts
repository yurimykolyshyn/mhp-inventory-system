import type { InventoryAudit, SessionUser } from '../types';

const KEYS = {
  AUDITS: 'mhp_inv_audits',
  SESSION: 'mhp_inv_session',
};

export const Storage = {
  getSession: (): SessionUser | null => {
    try { return JSON.parse(localStorage.getItem(KEYS.SESSION) || 'null'); }
    catch { return null; }
  },
  setSession: (user: SessionUser | null) => {
    if (user) localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    else localStorage.removeItem(KEYS.SESSION);
  },

  getAudits: (): InventoryAudit[] => {
    try { return JSON.parse(localStorage.getItem(KEYS.AUDITS) || '[]'); }
    catch { return []; }
  },
  saveAudit: (audit: InventoryAudit): void => {
    const audits = Storage.getAudits();
    const idx = audits.findIndex(a => a.id === audit.id);
    if (idx >= 0) audits[idx] = audit;
    else audits.unshift(audit);
    localStorage.setItem(KEYS.AUDITS, JSON.stringify(audits));
  },
  deleteAudit: (id: string): void => {
    const audits = Storage.getAudits().filter(a => a.id !== id);
    localStorage.setItem(KEYS.AUDITS, JSON.stringify(audits));
  },
};
