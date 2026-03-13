import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Calendar from './Calendar';
import { Calendar as CalendarIcon, Clock, User, Phone, Trash2, Edit2, CheckCircle, Filter, Search, MessageSquare, Plus, MessageCircle } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io();

type Request = {
  id: string;
  patientName: string;
  contact: string;
  city: string;
  type: string;
  timestamp: string;
  showExams?: number;
};

type Appointment = { 
  id: string, 
  patientName: string, 
  contact: string, 
  date: string, 
  time: string, 
  status: 'Scheduled' | 'Confirmed' | 'Cancelled' | 'Completed', 
  city?: string,
  type?: string,
  showExams?: number,
  observations?: string
};

export default function Agenda({ selectedPatient }: { selectedPatient: string | null }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [patientName, setPatientName] = useState('');
  const [contact, setContact] = useState('');
  const [city, setCity] = useState('Quirinópolis');
  const [type, setType] = useState('Nova Consulta');
  const [showExams, setShowExams] = useState(false);
  const [observations, setObservations] = useState('');
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notificationStatus, setNotificationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  
  useEffect(() => {
    fetch('/api/appointments').then(res => res.json()).then(setAppointments);
    fetch('/api/requests').then(res => res.json()).then(setRequests);
    if (selectedPatient) setContact(selectedPatient);

    // Socket listeners
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('new-request', (req: Request) => {
      setRequests(prev => [req, ...prev]);
      // Play a notification sound or show a toast if needed
      if (Notification.permission === 'granted') {
        new Notification('Nova Solicitação', { body: `${req.patientName} solicitou agendamento em ${req.city}` });
      }
    });

    socket.on('delete-request', (id: string) => {
      setRequests(prev => prev.filter(r => r.id !== id));
    });

    socket.on('new-appointment', (app: Appointment) => {
      setAppointments(prev => [...prev, app]);
    });

    socket.on('update-appointment', (app: Appointment) => {
      setAppointments(prev => prev.map(a => a.id === app.id ? app : a));
    });

    socket.on('delete-appointment', (id: string) => {
      setAppointments(prev => prev.filter(a => a.id !== id));
    });

    return () => {
      socket.off('new-request');
      socket.off('delete-request');
      socket.off('new-appointment');
      socket.off('update-appointment');
      socket.off('delete-appointment');
    };
  }, [selectedPatient]);

  const refreshData = () => {
    fetch('/api/appointments').then(res => res.json()).then(setAppointments);
    fetch('/api/requests').then(res => res.json()).then(setRequests);
  };

  const addAppointment = () => {
    if (date && time && patientName && contact) {
      setConfirmAdd(true);
    }
  };

  const confirmAddAppointment = () => {
    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientName, contact, date, time, status: 'Scheduled', city, type, showExams, observations }),
    }).then(res => res.json()).then(newApp => {
      setAppointments([...appointments, newApp]);
      setConfirmAdd(false);
      
      // If it was from a request, we might want to delete it, but let's keep it simple for now
      // and just refresh the lists
      refreshData();
      
      setPatientName('');
      setContact('');
      setDate('');
      setTime('');
      setObservations('');
      setShowExams(false);
    });
  };

  const handleRequestAction = (req: Request) => {
    setPatientName(req.patientName);
    setContact(req.contact);
    setCity(req.city);
    setType(req.type);
    setShowExams(req.showExams === 1);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeRequest = (id: string) => {
    fetch(`/api/requests/${id}`, { method: 'DELETE' }).then(() => {
      setRequests(requests.filter(r => r.id !== id));
    });
  };

  const updateStatus = (id: string, status: Appointment['status']) => {
    fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(() => {
      const updatedApp = appointments.find(a => a.id === id);
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

  const handleCalendarSelect = (selectedDate: string, selectedTime: string) => {
    setDate(selectedDate);
    setTime(selectedTime);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  const filteredAppointments = appointments
    .filter(app => {
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesCity = cityFilter === 'all' || app.city === cityFilter;
      const matchesSearch = app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           app.contact.includes(searchTerm);
      return matchesStatus && matchesCity && matchesSearch;
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <div className="p-6 max-w-6xl mx-auto relative">
      {notificationStatus && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-lg border animate-in slide-in-from-right duration-300 ${
          notificationStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {notificationStatus.type === 'success' ? <CheckCircle size={20} /> : <Trash2 size={20} />}
            <p className="font-semibold">{notificationStatus.message}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-[#05556C]" size={32} />
          <h1 className="text-3xl font-bold text-gray-800">Agenda do Dr. Emerson</h1>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar paciente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#05556C] outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Calendar and Form */}
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-[#05556C]" />
              Solicitações Pendentes
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {requests.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma solicitação pendente.</p>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 flex justify-between items-center group">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{req.patientName}</p>
                      <p className="text-xs text-gray-500">{req.city} • {req.type}</p>
                      <p className="text-[10px] text-gray-400">{format(parseISO(req.timestamp), "dd/MM HH:mm")}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleRequestAction(req)}
                        className="p-2 bg-[#05556C] text-white rounded-lg hover:bg-[#04445A]"
                        title="Preencher agendamento"
                      >
                        <Plus size={14} />
                      </button>
                      <button 
                        onClick={() => removeRequest(req.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        title="Remover solicitação"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CalendarIcon size={20} className="text-[#05556C]" />
              Datas Disponíveis
            </h2>
            <Calendar onSelect={handleCalendarSelect} />
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Edit2 size={20} className="text-[#05556C]" />
              Novo Agendamento
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  placeholder="Nome do Paciente" 
                  value={patientName} 
                  onChange={e => setPatientName(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#05556C] outline-none"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  placeholder="WhatsApp / Contato" 
                  value={contact} 
                  onChange={e => setContact(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#05556C] outline-none"
                />
              </div>

              {type === 'Retorno' && (
                <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer border border-gray-200">
                  <input 
                    type="checkbox" 
                    checked={showExams}
                    onChange={(e) => setShowExams(e.target.checked)}
                    className="w-4 h-4 accent-[#05556C]"
                  />
                  <span className="text-sm text-gray-700">Vou mostrar exames?</span>
                </label>
              )}

              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 text-gray-400" size={18} />
                <textarea 
                  placeholder="Observações (opcional)" 
                  value={observations} 
                  onChange={e => setObservations(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#05556C] outline-none min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#05556C] outline-none"
                  />
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="time" 
                    value={time} 
                    onChange={e => setTime(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#05556C] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select 
                  value={city} 
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#05556C] outline-none bg-white"
                >
                  <option value="Quirinópolis">Quirinópolis</option>
                  <option value="Caçu">Caçu</option>
                  <option value="São Simão">São Simão</option>
                </select>
                <select 
                  value={type} 
                  onChange={e => setType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#05556C] outline-none bg-white"
                >
                  <option value="Nova Consulta">Nova Consulta</option>
                  <option value="Retorno">Retorno</option>
                </select>
              </div>
              <button 
                onClick={addAppointment} 
                className="w-full bg-[#05556C] text-white py-3 rounded-lg font-bold hover:bg-[#04445A] transition-colors shadow-md"
              >
                Agendar Consulta
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: List of Appointments */}
        <div className="lg:col-span-7">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle size={20} className="text-[#05556C]" />
                Próximos Atendimentos
              </h2>
              
              <div className="flex gap-2">
                <div className="relative">
                  <Filter className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-7 pr-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#05556C] outline-none bg-white font-medium"
                  >
                    <option value="all">Todos Status</option>
                    <option value="Scheduled">Agendado</option>
                    <option value="Confirmed">Confirmado</option>
                    <option value="Cancelled">Cancelado</option>
                    <option value="Completed">Concluído</option>
                  </select>
                </div>
                
                <div className="relative">
                  <Filter className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                  <select 
                    value={cityFilter} 
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="pl-7 pr-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#05556C] outline-none bg-white font-medium"
                  >
                    <option value="all">Todas Cidades</option>
                    <option value="Quirinópolis">Quirinópolis</option>
                    <option value="Caçu">Caçu</option>
                    <option value="São Simão">São Simão</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <p className="text-center text-gray-400 py-12">Nenhum agendamento encontrado.</p>
              ) : (
                filteredAppointments.map(app => (
                    <div key={app.id} className="group p-4 border border-gray-100 rounded-xl hover:border-[#05556C]/30 hover:bg-gray-50 transition-all duration-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{app.patientName}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone size={14} /> {app.contact}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          app.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                          app.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                          app.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600 mb-4">
                        <span className="flex items-center gap-1">
                          <CalendarIcon size={14} className="text-[#05556C]" /> {formatDate(app.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} className="text-[#05556C]" /> {app.time}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          {app.city} • {app.type}
                          {app.showExams === 1 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                              MOSTRAR EXAMES
                            </span>
                          )}
                        </span>
                      </div>
                      
                      {app.observations && (
                        <div className="mb-4 p-2 bg-amber-50 border-l-2 border-amber-400 text-[11px] text-amber-800 italic">
                          "{app.observations}"
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div className="flex gap-2">
                          <a 
                            href={`https://wa.me/${app.contact.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${app.patientName},
Vamos continuar aqui seu agendamento.
Meu nome é Rafaela, irei dar procedimento ao seu atendimento.

📋 Dados da consulta:
👨‍⚕️ Médico: Dr. Emerson Luiz
📅 Data: ${format(parseISO(app.date), 'dd/MM/yyyy')}
⏰ Horário: ${app.time}
📍 Cidade: ${app.city}
🩺 Tipo: ${app.type || 'Consulta'}${app.showExams === 1 ? '\n🧪 Mostrar Exames: Sim' : ''}${app.observations ? `\n📝 Obs: ${app.observations}` : ''}`)}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold flex items-center gap-1"
                          >
                            <MessageCircle size={12} /> WhatsApp
                          </a>
                          <button 
                            onClick={() => setReschedulingAppointment(app)} 
                            className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"
                          >
                            <Edit2 size={12} /> Remarcar
                          </button>
                          <button 
                            onClick={() => setConfirmRemove(app.id)} 
                            className="text-red-600 hover:text-red-800 text-xs font-bold flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Remover
                          </button>
                        </div>
                        <select 
                          value={app.status} 
                          onChange={(e) => updateStatus(app.id, e.target.value as Appointment['status'])} 
                          className="text-xs border-none bg-transparent font-bold text-[#05556C] focus:ring-0 cursor-pointer"
                        >
                          <option value="Scheduled">Agendado</option>
                          <option value="Confirmed">Confirmado</option>
                          <option value="Cancelled">Cancelado</option>
                          <option value="Completed">Concluído</option>
                        </select>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      {reschedulingAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-xl mb-2">Remarcar Consulta</h3>
            <p className="text-gray-600 mb-6">Alterar data e horário para {reschedulingAppointment.patientName}?</p>
            <div className="space-y-4 mb-8">
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#05556C]" />
              </div>
              <div className="relative">
                <Clock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#05556C]" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReschedulingAppointment(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={rescheduleAppointment} className="flex-1 py-3 bg-[#05556C] text-white font-bold rounded-xl hover:bg-[#04445A] transition-colors shadow-md">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {confirmAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-xl mb-2">Confirmar Agendamento?</h3>
            <p className="text-gray-600 mb-6">Deseja agendar {patientName} para {formatDate(date)} às {time} em {city}?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAdd(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={confirmAddAppointment} className="flex-1 py-3 bg-[#05556C] text-white font-bold rounded-xl hover:bg-[#04445A] transition-colors shadow-md">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="font-bold text-xl mb-2">Remover Agendamento?</h3>
            <p className="text-gray-600 mb-8">Esta ação não pode ser desfeita. Deseja realmente remover este registro?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={() => removeAppointment(confirmRemove)} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-md">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

