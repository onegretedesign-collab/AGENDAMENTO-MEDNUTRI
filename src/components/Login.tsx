import { useState } from 'react';
import React from 'react';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === 'Mednutri' && password === 'Med12345') {
      onLogin();
    } else {
      setError('Credenciais inválidas');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#05556C]">Login Atendente</h2>
        <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Login" className="w-full p-4 mb-4 border rounded-xl" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full p-4 mb-4 border rounded-xl" />
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button type="submit" className="w-full py-4 bg-[#05556C] text-white rounded-xl font-semibold">Entrar</button>
      </form>
    </div>
  );
}
