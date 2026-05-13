import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Clock, 
    Scissors, 
    Car, 
    MapPin, 
    Calendar,
    ChevronRight,
    Sparkles,
    PawPrint,
    Home,
    CheckCircle,
    XCircle
} from 'lucide-react';

const LOGO_URL = 'https://i.imgur.com/M3Gt3OA.png';

const BATH_GROOMING_HOURS = [10, 11, 12, 14, 15, 16, 17];
const PET_MOBILE_HOURS = [9, 10, 11, 12, 14, 15, 16, 17];

const CONDOMINIUMS = [
    { name: 'Vitta Parque', day: 'Quarta-feira', dayNumber: 3 },
    { name: 'Max Haus', day: 'Quinta-feira', dayNumber: 4 },
    { name: 'Paseo', day: 'Sexta-feira', dayNumber: 5 },
];

const formatHour = (hour: number) => {
    return `${hour}:00`;
};

export const AvailableTimesPage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [dates, setDates] = useState<string[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fixed' | 'mobile'>('fixed');

    useEffect(() => {
        const toYMD = (date: Date) => {
            // format date in Brazil (São Paulo) timezone as YYYY‑MM‑DD
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);
        };
        const generateDates = () => {
            // Get "today" in São Paulo timezone
            const now = new Date();
            const saoNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
            const dateList: string[] = [];
            for (let i = 0; i < 14; i++) {
                const date = new Date(saoNow);
                date.setDate(saoNow.getDate() + i);
                const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    dateList.push(toYMD(date));
                }
            }
            setDates(dateList);
            // set default selected date to the first weekday (today if it is not weekend)
            setSelectedDate(dateList[0] || '');
        };
        generateDates();
    }, []);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!selectedDate) return;
            setLoading(true);
            try {
                const startOfDay = `${selectedDate}T00:00:00`;
                const endOfDay = `${selectedDate}T23:59:59`;

                const [bathGroomData, petMobileData, regularData] = await Promise.all([
                    supabase.from('agendamento_banhotosa').select('appointment_time, status').gte('appointment_time', startOfDay).lte('appointment_time', endOfDay),
                    supabase.from('pet_movel_appointments').select('appointment_time, condominium, status').gte('appointment_time', startOfDay).lte('appointment_time', endOfDay),
                    supabase.from('appointments').select('appointment_time, condominium, status').gte('appointment_time', startOfDay).lte('appointment_time', endOfDay)
                ]);

                const allAppointments = [
                    ...(bathGroomData.data || []).map(a => ({ ...a, source: 'bath' })),
                    ...(petMobileData.data || []).map(a => ({ ...a, source: 'movel' })),
                    ...(regularData.data || []).map(a => ({ ...a, source: 'regular' }))
                ];
                setAppointments(allAppointments);
            } catch (err) {
                console.error('Error fetching appointments:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, [selectedDate]);

    const isCancelled = (apt: any) => apt.status === 'cancelled' || apt.status === 'cancelled_by_client';

    const getBookedHours = (type: 'fixed' | 'mobile', condo?: string) => {
        return appointments
            .filter(apt => !isCancelled(apt))
            .filter(apt => {
                const aptHour = new Date(apt.appointment_time).getHours();
                if (type === 'fixed') {
                    return !apt.condominium || apt.condominium === 'Nenhum Condomínio' || apt.condominium === 'Banho & Tosa Fixo';
                } else {
                    if (condo) {
                        return apt.condominium === condo;
                    }
                    return apt.condominium && apt.condominium !== 'Nenhum Condomínio' && apt.condominium !== 'Banho & Tosa Fixo';
                }
            })
            .map(apt => new Date(apt.appointment_time).getHours());
    };

    const getAvailableHours = (type: 'fixed' | 'mobile', condo?: string) => {
        const allHours = type === 'fixed' ? BATH_GROOMING_HOURS : PET_MOBILE_HOURS;
        const bookedHours = getBookedHours(type, condo);
        return allHours.filter(hour => !bookedHours.includes(hour));
    };

    const isAvailable = (hour: number, type: 'fixed' | 'mobile', condo?: string) => {
        const available = getAvailableHours(type, condo);
        return available.includes(hour);
    };

    const handleTimeClick = (hour: number, type: 'fixed' | 'mobile', condo?: string) => {
        if (!isAvailable(hour, type, condo)) return;
        const serviceType = type === 'fixed' ? 'banho_tosa' : 'pet_movel';
        const dateParam = selectedDate;
        const timeParam = hour.toString().padStart(2, '0');
        window.location.href = `/?service=${serviceType}&date=${dateParam}&time=${timeParam}`;
    };

    const getDayName = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
        return date.toLocaleDateString('pt-BR', options);
    };

    const getDayNumber = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.getDay();
    };

    const isCondoDay = (dateStr: string, condoDayNumber: number) => {
        return getDayNumber(dateStr) === condoDayNumber;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 font-sans">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-1/3 -right-24 w-96 h-96 bg-[#FF9A44]/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-[#E93D8E]/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl shadow-pink-200/50 mb-4 p-3">
                        <img src={LOGO_URL} alt="Sandy's PetShop" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-[#4A0D2B] tracking-tight" style={{ fontFamily: '"Lobster Two", cursive' }}>
                        Horários Disponíveis
                        <Sparkles className="inline-block ml-2 w-6 h-6 text-[#FF9A44] animate-bounce" />
                    </h1>
                    <p className="text-[#D98AA8] font-medium mt-2">Escolha o melhor horário para o seu pet</p>
                </div>

                {/* Date Selector */}
                <div className="bg-white rounded-3xl shadow-lg shadow-pink-100/50 p-4 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-[#E93D8E]" />
                        <span className="text-sm font-bold text-[#4A0D2B] uppercase tracking-wider">Selecione a Data</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {dates.map((date) => (
                            <button
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                className={`flex-shrink-0 px-4 py-3 rounded-2xl text-center transition-all duration-300 ${
                                    selectedDate === date
                                        ? 'bg-gradient-to-r from-[#FF9A44] to-[#E93D8E] text-white shadow-lg shadow-pink-300/50'
                                        : 'bg-rose-50 text-[#4A0D2B] hover:bg-pink-100 border border-pink-100'
                                }`}
                            >
                                <div className="text-xs font-bold uppercase">{getDayName(date).slice(0, 3)}</div>
                                <div className="text-lg font-black">{formatDate(date).split('/')[0]}</div>
                                <div className="text-xs font-medium">{formatDate(date).split('/')[1]}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Service Type Tabs */}
                <div className="flex gap-3 mb-6">
                    <button
                        onClick={() => setActiveTab('fixed')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
                            activeTab === 'fixed'
                                ? 'bg-gradient-to-r from-[#FF9A44] via-[#E93D8E] to-[#D91A77] text-white shadow-xl shadow-pink-300/50'
                                : 'bg-white text-[#4A0D2B] hover:bg-pink-50 border border-pink-100 shadow-lg'
                        }`}
                    >
                        <Scissors className="w-5 h-5" />
                        Banho & Tosa Fixo
                    </button>
                    <button
                        onClick={() => setActiveTab('mobile')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
                            activeTab === 'mobile'
                                ? 'bg-gradient-to-r from-[#FF9A44] via-[#E93D8E] to-[#D91A77] text-white shadow-xl shadow-pink-300/50'
                                : 'bg-white text-[#4A0D2B] hover:bg-pink-50 border border-pink-100 shadow-lg'
                        }`}
                    >
                        <Car className="w-5 h-5" />
                        Pet Móvel
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-12 h-12 border-4 border-pink-100 border-b-[#E93D8E] rounded-full animate-spin"></div>
                        <p className="text-[#D98AA8] font-medium">Carregando horários...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeTab === 'fixed' ? (
                            <div className="bg-white rounded-3xl shadow-lg shadow-pink-100/50 overflow-hidden">
                                <div className="bg-gradient-to-r from-rose-400 to-pink-500 p-4">
                                    <div className="flex items-center gap-2 text-white">
                                        <Home className="w-5 h-5" />
                                        <span className="font-bold">Banho & Tosa Fixo</span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-500 mb-4">Horário de funcionamento: 10h às 17h</p>
                                    <div className="grid grid-cols-4 gap-3">
                                        {BATH_GROOMING_HOURS.map((hour) => {
                                            const available = isAvailable(hour, 'fixed');
                                            return (
                                                <button
                                                    key={hour}
                                                    onClick={() => handleTimeClick(hour, 'fixed')}
                                                    disabled={!available}
                                                    className={`py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${
                                                        available
                                                            ? 'bg-gradient-to-r from-[#FF9A44] to-[#E93D8E] text-white hover:scale-105 shadow-md shadow-pink-200'
                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                                                    }`}
                                                >
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {formatHour(hour)}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {CONDOMINIUMS.map((condo) => {
                                    const isDayAvailable = isCondoDay(selectedDate, condo.dayNumber);
                                    const availableHours = isDayAvailable ? getAvailableHours('mobile', condo.name) : [];
                                    
                                    return (
                                        <div key={condo.name} className="bg-white rounded-3xl shadow-lg shadow-pink-100/50 overflow-hidden">
                                            <div className={`p-4 ${isDayAvailable ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gray-200'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-white">
                                                        <MapPin className="w-5 h-5" />
                                                        <span className="font-bold">{condo.name}</span>
                                                    </div>
                                                    <span className="text-white/80 text-sm font-medium">{condo.day}</span>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                {isDayAvailable ? (
                                                    <>
                                                        <p className="text-sm text-gray-500 mb-4">Horário de funcionamento: 9h às 17h</p>
                                                        <div className="grid grid-cols-4 gap-3">
                                                            {PET_MOBILE_HOURS.map((hour) => {
                                                                const available = isAvailable(hour, 'mobile', condo.name);
                                                                return (
                                                                    <button
                                                                        key={hour}
                                                                        onClick={() => handleTimeClick(hour, 'mobile', condo.name)}
                                                                        disabled={!available}
                                                                        className={`py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${
                                                                            available
                                                                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:scale-105 shadow-md shadow-orange-200'
                                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                                                                        }`}
                                                                    >
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            <Clock className="w-4 h-4" />
                                                                            {formatHour(hour)}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-center py-4">
                                                        <p className="text-gray-400 font-medium">
                                                            Não atendemos neste condomínio nesta data
                                                        </p>
                                                        <p className="text-sm text-gray-400 mt-1">
                                                            Próximo atendimento: {condo.day}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Legend */}
                <div className="mt-8 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-[#FF9A44] to-[#E93D8E]"></div>
                        <span className="text-sm font-medium text-[#4A0D2B]">Disponível</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gray-200 line-through"></div>
                        <span className="text-sm font-medium text-[#4A0D2B]">Ocupado</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-[#D98AA8]">
                        Dúvidas? Entre em contato pelo WhatsApp
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    );
};