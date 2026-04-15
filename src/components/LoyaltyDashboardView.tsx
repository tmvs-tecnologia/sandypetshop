import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    GiftIcon, 
    SparklesIcon, 
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowTrendingUpIcon,
    CheckBadgeIcon,
    UserIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent } from './ui/card';
import LoyaltyModal from './LoyaltyModal';

interface LoyaltyDashboardViewProps {
    onBack: () => void;
}

interface LoyaltyPet {
    pet_name: string;
    owner_name: string;
    pet_photo_url?: string | null;
    count: number;
    last_service_date: string;
}

const PetAvatar = ({ src, name, size = "w-10 h-10" }: { src?: string | null, name: string, size?: string }) => {
    const [err, setErr] = useState(false);
    
    if (!src || err) {
        return (
            <div className={`${size} rounded-2xl bg-gradient-to-br from-pink-50 to-amber-50 flex items-center justify-center overflow-hidden border border-pink-100/50 relative`}>
                <div style={{ transform: 'scale(1.2)', transformOrigin: 'center' }}>
                    {/* @ts-ignore */}
                    <dotlottie-wc
                        src="https://lottie.host/ec93d9f5-43c7-4df9-8b68-7bf2d462895a/qNefgNdKvi.lottie"
                        style={{ width: '32px', height: '32px', display: 'block' }}
                        autoplay
                        loop
                    />
                </div>
            </div>
        );
    }
    
    return (
        <img 
            src={src} 
            alt={name} 
            className={`${size} rounded-2xl object-cover border border-pink-100/50 shadow-sm`}
            onError={() => setErr(true)}
        />
    );
};

