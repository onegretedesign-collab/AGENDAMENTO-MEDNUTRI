import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io();

type Appointment = { id: string, patientName: string, contact: string, date: string, time: string };

export default function Agenda({ selectedPatient }: { selectedPatient: string | null }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [patientName, setPatientName] = useState('');
  const [contact, setContact] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmAdd, setConfirmAdd] = useState(false);

  useEffect(() => {
    fetch('/api/appointments').then(res => res.json()).then(setAppointments);
    if (selectedPatient) setContact(selectedPatient);
  }, [selectedPatient]);

  const addAppointment = () => {
    if (date && time && patientName && contact) {
      setConfirmAdd(true);
    }
  };

  const confirmAddAppointment = () => {
    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientName, contact, date, time }),
    }).then(res => res.json()).then(newApp => {
      setAppointments([...appointments, newApp]);
      setConfirmAdd(false);
      
      // Emit appointment proposal to chat
      socket.emit('chat:message', {
        room: contact,
        sender: 'Atendente',
        text: `Agendado para ${date} às ${time}. Por favor, confirme.`,
        type: 'appointment-proposal',
        appointmentId: newApp.id
      });

      setPatientName('');
      setContact('');
      setDate('');
      setTime('');
    });
  };

  const removeAppointment = (id: string) => {
    fetch(`/api/appointments/${id}`, { method: 'DELETE' }).then(() => {
      setAppointments(appointments.filter(a => a.id !== id));
      setConfirmRemove(null);
    });
  };

  return (
    <div className="p-4">
      <h2 className="font-bold text-lg mb-4">Agenda</h2>
      <div className="flex gap-2 mb-4">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-2 rounded" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="border p-2 rounded" />
        <input placeholder="Nome" value={patientName} onChange={e => setPatientName(e.target.value)} className="border p-2 rounded" />
        <input placeholder="Contato" value={contact} onChange={e => setContact(e.target.value)} className="border p-2 rounded" />
        <button onClick={addAppointment} className="bg-[#05556C] text-white p-2 rounded">Agendar</button>
      </div>
      <div>
        {appointments.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map(app => (
          <div key={app.id} className="flex justify-between items-center p-2 border-b">
            <span>{app.date} {app.time} - {app.patientName} ({app.contact})</span>
            <button onClick={() => setConfirmRemove(app.id)} className="text-red-500">Remover</button>
          </div>
        ))}
      </div>

      {confirmAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-lg mb-4">Confirmar Agendamento?</h3>
            <p className="mb-4">Deseja agendar {patientName} para {date} às {time}?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmAdd(false)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
              <button onClick={confirmAddAppointment} className="px-4 py-2 bg-[#05556C] text-white rounded">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-lg mb-4">Confirmar Remoção?</h3>
            <p className="mb-4">Deseja realmente remover este agendamento?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmRemove(null)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
              <button onClick={() => removeAppointment(confirmRemove)} className="px-4 py-2 bg-red-500 text-white rounded">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
