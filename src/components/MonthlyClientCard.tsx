import React, { useState } from 'react';
import { 
    CalendarIcon, 
    ClockIcon, 
    UserIcon, 
    PhoneIcon, 
    SparklesIcon
} from '@heroicons/react/24/outline';
import { MonthlyClient } from '../../types';
import { useServiceValidation } from '../hooks/useServiceValidation';

// --- Helpers ---
const FALLBACK_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="28">🐾</text></svg>';

const SafeImage: React.FC<{
    src: string;
    alt: string;
    className?: string;
    loading?: 'eager' | 'lazy';
    onClick?: (e: React.MouseEvent) => void;
}> = ({ src, alt, className, loading = 'lazy', onClick }) => {
    const [currentSrc, setCurrentSrc] = useState<string>(src);
    const [errored, setErrored] = useState<boolean>(false);
    return (
        <img
            src={currentSrc}
            alt={alt}
            className={className}
            loading={loading}
            decoding="async"
            referrerPolicy="no-referrer"
            onClick={onClick}
            onError={() => {
                if (!errored) {
                    setErrored(true);
                    setCurrentSrc(FALLBACK_IMG);
                }
            }}
        />
    );
};

const formatDateToBR = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const getLastDayOfCurrentMonth = () => {
    const now = new Date();
    // month + 1, day 0 returns the last day of the current month
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
};

const getNextAppointmentDateText = (client: MonthlyClient) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Reset time
    const currentDayOfWeek = today.getDay() || 7; // 1=Mon ... 7=Sun (JS default 0=Sun)
    // Adjust JS getDay() to match typical 1=Mon logic if stored that way. 
    // Assuming client.recurrence_day follows 1=Mon, 2=Tue... 7=Sun (or 0=Sun? Let's assume ISO 1-7 or 0-6).
    // The previous code had `weekDaysLabel` using 1=Seg. Let's assume 1=Segunda, 5=Sexta.
    // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.
    
    // Map JS day to our system day (1=Mon ... 5=Fri, maybe 6=Sat, 7=Sun?)
    // Let's standardise: if client.recurrence_day is 1 (Seg), and today is 1 (Mon), next is today if time hasn't passed? 
    // Or strictly future? Usually "Next" implies >= Today.
    
    let nextDate = new Date(today);

    if (client.recurrence_type === 'monthly') {
        // Recurrence day is day of month (1-31)
        const targetDay = client.recurrence_day;
        
        // Check if day has passed in current month
        if (today.getDate() <= targetDay) {
            nextDate.setDate(targetDay);
        } else {
            // Move to next month
            nextDate.setMonth(nextDate.getMonth() + 1);
            nextDate.setDate(targetDay);
        }
    } else {
        // Weekly or Bi-weekly
        // recurrence_day is 1=Seg, 2=Ter... 
        // JS: 1=Mon ...
        const targetDayOfWeek = client.recurrence_day; // Assuming 1=Mon, 5=Fri
        
        // Calculate days until next occurrence
        // JS Day: 0(Sun), 1(Mon)... 6(Sat)
        // System: 1(Mon)... 5(Fri)
        // Need to map system day to JS day. If system 1=Mon, it matches JS 1.
        // If system 7=Sun (or whatever), we need to handle.
        // Let's assume 1-5 map directly.
        
        const currentJsDay = today.getDay() === 0 ? 7 : today.getDay(); // Make Sun=7 for easier math
        const targetJsDay = targetDayOfWeek; // Assuming 1-7 input
        
        let daysToAdd = targetJsDay - currentJsDay;
        if (daysToAdd < 0) {
            // Target day already passed this week
            daysToAdd += 7;
        }
        
        nextDate.setDate(today.getDate() + daysToAdd);
        
        // If bi-weekly, logic is complex without a reference "start date". 
        // We'll treat as weekly for "Next Appointment" approximation or assume active cycle.
        // For accurate bi-weekly, we need `last_appointment_date`. 
        // If not available, we show the weekly equivalent.
        if (client.recurrence_type === 'bi-weekly') {
             // Ideally we'd check if this week is the "on" week. 
             // Without history, we just show the next matching weekday.
             // Adding a suffix to indicate uncertainty? No, user wants a date.
             // We'll leave it as next weekday occurrence.
        }
    }
    
    return formatDateToBR(nextDate);
};

// --- Component ---

