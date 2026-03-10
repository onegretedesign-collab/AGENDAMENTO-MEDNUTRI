import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Chat from './Chat';
import Agenda from './Agenda';

const socket = io();

export default function AttendantView({ onLogout }: { onLogout: () => void }) {
  const [rooms, setRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [newContact, setNewContact] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'agenda'>('chat');
  const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());
  const selectedRoomRef = useRef(selectedRoom);

  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
    if (selectedRoom) {
      setUnreadMessages(prev => {
        const next = new Set(prev);
        next.delete(selectedRoom);
        return next;
      });
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    socket.emit('get:rooms');
    socket.on('rooms:list', (rooms: string[]) => setRooms(rooms));
    socket.on('room:new', (room: string) => {
      setRooms(prev => [...prev, room]);
      if (!selectedRoomRef.current) {
        setSelectedRoom(room);
      }
    });
    socket.on('chat:message', (data) => {
      if (data.room !== selectedRoomRef.current) {
        setUnreadMessages(prev => new Set(prev).add(data.room));
        new Audio('https://actions.google.com/sounds/v1/notifications/beep_short.ogg').play().catch(console.error);
        if (Notification.permission === 'granted') {
          new Notification('Nova mensagem', { body: `Paciente ${data.room} enviou uma mensagem.` });
        }
      }
    });
    return () => { 
      socket.off('rooms:list'); 
      socket.off('room:new');
      socket.off('chat:message');
    };
  }, []);

  const handleJoinManual = () => {
    if (newContact.trim()) {
      setSelectedRoom(newContact.trim());
      setNewContact('');
      setActiveTab('chat');
    }
  };

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="p-4 border-b flex gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
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
          <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded ${activeTab === 'chat' ? 'bg-[#05556C] text-white' : 'bg-gray-200'}`}>Chat</button>
          <button onClick={() => setActiveTab('agenda')} className={`px-4 py-2 rounded ${activeTab === 'agenda' ? 'bg-[#05556C] text-white' : 'bg-gray-200'}`}>Agenda</button>
        </div>
        <button onClick={onLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Sair</button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className={`w-full flex ${activeTab === 'chat' ? '' : 'hidden'}`}>
          <div className="w-1/3 border-r p-4 overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">Pacientes Ativos</h2>
            {rooms.map(room => (
              <button key={room} onClick={() => setSelectedRoom(room)} className={`w-full p-2 border rounded mb-2 hover:bg-gray-100 flex justify-between items-center ${selectedRoom === room ? 'bg-blue-50 border-blue-500' : ''}`}>
                {room}
                {unreadMessages.has(room) && <span className="w-3 h-3 bg-red-500 rounded-full"></span>}
              </button>
            ))}
          </div>
          <div className="w-2/3 p-4 overflow-y-auto">
            {selectedRoom ? <Chat name="Atendente" contact={selectedRoom} /> : <p>Selecione um paciente ou digite o contato acima</p>}
          </div>
        </div>
        <div className={`w-full overflow-y-auto ${activeTab === 'agenda' ? '' : 'hidden'}`}>
          <Agenda selectedPatient={selectedRoom} onOpenChat={(contact) => { setSelectedRoom(contact); setActiveTab('chat'); }} />
        </div>
      </div>
    </div>
  );
}
