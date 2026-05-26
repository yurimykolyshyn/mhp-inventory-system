import React, { useState, useEffect } from 'react';
import type { SessionUser, InventoryAudit } from './types';
import { Storage } from './services/storage';
import Login from './components/Login';
import ManagerApp from './components/manager/ManagerApp';
import AuditorApp from './components/auditor/AuditorApp';

const App: React.FC = () => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [audits, setAudits] = useState<InventoryAudit[]>([]);

  useEffect(() => {
    setUser(Storage.getSession());
    setAudits(Storage.getAudits());
  }, []);

  const handleLogin = (u: SessionUser) => {
    Storage.setSession(u);
    setUser(u);
    setAudits(Storage.getAudits());
  };

  const handleLogout = () => {
    Storage.setSession(null);
    setUser(null);
  };

  const handleUpdate = (a: InventoryAudit) => {
    Storage.saveAudit(a);
    setAudits(Storage.getAudits());
  };

  const handleDelete = (id: string) => {
    Storage.deleteAudit(id);
    setAudits(Storage.getAudits());
  };

  if (!user) return <Login onLogin={handleLogin} />;

  if (user.role === 'manager') {
    return (
      <ManagerApp
        user={user}
        audits={audits}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <AuditorApp
      user={user}
      audits={audits}
      onUpdate={handleUpdate}
      onLogout={handleLogout}
    />
  );
};

export default App;
