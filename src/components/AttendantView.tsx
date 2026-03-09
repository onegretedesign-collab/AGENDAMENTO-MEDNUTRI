import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Chat from './Chat';

const socket = io();

export default function AttendantView() {
  const [rooms, setRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  useEffect(() => {
    socket.emit('get:rooms');
    socket.on('rooms:list', (rooms: string[]) => setRooms(rooms));
    return () => { socket.off('rooms:list'); };
  }, []);

  return (
    <div className="flex w-full h-screen">
      <div className="w-1/3 border-r p-4">
        <h2 className="font-bold text-lg mb-4">Pacientes</h2>
        {rooms.map(room => (
          <button key={room} onClick={() => setSelectedRoom(room)} className="w-full p-2 border rounded mb-2 hover:bg-gray-100">
            {room}
          </button>
        ))}
      </div>
      <div className="w-2/3 p-4">
        {selectedRoom ? <Chat name="Atendente" contact={selectedRoom} /> : <p>Selecione um paciente</p>}
      </div>
    </div>
  );
}