const LoyaltyDashboardView: React.FC<LoyaltyDashboardViewProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [contemplados, setContemplados] = useState<LoyaltyPet[]>([]);
    const [proximos, setProximos] = useState<LoyaltyPet[]>([]);
    const [totalSlots, setTotalSlots] = useState(4);
    const [currentMonthName, setCurrentMonthName] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedPet, setSelectedPet] = useState<LoyaltyPet | null>(null);
    const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);

    const handleOpenLoyalty = (pet: LoyaltyPet) => {
        setSelectedPet(pet);
        setIsLoyaltyModalOpen(true);
    };

    const handlePrevMonth = () => {
        setSelectedDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    };

    const handleNextMonth = () => {
        setSelectedDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    };

    useEffect(() => {
        // Carrega o script do Lottie Web Component (uma única vez)
        if (!document.querySelector('script[data-lottie-wc-loyalty]')) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.10/dist/dotlottie-wc.js';
            script.type = 'module';
            script.setAttribute('data-lottie-wc-loyalty', '1');
            document.head.appendChild(script);
        }
    }, []);

    useEffect(() => {
        const fetchLoyaltyData = async () => {
            setLoading(true);
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            
            setCurrentMonthName(new Date(year, month).toLocaleString('pt-BR', { month: 'long' }));

            // Calcular segundas-feiras no mês (carimbos necessários)
            let mondays = 0;
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                if (new Date(year, month, i).getDay() === 1) mondays++;
            }
            setTotalSlots(mondays);

            const startOfMonth = new Date(year, month, 1, 0, 0, 0).toISOString();
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

            try {
                // Buscar de todas as 3 tabelas
                const [res1, res2, res3] = await Promise.all([
                    supabase.from('appointments').select('pet_name, owner_name, appointment_time, status')
                        .eq('status', 'CONCLUÍDO')
                        .is('monthly_client_id', null)
                        .gte('appointment_time', startOfMonth).lte('appointment_time', endOfMonth),
                    supabase.from('pet_movel_appointments').select('pet_name, owner_name, appointment_time, status')
                        .eq('status', 'CONCLUÍDO')
                        .is('monthly_client_id', null)
                        .gte('appointment_time', startOfMonth).lte('appointment_time', endOfMonth),
                    supabase.from('agendamento_banhotosa').select('pet_name, owner_name, appointment_time, status')
                        .eq('status', 'CONCLUÍDO')
                        .is('monthly_client_id', null)
                        .gte('appointment_time', startOfMonth).lte('appointment_time', endOfMonth)
                ]);

                // Buscar mensalistas para filtragem robusta (fallback para dados legados sem ID vinculado)
                const { data: monthlyClients } = await supabase
                    .from('monthly_clients')
                    .select('pet_name, owner_name')
                    .eq('is_active', true);

                const monthlyKeys = new Set(
                    (monthlyClients || []).map(mc => 
                        `${mc.pet_name.trim().toLowerCase()}|${mc.owner_name.trim().toLowerCase()}`
                    )
                );

                const allAppointments = [
                    ...(res1.data || []),
                    ...(res2.data || []),
                    ...(res3.data || [])
                ].filter(app => {
                    const key = `${app.pet_name.trim().toLowerCase()}|${app.owner_name.trim().toLowerCase()}`;
                    return !monthlyKeys.has(key);
                });

                // Agrupar por Pet + Tutor
                const groups: Record<string, LoyaltyPet> = {};
                
                allAppointments.forEach(app => {
                    const key = `${app.pet_name.trim().toLowerCase()}|${app.owner_name.trim().toLowerCase()}`;
                    if (!groups[key]) {
                        groups[key] = {
                            pet_name: app.pet_name,
                            owner_name: app.owner_name,
                            count: 0,
                            last_service_date: app.appointment_time
                        };
                    }
                    groups[key].count++;
                    const appDate = new Date(app.appointment_time);
                    if (!groups[key].last_service_date || appDate > new Date(groups[key].last_service_date)) {
                        groups[key].last_service_date = app.appointment_time;
                    }
                });

                const pets = Object.values(groups);
                
                // Filtrar contemplados (chegaram ao objetivo)
                const winners = pets.filter(p => p.count >= mondays).sort((a, b) => b.count - a.count);
                
                // Filtrar próximos (2+ carimbos e < mondays)
                const inProgress = pets.filter(p => p.count >= 2 && p.count < mondays).sort((a, b) => b.count - a.count);

                setContemplados(winners);
                setProximos(inProgress);

            } catch (err) {
                console.error('Erro ao buscar dados de fidelidade:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLoyaltyData();
    }, [selectedDate]);

    const ProgressRing = ({ count, total }: { count: number, total: number }) => {
        const percentage = Math.min((count / total) * 100, 100);
        return (
            <div className="relative w-12 h-12">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="24" cy="24" r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-pink-100"
                    />
                    <circle
                        cx="24" cy="24" r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={125.6}
                        strokeDashoffset={125.6 - (125.6 * percentage) / 100}
                        strokeLinecap="round"
                        className="text-pink-500 transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-pink-700">
                    {count}/{total}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <img src="https://i.imgur.com/QSe4m8g.png" alt="Carregando" className="w-12 h-12 object-contain" />
                    </div>
                </div>
                <p className="mt-4 text-pink-800/60 font-medium animate-pulse">Consultando estrelas do mês...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 mb-12">
                {/* Left Empty (for centering title on desktop) */}
                <div className="hidden md:block"></div>

                {/* Center Title */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-pink-600 capitalize" style={{ fontFamily: 'Lobster Two, cursive' }}>Fidelidade</h1>
                </div>
                
                {/* Right Navigation */}
                <div className="flex justify-center md:justify-end">
                    <div className="flex items-center gap-1 bg-pink-50 px-3 py-1.5 rounded-2xl border border-pink-100 shadow-sm backdrop-blur-sm">
                        <button 
                            onClick={handlePrevMonth}
                            className="p-1 hover:bg-white rounded-lg transition-colors text-pink-600 outline-none"
                        >
                            <ChevronLeftIcon className="w-4 h-4 stroke-[3px]" />
                        </button>
                        <span className="text-pink-800/80 text-[10px] md:text-xs font-black uppercase tracking-widest min-w-[110px] text-center">
                            {currentMonthName} {selectedDate.getFullYear()}
                        </span>
                        <button 
                            onClick={handleNextMonth}
                            className="p-1 hover:bg-white rounded-lg transition-colors text-pink-600 outline-none"
                        >
                            <ChevronRightIcon className="w-4 h-4 stroke-[3px]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-pink-50 flex flex-col items-center text-center animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                    <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center mb-3">
                        <CheckBadgeIcon className="w-7 h-7 text-pink-500" />
                    </div>
                    <span className="text-2xl font-black text-gray-900">{contemplados.length}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Contemplados</span>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-pink-50 flex flex-col items-center text-center animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-3">
                        <ArrowTrendingUpIcon className="w-7 h-7 text-amber-500" />
                    </div>
                    <span className="text-2xl font-black text-gray-900">{proximos.length}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Em Progresso</span>
                </div>
                <div className="hidden md:flex bg-gradient-to-br from-pink-500 to-purple-600 p-5 rounded-3xl shadow-lg text-white flex-col items-center text-center animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-md">
                        <SparklesIcon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-2xl font-black">{totalSlots}</span>
                    <span className="text-[10px] text-white/80 font-bold uppercase tracking-tight">Objetivo de Carimbos</span>
                </div>
            </div>

            {/* Section: Contemplados (Winners) */}
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-pink-500 rounded-full"></div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        Pets Contemplados
                        <GiftIcon className="w-6 h-6 text-pink-500 animate-bounce" />
                    </h2>
                </div>
                
                {contemplados.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {contemplados.map((pet, idx) => (
                            <div 
                                key={idx}
                                onClick={() => handleOpenLoyalty(pet)}
                                className="group relative bg-white rounded-[2.5rem] p-6 shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-pink-200 overflow-hidden animate-fadeInUp cursor-pointer"
                                style={{ animationDelay: `${0.4 + idx * 0.1}s` }}
                            >
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-pink-100 transition-colors"></div>
                                
                                <div className="relative z-10 flex items-center gap-4">
                                    <PetAvatar src={pet.pet_photo_url} name={pet.pet_name} size="w-16 h-16" />
                                    <div>
                                        <h3 className="font-bold text-xl text-gray-900 group-hover:text-pink-600 transition-colors leading-tight">{pet.pet_name}</h3>
                                        <p className="text-sm text-gray-400 font-medium flex items-center gap-1">
                                            <UserIcon className="w-3 h-3" />
                                            {pet.owner_name}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-pink-600 font-bold uppercase">Último Carimbo</span>
                                        <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                                            {new Date(pet.last_service_date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Background stamp count */}
                                <div className="absolute -bottom-2 -right-2 text-pink-50/50 font-black text-8xl pointer-events-none select-none italic">
                                    {pet.count}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Card className="bg-gray-50/50 border-dashed border-2 border-gray-200 rounded-[2.5rem]">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="text-4xl mb-4 opacity-40">🎀</div>
                            <p className="text-gray-400 font-medium">Nenhum pet completou o cartão ainda este mês.</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Section: Em Progresso */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-pink-500 rounded-full"></div>
                    <h2 className="text-2xl font-bold text-gray-900 whitespace-nowrap">Em Progresso</h2>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pet & Tutor</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Carimbos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {proximos.length > 0 ? proximos.map((pet, idx) => (
                                    <tr 
                                        key={idx} 
                                        onClick={() => handleOpenLoyalty(pet)}
                                        className="hover:bg-pink-50/30 transition-colors animate-fadeIn cursor-pointer"
                                        style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <PetAvatar src={pet.pet_photo_url} name={pet.pet_name} />
                                                <div>
                                                    <p className="font-bold text-gray-900">{pet.pet_name}</p>
                                                    <p className="text-xs text-gray-400 font-medium">{pet.owner_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 text-amber-600 font-black border-2 border-amber-100 shadow-inner">
                                                {pet.count}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={2} className="px-6 py-12 text-center text-gray-400 font-medium bg-gray-50/20 italic">
                                            Nenhum pet com progresso significativo registrado ainda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Footer shadow/spacing */}
            <div className="h-20"></div>

            <LoyaltyModal 
                isOpen={isLoyaltyModalOpen}
                onClose={() => setIsLoyaltyModalOpen(false)}
                petName={selectedPet?.pet_name || ''}
                ownerName={selectedPet?.owner_name || ''}
            />
        </div>
    );
};

export default LoyaltyDashboardView;
