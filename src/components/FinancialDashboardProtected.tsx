import React, { useState } from 'react';
import FinancialDashboardView from './FinancialDashboardView';

// Wrapper that blocks access to the Financial Dashboard behind a password.
// Password is hard‑coded as "172702" as requested.
const FinancialDashboardProtected: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');

  if (!unlocked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-pink-50 z-50">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full">
          <h2 className="text-2xl font-bold mb-4 text-pink-800">Acesso Financeiro</h2>
          <p className="mb-2 text-gray-700">Insira a senha para continuar</p>
          <input
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            placeholder="Senha"
          />
          {error && <p className="text-red-600 mb-2">{error}</p>}
          <button
            onClick={() => {
              if (pwd === '172702') {
                setUnlocked(true);
                setError('');
              } else {
                setError('Senha incorreta');
              }
            }}
            className="w-full bg-pink-600 text-white py-2 rounded hover:bg-pink-700 transition"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  // Once unlocked, just render the original dashboard view.
  return <FinancialDashboardView />;
};

export default FinancialDashboardProtected;
