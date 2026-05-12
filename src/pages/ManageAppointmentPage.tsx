import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Phone, 
    Search, 
    Calendar, 
    Clock, 
    MapPin, 
    Scissors, 
    Car, 
    Home,
    AlertCircle,
    CheckCircle2,
    XCircle,
    RefreshCw,
    ChevronRight,
    Sparkles,
    PawPrint,
    Loader2,
    CalendarDays,
    PhoneOutgoing,
    Ban
} from 'lucide-react';

const LOGO_URL = 'https://i.imgur.com/M3Gt3OA.png';

interface Appointment {
    id: string;
    table: 'appointments' | 'pet_movel_appointments' | 'agendamento_banhotosa';
    pet_name: string;
    owner_name: string;
    whatsapp: string;
    service: string;
    appointment_time: string;
    status?: string;
    condominium?: string;
    cancelled_by_client?: boolean;
    cancelled_at?: string;
}

const BATH_GROOMING_HOURS = [10, 11, 12, 14, 15, 16, 17];
const PET_MOBILE_HOURS = [9, 10, 11, 12, 14, 15, 16, 17];
const CONDOMINIUMS = [
    { name: 'Vitta Parque', day: 'Quarta-feira', dayNumber: 3 },
    { name: 'Max Haus', day: 'Quinta-feira', dayNumber: 4 },
    { name: 'Paseo', day: 'Sexta-feira', dayNumber: 5 },
];

