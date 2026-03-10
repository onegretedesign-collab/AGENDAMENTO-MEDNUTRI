import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const socket: Socket = io();

export default function Chat({ name, contact }: { name: string, contact: string }) {
  const [messages, setMessages] = useState<{ sender: string, text: string, type?: string, appointmentId?: string }[]>([]);
  const [input, setInput] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    socket.emit('chat:join', contact);
    socket.on('chat:message', (data) => {
      setMessages((prev) => [...prev, data]);
    });
    socket.on('chat:appointment-confirmed', (data) => {
      setMessages((prev) => [...prev, { sender: 'Sistema', text: 'Consulta agendada com sucesso!' }]);
      
      // Notify patient via WhatsApp
      fetch('/api/notify-patient-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: contact,
          message: 'Consulta agendada com sucesso! O atendimento será encerrado em 5 segundos.'
        })
      }).catch(console.error);

      setTimeout(() => {
        setMessages((prev) => [...prev, { sender: 'Sistema', text: 'O atendimento será encerrado em 5 segundos.' }]);
        setTimeout(() => {
          setIsClosed(true);
        }, 5000);
      }, 1000);
    });

    if (name !== 'Atendente' && !localStorage.getItem(`mednutri_auto_sent_${contact}`)) {
      const msg = 'Olá, gostaria de agendar meu retorno ou consulta?';
      socket.emit('chat:message', { room: contact, sender: name, text: msg });
      localStorage.setItem(`mednutri_auto_sent_${contact}`, 'true');
    }

    return () => {
      socket.off('chat:message');
      socket.off('chat:appointment-confirmed');
    };
  }, [contact, name]);

  const confirmAppointment = (appointmentId: string) => {
    socket.emit('chat:appointment-confirmed', { room: contact, appointmentId });
  };

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit('chat:message', { room: contact, sender: name, text: input });
      setInput('');
    }
  };

  if (isClosed) {
    return (
      <div className="w-full max-w-md flex flex-col gap-4 p-4 border rounded-xl bg-gray-50 items-center justify-center">
        <h2 className="font-bold text-lg text-[#05556C]">Chat Encerrado</h2>
        <p>O atendimento foi finalizado.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-4 p-4 border rounded-xl bg-gray-50">
      <h2 className="font-bold text-lg text-[#05556C]">Chat com Atendente</h2>
      <div className="h-64 overflow-y-auto flex flex-col gap-2 p-2 border rounded bg-white">
        {messages.map((msg, i) => (
          <div key={i} className={`p-2 rounded ${msg.sender === name ? 'bg-blue-100 self-end' : 'bg-gray-200 self-start'}`}>
            <span className="font-bold text-xs">{msg.sender}: </span>
            {msg.text}
            {msg.type === 'appointment-proposal' && (
              <button onClick={() => confirmAppointment(msg.appointmentId!)} className="block mt-2 bg-green-500 text-white px-2 py-1 rounded text-sm">Confirmar</button>
            )}
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
