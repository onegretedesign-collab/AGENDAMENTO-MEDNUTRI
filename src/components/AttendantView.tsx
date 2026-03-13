import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Agenda from './Agenda';
import DocumentGenerator from './DocumentGenerator';

const socket = io();

export default function AttendantView({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'receituario'>('agenda');

  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="p-4 border-b flex gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('agenda')} className={`px-4 py-2 rounded ${activeTab === 'agenda' ? 'bg-[#05556C] text-white' : 'bg-gray-200'}`}>Agenda</button>
          <button onClick={() => setActiveTab('receituario')} className={`px-4 py-2 rounded ${activeTab === 'receituario' ? 'bg-[#05556C] text-white' : 'bg-gray-200'}`}>Receituário</button>
        </div>
        <button onClick={onLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Sair</button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-full overflow-y-auto p-4">
          {activeTab === 'agenda' && <Agenda selectedPatient={null} />}
          {activeTab === 'receituario' && <DocumentGenerator type="Receituário" />}
        </div>
      </div>
    </div>
  );
}