export const ManageAppointmentPage: React.FC = () => {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [error, setError] = useState('');
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [availableHours, setAvailableHours] = useState<number[]>([]);
    const [bookedHours, setBookedHours] = useState<number[]>([]);
    const [filteredDates, setFilteredDates] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    useEffect(() => {
        const generateDates = () => {
            const today = new Date();
            const dateList: string[] = [];
            for (let i = 0; i < 30; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dayOfWeek = date.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    dateList.push(date.toISOString().split('T')[0]);
                }
            }
            setAvailableDates(dateList);
        };
        generateDates();
    }, []);

    useEffect(() => {
        const filterDatesForService = () => {
            if (!selectedAppointment) return;
            
            const type = selectedAppointment.table === 'agendamento_banhotosa' ? 'fixed' : 'mobile';
            
            if (type === 'mobile') {
                const condo = CONDOMINIUMS.find(c => c.name === selectedAppointment.condominium);
                if (condo) {
                    const filtered = availableDates.filter(date => {
                        const dateObj = new Date(date + 'T00:00:00');
                        return dateObj.getDay() === condo.dayNumber;
                    });
                    setFilteredDates(filtered);
                } else {
                    setFilteredDates(availableDates);
                }
            } else {
                setFilteredDates(availableDates);
            }
        };
        
        filterDatesForService();
    }, [availableDates, selectedAppointment]);

    useEffect(() => {
        if (rescheduleDate && selectedAppointment) {
            const type = selectedAppointment.table === 'agendamento_banhotosa' ? 'fixed' : 'mobile';
            const hours = type === 'fixed' ? BATH_GROOMING_HOURS : PET_MOBILE_HOURS;
            setAvailableHours(hours);
            setBookedHours([]);
        }
    }, [rescheduleDate, selectedAppointment]);

    useEffect(() => {
        if (rescheduleDate && selectedAppointment) {
            fetchBookedHours(rescheduleDate);
        }
    }, [rescheduleDate, selectedAppointment, showRescheduleModal]);

    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
        return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(formatPhone(e.target.value));
        setError('');
    };

    const formatDate = (dateStr: string) => {
        try {
            if (!dateStr) return 'Data inválida';
            const parts = dateStr.split('T')[0].split('-');
            const [year, month, day] = parts.map(Number);
            const date = new Date(year, month - 1, day);
            if (isNaN(date.getTime())) return 'Data inválida';
            return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        } catch {
            return 'Data inválida';
        }
    };

    const formatDateLong = (dateStr: string) => {
        try {
            if (!dateStr) return 'Data inválida';
            const parts = dateStr.split('T')[0].split('-');
            const [year, month, day] = parts.map(Number);
            const date = new Date(year, month - 1, day);
            if (isNaN(date.getTime())) return 'Data inválida';
            
            const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
            const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            
            return `${weekdays[date.getDay()]} ${day} de ${months[month - 1]}`;
        } catch {
            return 'Data inválida';
        }
    };

    const formatTime = (dateStr: string) => {
        try {
            if (!dateStr) return '--:--';
            
            const parts = dateStr.split('T');
            if (parts.length < 2) return '--:--';
            
            const timeParts = parts[1].split(':');
            if (timeParts.length >= 2) {
                let h = parseInt(timeParts[0], 10);
                h -= 3;
                if (h < 0) h += 24;
                return `${String(h).padStart(2, '0')}:${timeParts[1]}`;
            }
            
            return '--:--';
        } catch {
            return '--:--';
        }
    };

    const getServiceIcon = (table: string) => {
        switch (table) {
            case 'agendamento_banhotosa': return <Scissors className="w-5 h-5" />;
            case 'pet_movel_appointments': return <Car className="w-5 h-5" />;
            default: return <Home className="w-5 h-5" />;
        }
    };

    const getServiceLabel = (table: string) => {
        switch (table) {
            case 'agendamento_banhotosa': return 'Banho & Tosa';
            case 'pet_movel_appointments': return 'Pet Móvel';
            default: return 'Agendamento';
        }
    };

    const getServiceType = (table: string) => {
        return table === 'agendamento_banhotosa' ? 'fixed' : 'mobile';
    };

    const fetchBookedHours = async (date: string) => {
        if (!selectedAppointment) return;
        
        const type = getServiceType(selectedAppointment.table);
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        const targetTable = type === 'fixed' ? 'agendamento_banhotosa' : 'pet_movel_appointments';
        
        let query = supabase.from(targetTable).select('appointment_time').gte('appointment_time', startOfDay).lte('appointment_time', endOfDay);
        
        const { data, error } = await query;

        if (error) {
            console.error('Erro ao buscar horários:', error);
            setBookedHours([]);
            return;
        }

        const hours = (data || []).map(apt => {
            const d = new Date(apt.appointment_time);
            return d.getHours();
        });
        
        console.log('Horários ocupados para', date, ':', hours, 'total:', hours.length);
        setBookedHours(hours);
    };

    const searchAppointments = async () => {
        if (phone.length < 10) {
            setError('Digite um número de telefone completo');
            return;
        }

        setLoading(true);
        setError('');
        setSearched(true);
        setSuccessMessage('');

        try {
            const digits = phone.replace(/\D/g, '');
            
            const last4 = digits.slice(-4);
            const last5 = digits.slice(-5);
            const last8 = digits.slice(-8);
            
            console.log('Buscando com fragmentos:', { last4, last5, last8 });

            const [appointmentsData, petMovelData, bathGroomData] = await Promise.all([
                supabase.from('appointments').select('*').or(`whatsapp.ilike.%${last4}%,whatsapp.ilike.%${last5}%,whatsapp.ilike.%${last8}%,whatsapp.ilike.%${digits}%`).order('appointment_time', { ascending: true }),
                supabase.from('pet_movel_appointments').select('*').or(`whatsapp.ilike.%${last4}%,whatsapp.ilike.%${last5}%,whatsapp.ilike.%${last8}%,whatsapp.ilike.%${digits}%`).order('appointment_time', { ascending: true }),
                supabase.from('agendamento_banhotosa').select('*').or(`whatsapp.ilike.%${last4}%,whatsapp.ilike.%${last5}%,whatsapp.ilike.%${last8}%,whatsapp.ilike.%${digits}%`).order('appointment_time', { ascending: true })
            ]);

            console.log('appointments:', appointmentsData.data?.length || 0);
            console.log('pet_movel:', petMovelData.data?.length || 0);
            console.log('banho_tosa:', bathGroomData.data?.length || 0);
            console.log('dados appointments:', appointmentsData.data);

            const allAppointments: Appointment[] = [
                ...(appointmentsData.data || []).map(r => ({ ...r, table: 'appointments' as const })),
                ...(petMovelData.data || []).map(r => ({ ...r, table: 'pet_movel_appointments' as const })),
                ...(bathGroomData.data || []).map(r => ({ ...r, table: 'agendamento_banhotosa' as const }))
            ];

            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            const futureAppointments = allAppointments
                .filter(apt => {
                    const aptDate = new Date(apt.appointment_time);
                    aptDate.setHours(0, 0, 0, 0);
                    const isCancelled = apt.cancelled_by_client === true || apt.cancelled === true;
                    return aptDate >= now && !isCancelled;
                })
                .sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime())
                .slice(0, 5);

            setAppointments(futureAppointments);
        } catch (err) {
            console.error('Erro completo:', err);
            setError('Erro ao buscar agendamentos');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') searchAppointments();
    };

    const handleCancel = async () => {
        if (!selectedAppointment) return;
        setActionLoading(true);

        try {
            const { error } = await supabase
                .from(selectedAppointment.table)
                .update({ 
                    cancelled_by_client: true, 
                    cancelled_at: new Date().toISOString() 
                })
                .eq('id', selectedAppointment.id);

            if (error) throw error;

            setAppointments(prev => prev.filter(apt => apt.id !== selectedAppointment.id));
            setShowCancelModal(false);
            setSuccessMessage('Agendamento cancelado com sucesso!');
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (err) {
            setError('Erro ao cancelar agendamento');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReschedule = async () => {
        if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;
        setActionLoading(true);

        try {
            const newDateTime = `${rescheduleDate}T${rescheduleTime}:00:00`;

            const { error } = await supabase
                .from(selectedAppointment.table)
                .update({ appointment_time: newDateTime })
                .eq('id', selectedAppointment.id);

            if (error) throw error;

            const updatedAppointment = { ...selectedAppointment, appointment_time: newDateTime };
            setAppointments(prev => prev.map(apt => apt.id === selectedAppointment.id ? updatedAppointment : apt));
            setShowRescheduleModal(false);
            setRescheduleDate('');
            setRescheduleTime('');
            setSuccessMessage('Agendamento reagendado com sucesso!');
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (err) {
            setError('Erro ao reagendar');
        } finally {
            setActionLoading(false);
        }
    };

    const openCancelModal = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setShowCancelModal(true);
    };

    const openRescheduleModal = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setRescheduleDate('');
        setRescheduleTime('');
        setShowRescheduleModal(true);
    };

    const getDayName = (dateStr: string) => {
        const parts = dateStr.split('-').map(Number);
        const [year, month, day] = parts;
        const date = new Date(year, month - 1, day);
        const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
        return weekdays[date.getDay()];
    };

    const formatHour = (hour: number) => `${hour}:00`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 font-sans">
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-1/3 -right-24 w-96 h-96 bg-[#FF9A44]/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-[#E93D8E]/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl shadow-pink-200/50 mb-4 p-3">
                        <img src={LOGO_URL} alt="Sandy's PetShop" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-[#4A0D2B] tracking-tight" style={{ fontFamily: '"Lobster Two", cursive' }}>
                        Gerenciar Agendamento
                        <Sparkles className="inline-block ml-2 w-6 h-6 text-[#FF9A44] animate-bounce" />
                    </h1>
                    <p className="text-[#D98AA8] font-medium mt-2">Edite ou cancele seu agendamento</p>
                </div>

                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 animate-slideDown">
                        <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                        <p className="text-green-700 font-medium">{successMessage}</p>
                    </div>
                )}

                <div className="bg-white rounded-3xl shadow-xl shadow-pink-100/50 p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <PhoneOutgoing className="w-5 h-5 text-[#E93D8E]" />
                        <span className="text-sm font-bold text-[#4A0D2B] uppercase tracking-wider">Buscar por telefone</span>
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="tel"
                                value={phone}
                                onChange={handlePhoneChange}
                                onKeyDown={handleKeyDown}
                                placeholder="(00) 00000-0000"
                                className="w-full px-5 py-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-lg font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#E93D8E] focus:bg-white transition-all"
                            />
                            <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                        <button
                            onClick={searchAppointments}
                            disabled={loading}
                            className="px-6 py-4 bg-gradient-to-r from-[#FF9A44] to-[#E93D8E] text-white font-bold rounded-2xl hover:scale-105 transition-all shadow-lg shadow-pink-300/50 disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Search className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}
                </div>

                {searched && !loading && appointments.length === 0 && (
                    <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarDays className="w-8 h-8 text-rose-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">Nenhum agendamento encontrado</h3>
                        <p className="text-gray-500">Verifique o número informado ou entre em contato conosco.</p>
                    </div>
                )}

                {appointments.length > 0 && (
                    <div className="space-y-4">
                        {appointments.map((apt) => {
                            const aptDate = new Date(apt.appointment_time);
                            const isToday = aptDate.toDateString() === new Date().toDateString();
                            const isTomorrow = aptDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                            
                            return (
                                <div 
                                    key={apt.id} 
                                    className="bg-white rounded-3xl shadow-lg shadow-pink-100/50 overflow-hidden animate-slideUp"
                                >
                                    <div className={`p-4 ${apt.cancelled_by_client ? 'bg-gray-400' : 'bg-gradient-to-r from-rose-400 to-pink-500'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white">
                                                {getServiceIcon(apt.table)}
                                                <span className="font-bold">{getServiceLabel(apt.table)}</span>
                                            </div>
                                            {isToday && (
                                                <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full">HOJE</span>
                                            )}
                                            {isTomorrow && (
                                                <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full">AMANHÃ</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <PawPrint className="w-4 h-4 text-pink-400" />
                                            <span className="font-bold text-gray-800">{apt.pet_name}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm">{formatDate(apt.appointment_time)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm">{formatTime(apt.appointment_time)}</span>
                                            </div>
                                        </div>

                                        {(apt.condominium && apt.condominium !== 'Nenhum Condomínio' && apt.condominium !== 'Banho & Tosa Fixo') && (
                                            <div className="flex items-center gap-2 text-gray-600 mb-4">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm">{apt.condominium}</span>
                                            </div>
                                        )}

                                        {!apt.cancelled_by_client && (
                                            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => openRescheduleModal(apt)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 text-[#E93D8E] font-semibold rounded-2xl hover:bg-rose-100 transition-all border-2 border-rose-100"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    Reagendar
                                                </button>
                                                <button
                                                    onClick={() => openCancelModal(apt)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-600 font-semibold rounded-2xl hover:bg-gray-200 transition-all"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                    Cancelar
                                                </button>
                                            </div>
                                        )}

                                        {apt.cancelled_by_client && (
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl">
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                    <span className="text-red-600 font-medium">Cancelado pelo cliente</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showCancelModal && selectedAppointment && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-scaleIn overflow-hidden">
                        <div className="p-6 bg-gradient-to-r from-red-400 to-rose-500">
                            <div className="flex items-center gap-3 text-white">
                                <XCircle className="w-8 h-8" />
                                <h2 className="text-xl font-bold">Cancelar Agendamento</h2>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-600 mb-4">Tem certeza que deseja cancelar o agendamento de <span className="font-bold text-gray-800">{selectedAppointment.pet_name}</span>?</p>
                            
                            <div className="bg-rose-50 rounded-2xl p-4 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-pink-500" />
                                    <span className="text-sm text-gray-600">{formatDateLong(selectedAppointment.appointment_time)}</span>
                                </div>
<div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-pink-500" />
                                                <span className="text-sm text-gray-600">{formatTime(selectedAppointment.appointment_time)}</span>
                                            </div>
                            </div>

                            <p className="text-sm text-gray-500 mb-6">
                                Ao cancelar, o horário ficará disponível para outros clientes.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-all"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold rounded-2xl hover:scale-105 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRescheduleModal && selectedAppointment && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-scaleIn overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 bg-gradient-to-r from-[#FF9A44] to-[#E93D8E] sticky top-0 z-10">
                            <div className="flex items-center gap-3 text-white">
                                <RefreshCw className="w-8 h-8" />
                                <div>
                                    <h2 className="text-xl font-bold">Reagendar Agendamento</h2>
                                    <p className="text-sm text-white/80">Pet: {selectedAppointment.pet_name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className="w-5 h-5 text-[#E93D8E]" />
                                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Selecione a Data</label>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {filteredDates.length === 0 ? (
                                        <p className="text-gray-400 text-sm py-4">Nenhuma data disponível para este serviço</p>
                                    ) : (
                                        filteredDates.map((date) => {
                                            const isToday = date === new Date().toISOString().split('T')[0];
                                            return (
                                                <button
                                                    key={date}
                                                    onClick={() => { setRescheduleDate(date); setRescheduleTime(''); }}
                                                    className={`flex-shrink-0 px-3 py-2 rounded-2xl text-center transition-all duration-300 ${
                                                        rescheduleDate === date
                                                            ? 'bg-gradient-to-r from-[#FF9A44] to-[#E93D8E] text-white shadow-lg shadow-pink-300/50'
                                                            : isToday
                                                                ? 'bg-green-100 text-green-700 border-2 border-green-300 hover:bg-green-200'
                                                                : 'bg-rose-50 text-[#4A0D2B] hover:bg-pink-100 border border-pink-100'
                                                    }`}
                                                >
                                                    <div className="text-xs font-bold uppercase">{getDayName(date).slice(0, 3)}</div>
                                                    <div className="text-lg font-black">{formatDate(date).split('/')[0]}</div>
                                                    <div className="text-xs font-medium">{formatDate(date).split('/')[1]}</div>
                                                    {isToday && <div className="text-[10px] font-bold mt-1">HOJE</div>}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                                {selectedAppointment?.table === 'pet_movel_appointments' && selectedAppointment?.condominium && (
                                    <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 rounded-xl">
                                        <MapPin className="w-4 h-4 text-amber-500" />
                                        <p className="text-xs text-amber-700">
                                            O Pet Móvel atende na <span className="font-bold">{selectedAppointment.condominium}</span> às {CONDOMINIUMS.find(c => c.name === selectedAppointment.condominium)?.day}s
                                        </p>
                                    </div>
                                )}
                            </div>

                            {rescheduleDate && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock className="w-5 h-5 text-[#E93D8E]" />
                                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Selecione o Horário</label>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {availableHours.map(hour => {
                                            const isBooked = bookedHours.includes(hour);
                                            return (
                                                <button
                                                    key={hour}
                                                    onClick={() => setRescheduleTime(hour.toString().padStart(2, '0'))}
                                                    disabled={isBooked}
                                                    className={`py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                                                        rescheduleTime === hour.toString().padStart(2, '0')
                                                            ? 'bg-gradient-to-r from-[#FF9A44] to-[#E93D8E] text-white shadow-lg shadow-pink-300/50 scale-105'
                                                            : isBooked
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through opacity-50'
                                                                : 'bg-rose-50 text-[#E93D8E] hover:bg-pink-100 border-2 border-rose-100 hover:scale-105'
                                                    }`}
                                                >
                                                    <Clock className="w-4 h-4" />
                                                    {formatHour(hour)}
                                                    {isBooked && <span className="text-[10px]">Ocupado</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-4 mb-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 rounded bg-gradient-to-r from-[#FF9A44] to-[#E93D8E]"></div>
                                    <span>Disponível</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 rounded bg-gray-200 line-through opacity-50"></div>
                                    <span>Ocupado</span>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => { setShowRescheduleModal(false); setRescheduleDate(''); setRescheduleTime(''); }}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-all"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleReschedule}
                                    disabled={!rescheduleDate || !rescheduleTime || actionLoading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#FF9A44] to-[#E93D8E] text-white font-semibold rounded-2xl hover:scale-105 transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-pink-300/30"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            Confirmar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
                .animate-slideUp { animation: slideUp 0.4s ease-out; }
                .animate-slideDown { animation: slideDown 0.3s ease-out; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
                ::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};