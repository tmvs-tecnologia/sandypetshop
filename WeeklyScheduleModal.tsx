import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from './supabaseClient';

interface WeeklyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WeeklyAppointment {
  id: string;
  pet_name: string;
  owner_name: string;
  appointment_time: string;
  service: string;
  status: string;
  type: 'Banho & Tosa' | 'Pet Móvel';
}

const WeeklyScheduleModal: React.FC<WeeklyScheduleModalProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<WeeklyAppointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'banho_tosa' | 'pet_movel'>('all');

  // Calculate current week's Sunday to Saturday dates
  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    const weekdayNames = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado'
    ];

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(sunday);
      currentDay.setDate(sunday.getDate() + i);
      days.push({
        name: weekdayNames[i],
        date: currentDay,
        formattedDate: currentDay.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        isoDateStr: currentDay.toISOString().split('T')[0] // YYYY-MM-DD
      });
    }
    return days;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      fetchWeeklyData();
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const fetchWeeklyData = async () => {
    setIsLoading(true);
    try {
      const sunday = weekDays[0].date;
      const saturday = weekDays[6].date;
      
      const startStr = `${sunday.toISOString().split('T')[0]}T00:00:00`;
      const endStr = `${saturday.toISOString().split('T')[0]}T23:59:59`;

      // Fetch from appointments table (Banho & Tosa)
      const { data: btData, error: btError } = await supabase
        .from('appointments')
        .select('id, pet_name, owner_name, appointment_time, service, status')
        .gte('appointment_time', startStr)
        .lte('appointment_time', endStr)
        .in('status', ['AGENDADO', 'pending', 'CONCLUÍDO']);

      if (btError) throw btError;

      // Fetch from pet_movel_appointments table (Pet Móvel)
      const { data: pmData, error: pmError } = await supabase
        .from('pet_movel_appointments')
        .select('id, pet_name, owner_name, appointment_time, service, status')
        .gte('appointment_time', startStr)
        .lte('appointment_time', endStr)
        .in('status', ['AGENDADO', 'pending', 'CONCLUÍDO']);

      if (pmError) throw pmError;

      const btList: WeeklyAppointment[] = (btData || []).map(apt => ({
        id: apt.id,
        pet_name: apt.pet_name,
        owner_name: apt.owner_name || '',
        appointment_time: apt.appointment_time,
        service: apt.service || 'Banho & Tosa',
        status: apt.status,
        type: 'Banho & Tosa'
      }));

      const pmList: WeeklyAppointment[] = (pmData || []).map(apt => ({
        id: apt.id,
        pet_name: apt.pet_name,
        owner_name: apt.owner_name || '',
        appointment_time: apt.appointment_time,
        service: apt.service || 'Pet Móvel',
        status: apt.status,
        type: 'Pet Móvel'
      }));

      // Group and sort combined appointments
      const combined = [...btList, ...pmList].sort((a, b) => {
        return new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime();
      });

      setAppointments(combined);
    } catch (err) {
      console.error('Erro ao buscar agenda semanal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // Filter by type
      if (selectedFilter === 'banho_tosa' && apt.type !== 'Banho & Tosa') return false;
      if (selectedFilter === 'pet_movel' && apt.type !== 'Pet Móvel') return false;

      // Filter by search term
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const petMatches = apt.pet_name.toLowerCase().includes(query);
        const ownerMatches = apt.owner_name.toLowerCase().includes(query);
        return petMatches || ownerMatches;
      }

      return true;
    });
  }, [appointments, selectedFilter, searchTerm]);

  // Group appointments by day of the week
  const groupedAppointments = useMemo(() => {
    const groups: Record<string, WeeklyAppointment[]> = {};
    weekDays.forEach(day => {
      groups[day.isoDateStr] = [];
    });

    filteredAppointments.forEach(apt => {
      const aptDateStr = apt.appointment_time.split('T')[0];
      if (groups[aptDateStr]) {
        groups[aptDateStr].push(apt);
      }
    });

    return groups;
  }, [filteredAppointments, weekDays]);

  if (!isVisible && !isOpen) return null;

  const modal = (
    <div 
      className={`fixed inset-0 z-[10002] flex items-center justify-center sm:p-4 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
      role="dialog" 
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-pink-950/40 backdrop-blur-md transition-opacity duration-500 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal Content - Full screen on mobile, elegant container on desktop */}
      <div 
        className={`relative bg-white w-full h-full sm:h-[85vh] sm:max-w-4xl sm:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(244,114,182,0.3)] flex flex-col transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] border-0 sm:border border-pink-100/50 overflow-hidden ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-30 flex flex-col gap-4 p-5 sm:p-8 bg-gradient-to-b from-pink-50 to-white border-b border-pink-50/50 rounded-t-none sm:rounded-t-[2.5rem] shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl">📅</span>
              <div>
                <h2 className="text-xl sm:text-3xl font-extrabold text-pink-950 tracking-tight leading-none mb-1">Agenda Semanal</h2>
                <p className="text-pink-800/60 text-[11px] sm:text-sm font-medium">Confirme se o agendamento do seu pet está na lista</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-white rounded-full text-pink-400 hover:text-pink-600 hover:bg-pink-50 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(244,114,182,0.2)] hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-400"
              aria-label="Fechar"
            >
              <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Controls: Search and Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center mt-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-pink-400 pointer-events-none text-base">🔍</span>
              <input
                type="text"
                placeholder="Busque pelo nome do Pet ou Tutor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-white border border-pink-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all shadow-sm font-medium placeholder:text-gray-400 text-gray-800"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-pink-400 hover:text-pink-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-pink-50/50 p-1 rounded-2xl border border-pink-100/30 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${selectedFilter === 'all' ? 'bg-white text-pink-700 shadow-sm' : 'text-pink-900/60 hover:text-pink-900'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedFilter('banho_tosa')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${selectedFilter === 'banho_tosa' ? 'bg-white text-pink-700 shadow-sm' : 'text-pink-900/60 hover:text-pink-900'}`}
              >
                🧼 Banho
              </button>
              <button
                onClick={() => setSelectedFilter('pet_movel')}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${selectedFilter === 'pet_movel' ? 'bg-white text-pink-700 shadow-sm' : 'text-pink-900/60 hover:text-pink-900'}`}
              >
                🚐 Móvel
              </button>
            </div>
          </div>
        </div>

        {/* Schedule List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50/50 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-pink-300">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
              <span className="text-sm font-medium text-pink-600">Carregando agendamentos...</span>
            </div>
          ) : (
            <div className="space-y-6 max-w-5xl mx-auto">
              {weekDays.map(day => {
                const dayAppointments = groupedAppointments[day.isoDateStr] || [];
                const isToday = new Date().toISOString().split('T')[0] === day.isoDateStr;

                return (
                  <div 
                    key={day.isoDateStr}
                    className={`bg-white rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden ${isToday ? 'border-pink-300 ring-1 ring-pink-300/30' : 'border-gray-100/80'}`}
                  >
                    {/* Day Header */}
                    <div className={`px-5 py-4 flex justify-between items-center border-b ${isToday ? 'bg-pink-50/40 border-pink-100' : 'bg-gray-50/30 border-gray-100'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-extrabold ${isToday ? 'text-pink-800 font-black' : 'text-pink-950'}`}>
                          {day.name}
                        </span>
                        {isToday && (
                          <span className="bg-pink-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                            Hoje
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-gray-500 bg-gray-100/80 px-3 py-1 rounded-full">
                        {day.formattedDate}
                      </span>
                    </div>

                    {/* Day Appointments */}
                    <div className="p-4 sm:p-5">
                      {dayAppointments.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {dayAppointments.map(apt => {
                            const timeStr = new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                            const isBanho = apt.type === 'Banho & Tosa';
                            
                            return (
                              <div 
                                key={apt.id}
                                className="group relative flex flex-row items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-pink-200 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(244,114,182,0.06)] transition-all duration-300 pl-5 overflow-hidden"
                              >
                                {/* Left Accent Color Bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isBanho ? 'bg-blue-400' : 'bg-purple-400'}`} />

                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  <div className="w-11 h-11 rounded-full bg-pink-50/50 border border-pink-100 flex items-center justify-center text-2xl shrink-0">
                                    {isBanho ? '🧼' : '🚐'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-pink-950 text-sm sm:text-base leading-tight group-hover:text-pink-600 transition-colors truncate">
                                      {apt.pet_name}
                                    </h4>
                                    <p className="text-gray-500 text-xs mt-1 leading-normal truncate">
                                      Tutor: <span className="font-semibold text-gray-700">{apt.owner_name || 'Não informado'}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end shrink-0 gap-1.5 ml-2">
                                  <span className="text-xs sm:text-sm font-black text-pink-950 bg-pink-50/60 border border-pink-100/50 px-2.5 py-1 rounded-xl shadow-[0_2px_6px_rgba(244,114,182,0.03)] whitespace-nowrap">
                                    🕒 {timeStr}
                                  </span>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap ${isBanho ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                                    {isBanho ? 'Banho' : 'Pet Móvel'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-gray-400 text-xs sm:text-sm font-medium italic">
                          🐾 Nenhum agendamento confirmado para este dia
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default WeeklyScheduleModal;
