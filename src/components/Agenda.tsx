import { useState, useEffect } from 'react';

type Appointment = { id: string, patientName: string, contact: string, date: string, time: string, status: 'Scheduled' | 'Confirmed' | 'Cancelled' | 'Completed', pushToken?: string };

export default function Agenda({ selectedPatient }: { selectedPatient: string | null }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [patientName, setPatientName] = useState('');
  const [contact, setContact] = useState('');
  const [pushToken, setPushToken] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

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
      body: JSON.stringify({ patientName, contact, date, time, status: 'Scheduled', pushToken }),
    }).then(res => res.json()).then(newApp => {
      setAppointments([...appointments, newApp]);
      setConfirmAdd(false);
      
      setPatientName('');
      setContact('');
      setDate('');
      setTime('');
      setPushToken('');
    });
  };

  const updateStatus = (id: string, status: Appointment['status']) => {
    fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(() => {
      setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
    });
  };

  const rescheduleAppointment = () => {
    if (reschedulingAppointment && newDate && newTime) {
      fetch(`/api/appointments/${reschedulingAppointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate, time: newTime }),
      }).then(() => {
        setAppointments(appointments.map(a => a.id === reschedulingAppointment.id ? { ...a, date: newDate, time: newTime } : a));
        setReschedulingAppointment(null);
        setNewDate('');
        setNewTime('');
      });
    }
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
      <div className="flex gap-2 mb-4 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-2 rounded" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="border p-2 rounded" />
        <input placeholder="Nome" value={patientName} onChange={e => setPatientName(e.target.value)} className="border p-2 rounded" />
        <input placeholder="Contato" value={contact} onChange={e => setContact(e.target.value)} className="border p-2 rounded" />
        <input placeholder="Push Token" value={pushToken} onChange={e => setPushToken(e.target.value)} className="border p-2 rounded" />
        <button onClick={addAppointment} className="bg-[#05556C] text-white p-2 rounded">Agendar</button>
      </div>
      <div>
        {appointments.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map(app => (
          <div key={app.id} className="flex justify-between items-center p-2 border-b">
            <span>{app.date} {app.time} - {app.patientName} ({app.contact})</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setReschedulingAppointment(app)} className="text-blue-500 font-semibold text-sm">Remarcar</button>
              <select value={app.status} onChange={(e) => updateStatus(app.id, e.target.value as Appointment['status'])} className="border p-1 rounded text-sm">
                <option value="Scheduled">Scheduled</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Completed">Completed</option>
              </select>
              <button onClick={() => setConfirmRemove(app.id)} className="text-red-500">Remover</button>
            </div>
          </div>
        ))}
      </div>

      {reschedulingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4">Remarcar Consulta</h3>
            <p className="mb-4">Remarcar consulta de {reschedulingAppointment.patientName}?</p>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="border p-2 rounded w-full mb-2" />
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="border p-2 rounded w-full mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReschedulingAppointment(null)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
              <button onClick={rescheduleAppointment} className="px-4 py-2 bg-[#05556C] text-white rounded">Confirmar</button>
            </div>
          </div>
        </div>
      )}

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