const MonthlyClientCard: React.FC<{
    client: MonthlyClient;
    onClick?: (client: MonthlyClient) => void;
    onEdit: (client: MonthlyClient) => void;
    onDelete: (client: MonthlyClient) => void;
    onAddExtraServices: (client: MonthlyClient) => void;
    onTogglePaymentStatus: (client: MonthlyClient, e: React.MouseEvent) => void;
    hasActiveHotel?: boolean;
    hasActiveDaycare?: boolean;
    onChangePhoto: (client: MonthlyClient) => void;
    onView: (client: MonthlyClient) => void;
}> = ({ client, onClick, onEdit, onDelete, onAddExtraServices, onTogglePaymentStatus, onChangePhoto, onView }) => {

    const { hasDaycare, hasHotel } = useServiceValidation(client.whatsapp);

    const getRecurrenceText = (client: MonthlyClient) => {
        if (client.recurrence_type === 'weekly') return 'Semanal';
        if (client.recurrence_type === 'bi-weekly') return 'Quinzenal';
        if (client.recurrence_type === 'monthly') return 'Mensal';
        return 'Não definido';
    };

    const calculateTotalInvoiceValue = (client: MonthlyClient) => {
        let total = Number(client.price || 0);
        // Keys to exclude from extras calculation (base services that might be incorrectly saved as extras)
        const IGNORED_EXTRAS = ['banho_tosa', 'banho', 'tosa', 'so_banho', 'so_tosa', 'pet_movel'];
        
        if (client.extra_services) {
            Object.keys(client.extra_services).forEach((key) => {
                if (IGNORED_EXTRAS.includes(key)) return;

                const service = (client.extra_services as any)[key];
                if (service && service.enabled) {
                    const value = Number(service.value || 0);
                    // const quantity = Number(service.quantity || 1); 
                    total += value; 
                }
            });
        }
        return total;
    };

    const totalInvoiceValue = calculateTotalInvoiceValue(client);
    // Keys to exclude from extras display
    const IGNORED_EXTRAS_DISPLAY = ['banho_tosa', 'banho', 'tosa', 'so_banho', 'so_tosa', 'pet_movel'];

    const hasMonthlyExtras = Boolean(
        client.extra_services && Object.entries(client.extra_services).some(([key, s]: [string, any]) => 
            s.enabled && !IGNORED_EXTRAS_DISPLAY.includes(key)
        )
    );

    const weekDaysLabel: Record<number, string> = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 7: 'Domingo' };
    const recurrenceDayLabel = client.recurrence_type === 'monthly' ? `Dia ${client.recurrence_day}` : (weekDaysLabel[client.recurrence_day] || String(client.recurrence_day));
    const recurrenceTimeLabel = `${String(client.recurrence_time).padStart(2, '0')}:00`;
    
    // Logic for Condominium Label
    const getCondoLabel = () => {
        if (!client.condominium || client.condominium === 'Nenhum Condomínio' || client.condominium.trim() === '') {
            return 'Banho & Tosa Fixo';
        }
        return client.condominium;
    };

    return (
        <div 
            className="group relative bg-white rounded-3xl shadow-sm hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden flex flex-col h-full font-jakarta"
            onClick={() => onClick && onClick(client)}
        >
            {/* --- Status Bar & Badges --- */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-purple-500" />
            
            <div className="p-5 flex flex-col h-full">
                
                {/* Header Section */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                            <SafeImage
                                src={client.pet_photo_url || 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'}
                                alt={client.pet_name}
                                className="relative w-16 h-16 rounded-full object-cover border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform"
                                onClick={(e) => { e.stopPropagation(); onChangePhoto(client); }}
                            />
                            {(hasDaycare || hasHotel) && (
                                <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                                    {hasHotel && <span className="bg-blue-100 text-blue-600 p-0.5 rounded-full border border-white text-[8px]" title="Hotel">🏨</span>}
                                    {hasDaycare && <span className="bg-yellow-100 text-yellow-600 p-0.5 rounded-full border border-white text-[8px]" title="Creche">🏠</span>}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-outfit font-bold text-xl text-gray-900 leading-tight group-hover:text-pink-600 transition-colors">
                                {client.pet_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100 uppercase tracking-wide">
                                    {getRecurrenceText(client)}
                                </span>
                                <span className="text-[10px] text-gray-500 truncate max-w-[100px]" title={getCondoLabel()}>
                                    {getCondoLabel()}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Price Tag */}
                    <div className="text-right flex flex-col items-end min-w-[80px]">
                        <div className="font-outfit font-bold text-lg text-gray-900 whitespace-nowrap">
                            R$ {totalInvoiceValue.toFixed(2).replace('.', ',')}
                        </div>
                        {hasMonthlyExtras && (
                            <div className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block mt-0.5 whitespace-nowrap">
                                + Extras
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tutor</span>
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{client.owner_name}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">WhatsApp</span>
                            <span className="text-xs font-medium text-gray-700 truncate">
                                {client.whatsapp ? client.whatsapp.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '-'}
                            </span>
                        </div>
                    </div>
                    
                    {/* New Fields: Next Appointment & Payment Date */}
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-pink-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Próx. Agendamento</span>
                            <span className="text-xs font-bold text-pink-600">{getNextAppointmentDateText(client)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-green-500" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Próx. Pagamento</span>
                            <span className="text-xs font-bold text-green-600">{formatDateToBR(getLastDayOfCurrentMonth())}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Dia Fixo</span>
                            <span className="text-xs font-medium text-gray-700">{recurrenceDayLabel}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Horário</span>
                            <span className="text-xs font-medium text-gray-700">{recurrenceTimeLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Extras Badges (if any) */}
                {hasMonthlyExtras && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                        {client.extra_services && Object.entries(client.extra_services).map(([key, value]: [string, any]) => {
                            if (!value.enabled || IGNORED_EXTRAS_DISPLAY.includes(key)) return null;
                            const label = key.replace(/_/g, ' ').replace('so ', ''); // Simple formatting
                            return (
                                <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 capitalize">
                                    <SparklesIcon className="w-3 h-3 mr-1" />
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Footer / Actions */}
                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); onTogglePaymentStatus(client, e); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            client.payment_status === 'Pendente'
                                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        }`}
                    >
                        {client.payment_status === 'Pendente' ? '⏳ Pendente' : '✅ Pago'}
                    </button>
                    
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddExtraServices(client); }}
                        className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 text-xs font-medium transition-all"
                    >
                        + Extras
                    </button>
                    
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Editar"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00 2 2h11a2 2 0 00 2-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                     <button
                        onClick={(e) => { e.stopPropagation(); onDelete(client); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Excluir"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MonthlyClientCard;
