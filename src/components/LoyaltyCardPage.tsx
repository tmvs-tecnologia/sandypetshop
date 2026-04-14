import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { SparklesIcon, HeartIcon } from '@heroicons/react/24/outline';
import { ServiceType } from '../../types';

interface LoyaltyCardPageProps {
    petName: string;
    ownerName: string;
}

const LoyaltyCardPage: React.FC<LoyaltyCardPageProps> = ({ petName, ownerName }) => {
    const [completedAppointments, setCompletedAppointments] = useState(0);
    const [loading, setLoading] = useState(true);
    const [totalSlots, setTotalSlots] = useState(4);

    useEffect(() => {
        const calculateLoyalty = async () => {
            setLoading(true);
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();

            // Calular segundas-feiras no mês (carimbos necessários)
            let mondays = 0;
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                if (new Date(year, month, i).getDay() === 1) mondays++;
            }
            setTotalSlots(mondays);

            // Buscar agendamentos concluídos
            const startOfMonth = new Date(year, month, 1, 0, 0, 0).toISOString();
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

            try {
                // Consultas simplificadas para contagem
                const [res1, res2, res3] = await Promise.all([
                    supabase.from('appointments').select('id', { count: 'exact' })
                        .eq('pet_name', petName).eq('owner_name', ownerName).eq('status', 'CONCLUÍDO')
                        .gte('appointment_time', startOfMonth).lte('appointment_time', endOfMonth),
                    supabase.from('pet_movel_appointments').select('id', { count: 'exact' })
                        .eq('pet_name', petName).eq('owner_name', ownerName).eq('status', 'CONCLUÍDO')
                        .gte('appointment_time', startOfMonth).lte('appointment_time', endOfMonth),
                    supabase.from('agendamento_banhotosa').select('id', { count: 'exact' })
                        .eq('pet_name', petName).eq('owner_name', ownerName).eq('status', 'CONCLUÍDO')
                        .gte('appointment_time', startOfMonth).lte('appointment_time', endOfMonth)
                ]);

                const total = (res1.count || 0) + (res2.count || 0) + (res3.count || 0);
                setCompletedAppointments(total);
            } catch (err) {
                console.error('Erro ao buscar dados de fidelidade:', err);
            } finally {
                setLoading(false);
            }
        };

        if (petName && ownerName) calculateLoyalty();
    }, [petName, ownerName]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-rose-50">
            <div className="animate-bounce text-4xl">🐾</div>
        </div>
    );

    const isComplete = completedAppointments >= totalSlots;

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(219,39,119,0.15)] border-4 border-white overflow-hidden relative">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-100/50 rounded-full -ml-16 -mb-16 blur-3xl"></div>

                <div className="p-8 relative z-10 text-center">
                    <h1 className="text-4xl font-bold text-pink-600 mb-1" style={{ fontFamily: '"Lobster Two", cursive' }}>Fidelidade</h1>
                    <p className="text-pink-800/60 font-medium mb-8 text-sm uppercase tracking-widest">Cartão de Carimbos</p>

                    <div className="bg-pink-50/50 rounded-3xl p-6 border-2 border-dashed border-pink-200 mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-left">
                                <p className="text-[10px] text-pink-600 font-bold uppercase tracking-tighter">Pet Especial</p>
                                <p className="text-xl font-bold text-pink-900">{petName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-pink-600 font-bold uppercase tracking-tighter">Validade</p>
                                <p className="text-xs font-bold text-pink-900 border-b border-pink-200">{new Date().toLocaleString('pt-BR', { month: 'long' })}</p>
                            </div>
                        </div>

                        {/* Stamps Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {Array.from({ length: Math.max(4, totalSlots) }).map((_, i) => (
                                <div key={i} className={`aspect-square rounded-2xl border-2 flex items-center justify-center transition-all duration-500 overflow-hidden ${i < completedAppointments ? 'bg-white border-pink-400 shadow-sm scale-100' : 'bg-pink-100/20 border-pink-100 border-dotted scale-95'}`}>
                                    {i < completedAppointments ? (
                                        <div className="animate-[popIn_0.5s_ease-out]">
                                            <svg viewBox="0 0 24 24" className="w-10 h-10 fill-pink-500">
                                                <path d="M12,2C10.89,2 10,2.89 10,4C10,5.11 10.89,6 12,6C13.11,6 14,5.11 14,4C14,2.89 13.11,2 12,2M12,8C10.89,8 10,8.89 10,10C10,11.11 10.89,12 12,12C13.11,12 14,11.11 14,10C14,8.89 13.11,8 12,8M18,14C16.89,14 16,14.89 16,16C16,17.11 16.89,18 18,18C19.11,18 20,17.11 20,16C20,14.89 19.11,14 18,14M6,14C4.89,14 4,14.89 4,16C4,17.11 4.89,18 6,18C7.11,18 8,17.11 8,16C8,14.89 7.11,14 6,14M12,14C10.89,14 10,14.89 10,16C10,17.11 10.89,18 12,18C13.11,18 14,17.11 14,16C14,14.89 13.11,14 12,14Z" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <div className="text-pink-200/50 opacity-20">
                                            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                                                <path d="M12,2C10.89,2 10,2.89 10,4C10,5.11 10.89,6 12,6C13.11,6 14,5.11 14,4C14,2.89 13.11,2 12,2M12,8C10.89,8 10,8.89 10,10C10,11.11 10.89,12 12,12C13.11,12 14,11.11 14,10C14,8.89 13.11,8 12,8M18,14C16.89,14 16,14.89 16,16C16,17.11 16.89,18 18,18C19.11,18 20,17.11 20,16C20,14.89 19.11,14 18,14M6,14C4.89,14 4,14.89 4,16C4,17.11 4.89,18 6,18C7.11,18 8,17.11 8,16C8,14.89 7.11,14 6,14M12,14C10.89,14 10,14.89 10,16C10,17.11 10.89,18 12,18C13.11,18 14,17.11 14,16C14,14.89 13.11,14 12,14Z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {isComplete ? (
                        <div className="bg-gradient-to-r from-pink-600 to-rose-500 rounded-2xl p-4 text-white shadow-lg animate-[tada_1s_ease-in-out_infinite]">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <SparklesIcon className="w-5 h-5" />
                                <span className="font-bold text-lg">PARABÉNS!</span>
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-medium opacity-90">Você ganhou uma</p>
                            <p className="text-2xl font-black tracking-tight">HIDRATAÇÃO DE BRINDE!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-pink-900/60 text-xs font-medium">Complete os carimbos do mês e ganhe uma</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-pink-600 font-bold tracking-wider">HIDRATAÇÃO DE LUXO</span>
                                <SparklesIcon className="w-4 h-4 text-pink-400" />
                            </div>
                            <div className="w-full bg-pink-100 h-2 rounded-full mt-4 overflow-hidden shadow-inner">
                                <div 
                                    className="bg-gradient-to-r from-pink-400 to-pink-600 h-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(completedAppointments / totalSlots) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-pink-400 font-bold mt-1 uppercase">{completedAppointments} de {totalSlots} carimbos</p>
                        </div>
                    )}

                    <footer className="mt-8 pt-6 border-t border-pink-50 flex items-center justify-center gap-2 text-pink-300">
                        <HeartIcon className="w-4 h-4 fill-current" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sandy's Pet Shop</span>
                    </footer>
                </div>
            </div>

            <style>{`
                @keyframes popIn {
                    0% { transform: scale(0); opacity: 0; }
                    70% { transform: scale(1.2); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes tada {
                    0% { transform: scale(1); }
                    10%, 20% { transform: scale(0.9) rotate(-3deg); }
                    30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }
                    40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }
                    100% { transform: scale(1) rotate(0); }
                }
            `}</style>
        </div>
    );
};

export default LoyaltyCardPage;
