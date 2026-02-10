import React, { useState } from 'react';
import { 
    ClockIcon, 
    UserIcon, 
    TagIcon, 
    CheckCircleIcon, 
    TrashIcon, 
    PencilSquareIcon as EditIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { AdminAppointment } from '../../types';

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

const WhatsAppIcon = () => (
    <img 
        alt="WhatsApp Icon" 
        className="h-4 w-4 opacity-60" 
        loading="lazy" 
        decoding="async" 
        referrerPolicy="no-referrer" 
        src="https://cdn-icons-png.flaticon.com/512/15713/15713434.png" 
    />
);

interface AppointmentCardProps {
    appointment: AdminAppointment;
    onEdit: (appointment: AdminAppointment) => void;
    onDelete: (appointment: AdminAppointment) => void;
    onRequestCompletion: (id: string, price: number) => void;
    onOpenActionMenu: (appointment: AdminAppointment, e: React.MouseEvent) => void;
    onDeleteObservation: (appointment: AdminAppointment) => void;
    isUpdating?: boolean;
    isDeleting?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
    appointment,
    onEdit,
    onDelete,
    onRequestCompletion,
    onOpenActionMenu,
    onDeleteObservation,
    isUpdating = false,
    isDeleting = false
}) => {
    const {
        id,
        appointment_time,
        pet_name,
        owner_name,
        service,
        status,
        price,
        addons,
        whatsapp,
        monthly_client_id,
        responsible,
        extra_services: es,
        observation,
        condominium,
        pet_photo_url,
        recurrence_type
    } = appointment;

    const isCompleted = status === 'CONCLUÍDO';

    // Price Calculation
    const extrasTotal = (() => {
        if (!es) return 0;
        let total = 0;
        if (es.pernoite?.enabled) total += Number(es.pernoite.value || 0);
        if (es.banho_tosa?.enabled) total += Number(es.banho_tosa.value || 0);
        if (es.so_banho?.enabled) total += Number(es.so_banho.value || 0);
        if (es.adestrador?.enabled) total += Number(es.adestrador.value || 0);
        if (es.despesa_medica?.enabled) total += Number(es.despesa_medica.value || 0);
        if (es.penteado?.enabled) total += Number(es.penteado.value || 0);
        if (es.desembolo?.enabled) total += Number(es.desembolo.value || 0);
        if (es.transporte?.enabled) total += Number(es.transporte.value || 0);
        if (es.dias_extras?.quantity > 0) total += Number(es.dias_extras.quantity) * Number(es.dias_extras.value || 0);
        return total;
    })();

    // Helper to format extra name
    const formatExtraName = (key: string) => {
        return key.replace(/_/g, ' ').replace('so ', '').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Get active extras list
    const activeExtras: string[] = [];
    if (es) {
        Object.entries(es).forEach(([key, value]: [string, any]) => {
            if (value) {
                if (key === 'dias_extras') {
                    if (Number(value.quantity) > 0) activeExtras.push('Dias Extras');
                } else if (value.enabled || value === true) {
                    activeExtras.push(formatExtraName(key));
                }
            }
        });
    }

    const hasExtras = activeExtras.length > 0;
    const monthlyDiscount = monthly_client_id ? 10 : 0;
    const displayPrice: number = Math.max(0, Number(price || 0) - monthlyDiscount) + extrasTotal;

    const whatsappHref = `https://api.whatsapp.com/send?phone=55${whatsapp}`;

    const statusStyles: Record<string, string> = {
        'AGENDADO': 'bg-blue-100 text-blue-800',
        'CONCLUÍDO': 'bg-green-100 text-green-800',
        'pending': 'bg-blue-100 text-blue-800',
    };
    
    const getRecurrenceLabel = () => {
        if (!recurrence_type) return null;
        const map: Record<string, string> = { 
            weekly: 'Semanal', 
            'bi-weekly': 'Quinzenal', 
            monthly: 'Mensal' 
        };
        return map[recurrence_type];
    };
    const recurrenceLabel = getRecurrenceLabel();

    // Date Formatting
    const dateObj = new Date(appointment_time);
    const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
    const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

    return (
        <div className={`group relative bg-white rounded-3xl shadow-sm hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden flex flex-col h-full font-jakarta ${isDeleting ? 'opacity-40 animate-pulse' : ''}`}>
            
            {/* --- Status Bar --- */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${status === 'CONCLUÍDO' ? 'from-green-400 to-emerald-500' : 'from-pink-400 to-purple-500'}`} />

            <div className="p-5 flex flex-col h-full">
                
                {/* Header Section */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                            {pet_photo_url ? (
                                <SafeImage
                                    src={pet_photo_url}
                                    alt={pet_name}
                                    className="relative w-14 h-14 rounded-full object-cover border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform"
                                />
                            ) : (
                                <div className="relative w-14 h-14 rounded-full bg-white flex items-center justify-center border-2 border-pink-50 shadow-sm text-2xl">
                                    🐶
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-outfit font-bold text-xl text-gray-900 leading-tight group-hover:text-pink-600 transition-colors">
                                {pet_name}
                            </h3>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
                                    {status === 'pending' ? 'AGENDADO' : status}
                                </span>
                                {monthly_client_id && recurrenceLabel && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 uppercase tracking-wide">
                                        {recurrenceLabel}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Price Tag */}
                    <div className="text-right flex flex-col items-end">
                        <div className="font-outfit font-bold text-lg text-gray-900 whitespace-nowrap">
                            R$ {displayPrice.toFixed(2).replace('.', ',')}
                        </div>
                        {hasExtras && activeExtras.map((extra, idx) => (
                             <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 mt-0.5">
                                <SparklesIcon className="w-3 h-3 mr-1" />
                                {extra}
                             </span>
                        ))}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-pink-500" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Data & Hora</span>
                            <span className="text-xs font-bold text-gray-700">{dateStr}, {timeStr}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tutor</span>
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{owner_name}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <TagIcon className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col w-full">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Serviço</span>
                            <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-medium text-gray-700">{service}</span>
                                {((service === 'Creche Pet' || service === 'Hotel Pet') && !monthly_client_id) && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 ml-2">
                                        🏠 Visita
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                    >
                        <WhatsAppIcon />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">WhatsApp</span>
                            <span className="text-xs font-medium text-gray-700 hover:text-green-600 transition-colors">
                                {whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                            </span>
                        </div>
                    </a>

                    <div className="flex items-center gap-2 col-span-2">
                        <div className="w-4 h-4 flex items-center justify-center text-gray-400 text-[10px]">🏢</div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Condomínio</span>
                                <span className="text-xs font-medium text-gray-700">
                                {(!condominium || condominium === 'Nenhum Condomínio') ? 'Banho & Tosa Fixo' : condominium}
                                </span>
                            </div>
                        </div>
                    
                    {responsible && (
                        <div className="flex items-center gap-2 col-span-2 bg-purple-50 p-1.5 rounded-lg border border-purple-100">
                            <div className="w-4 h-4 flex items-center justify-center text-purple-500 text-[10px]">👤</div>
                            <span className="text-xs font-medium text-purple-700">Resp: <strong>{responsible}</strong></span>
                        </div>
                    )}
                </div>

                {/* Addons/Extras Text List */}
                {addons && addons.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                        {addons.map((addon, i) => (
                             <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                + {addon}
                            </span>
                        ))}
                    </div>
                )}
                
                {/* Observation */}
                {observation && (
                    <div className="mt-auto mb-4 bg-yellow-50 p-2.5 rounded-lg border border-yellow-100 relative group/obs">
                        <p className="text-[11px] text-gray-600 italic">
                            "{observation}"
                        </p>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteObservation(appointment); }}
                            className="absolute top-1 right-1 p-1 text-red-400 hover:text-red-600 opacity-0 group-hover/obs:opacity-100 transition-opacity"
                            title="Excluir observação"
                        >
                            <TrashIcon className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Footer / Actions */}
                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                    <button
                        onClick={(e) => onOpenActionMenu(appointment, e)}
                        disabled={isUpdating || isDeleting}
                        className="p-2 rounded-full text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50"
                        title="Mais ações"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                    
                    <button
                        onClick={() => onEdit(appointment)}
                        disabled={isUpdating || isDeleting}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
                        title="Editar"
                    >
                        <EditIcon className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => onDelete(appointment)}
                        disabled={isUpdating || isDeleting}
                        className="p-2 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Excluir"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    
                    <button
                        onClick={() => onRequestCompletion(id, displayPrice)}
                        disabled={isCompleted || isUpdating || isDeleting}
                        className={`ml-2 px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isCompleted ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/20 hover:-translate-y-0.5'
                        }`}
                        title="Concluir serviço"
                    >
                        {isUpdating && !isDeleting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-4 h-4" />
                                <span>{isCompleted ? 'Concluído' : 'Concluir'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentCard;
