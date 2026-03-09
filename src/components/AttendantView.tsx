import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Chat from './Chat';

const socket = io();

export default function AttendantView() {
  const [rooms, setRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [newContact, setNewContact] = useState('');

  useEffect(() => {
    socket.emit('get:rooms');
    socket.on('rooms:list', (rooms: string[]) => setRooms(rooms));
    return () => { socket.off('rooms:list'); };
  }, []);

  const handleJoinManual = () => {
    if (newContact.trim()) {
      setSelectedRoom(newContact.trim());
      setNewContact('');
    }
  };

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="p-4 border-b flex gap-4 items-center">
        <button onClick={() => socket.emit('get:rooms')} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Atualizar Lista</button>
        <div className="flex gap-2">
          <input 
            value={newContact}
            onChange={(e) => setNewContact(e.target.value)}
            placeholder="Contato do paciente"
            className="p-2 border rounded"
          />
          <button onClick={handleJoinManual} className="px-4 py-2 bg-[#05556C] text-white rounded hover:bg-[#04445A]">Entrar em atendimento</button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r p-4 overflow-y-auto">
          <h2 className="font-bold text-lg mb-4">Pacientes Ativos</h2>
          {rooms.map(room => (
            <button key={room} onClick={() => setSelectedRoom(room)} className={`w-full p-2 border rounded mb-2 hover:bg-gray-100 ${selectedRoom === room ? 'bg-blue-50 border-blue-500' : ''}`}>
              {room}
            </button>
          ))}
        </div>
        <div className="w-2/3 p-4 overflow-y-auto">
          {selectedRoom ? <Chat name="Atendente" contact={selectedRoom} /> : <p>Selecione um paciente ou digite o contato acima</p>}
        </div>
      </div>
    </div>
  );
}
