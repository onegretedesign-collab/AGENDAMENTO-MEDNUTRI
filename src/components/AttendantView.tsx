import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Agenda from './Agenda';

const socket = io();

export default function AttendantView({ onLogout }: { onLogout: () => void }) {
  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="p-4 border-b flex gap-4 items-center justify-between">
        <h1 className="font-bold text-lg">Agenda</h1>
        <button onClick={onLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Sair</button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-full overflow-y-auto">
          <Agenda selectedPatient={null} />
        </div>
      </div>
    </div>
  );
}
