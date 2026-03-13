import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, isBefore, startOfToday, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  onSelect: (date: string, time: string) => void;
}

export default function Calendar({ onSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
  ];

  useEffect(() => {
    fetch('/api/appointments')
      .then(res => res.json())
      .then(data => setAppointments(data));
  }, []);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-[#05556C]" />
        </button>
        <h2 className="text-lg font-bold text-[#05556C] capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronRight size={24} className="text-[#05556C]" />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayAppointments = appointments.filter(app => app.date === dateStr);
        const isPast = isBefore(day, startOfToday());
        const isDayWeekend = isWeekend(day);
        const isFull = dayAppointments.length >= 8;
        const isAvailable = !isPast && !isDayWeekend && !isFull;

        days.push(
          <div
            key={day.toString()}
            className={`relative h-12 flex items-center justify-center cursor-pointer transition-all duration-200 rounded-lg
              ${!isSameMonth(day, monthStart) ? 'text-gray-300' : ''}
              ${selectedDate && isSameDay(day, selectedDate) ? 'bg-[#05556C] text-white shadow-md' : 'hover:bg-gray-50'}
              ${!isAvailable && isSameMonth(day, monthStart) ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}
            `}
            onClick={() => isAvailable && setSelectedDate(cloneDay)}
          >
            <span className="text-sm font-medium">{formattedDate}</span>
            {isAvailable && isSameMonth(day, monthStart) && !isSameDay(day, selectedDate || new Date(0)) && (
              <div className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full"></div>
            )}
            {!isAvailable && isSameMonth(day, monthStart) && !isPast && (
              <div className="absolute bottom-1 w-1 h-1 bg-red-400 rounded-full"></div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="flex flex-col gap-1">{rows}</div>;
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (selectedDate) {
      onSelect(format(selectedDate, 'yyyy-MM-dd'), time);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      {renderHeader()}
      {renderDays()}
      {renderCells()}

      {selectedDate && (
        <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Horários disponíveis para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}:</h3>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map(time => {
              const dateStr = format(selectedDate, 'yyyy-MM-dd');
              const isTaken = appointments.some(app => app.date === dateStr && app.time === time);
              return (
                <button
                  key={time}
                  disabled={isTaken}
                  onClick={() => handleTimeSelect(time)}
                  className={`py-2 text-sm font-semibold rounded-lg transition-all duration-200 border
                    ${isTaken ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' : 
                      selectedTime === time ? 'bg-[#05556C] text-white border-[#05556C]' : 'bg-white text-[#05556C] border-[#05556C]/20 hover:border-[#05556C] hover:bg-[#05556C]/5'}
                  `}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="mt-6 flex gap-4 justify-center text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          <span>Indisponível</span>
        </div>
      </div>
    </div>
  );
}
