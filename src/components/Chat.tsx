import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const socket: Socket = io();

export default function Chat({ name }: { name: string }) {
  const [messages, setMessages] = useState<{ sender: string, text: string }[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    socket.on('chat:message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off('chat:message');
    };
  }, []);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit('chat:message', { sender: name, text: input });
      setInput('');
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-4 p-4 border rounded-xl bg-gray-50">
      <h2 className="font-bold text-lg text-[#05556C]">Chat com Atendente</h2>
      <div className="h-64 overflow-y-auto flex flex-col gap-2 p-2 border rounded bg-white">
        {messages.map((msg, i) => (
          <div key={i} className={`p-2 rounded ${msg.sender === name ? 'bg-blue-100 self-end' : 'bg-gray-200 self-start'}`}>
            <span className="font-bold text-xs">{msg.sender}: </span>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 border rounded"
          placeholder="Digite sua mensagem..."
        />
        <button onClick={sendMessage} className="bg-[#05556C] text-white px-4 py-2 rounded">Enviar</button>
      </div>
    </div>
  );
}
