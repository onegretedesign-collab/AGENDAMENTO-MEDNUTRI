import { useState, useEffect } from 'react';

type Appointment = { id: string, patientName: string, contact: string, date: string, time: string };

export default function Agenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [patientName, setPatientName] = useState('');
  const [contact, setContact] = useState('');

  useEffect(() => {
    fetch('/api/appointments').then(res => res.json()).then(setAppointments);
  }, []);

  const addAppointment = () => {
    if (date && time && patientName && contact) {
      fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName, contact, date, time }),
      }).then(res => res.json()).then(newApp => setAppointments([...appointments, newApp]));
    }
  };

  const removeAppointment = (id: string) => {
    fetch(`/api/appointments/${id}`, { method: 'DELETE' }).then(() => {
      setAppointments(appointments.filter(a => a.id !== id));
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
            <button onClick={() => removeAppointment(app.id)} className="text-red-500">Remover</button>
          </div>
        ))}
      </div>
    </div>
  );
}
