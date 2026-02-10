import React from 'react';
import { 
    ScissorsIcon, 
    SparklesIcon, 
    BeakerIcon, 
    PaintBrushIcon, 
    HomeIcon, 
    ClockIcon,
    PlusCircleIcon
} from '@heroicons/react/24/outline';

// Interfaces (aligned with ExtraServicesModal)
interface ServiceItem {
    enabled: boolean;
    value: string | number;
    quantity?: number;
}

interface ExtraServicesSelectionProps {
    extraServices: Record<string, ServiceItem>;
    onToggle: (key: string) => void;
    onValueChange: (key: string, value: string) => void;
    onQuantityChange: (key: string, quantity: string) => void;
    type: 'appointment' | 'monthly' | 'daycare' | 'hotel';
}

const ServiceCard: React.FC<{
    serviceKey: string;
    label: string;
    icon: React.ReactNode;
    item: ServiceItem;
    onToggle: () => void;
    onValueChange: (val: string) => void;
    onQuantityChange: (qty: string) => void;
}> = ({ serviceKey, label, icon, item, onToggle, onValueChange, onQuantityChange }) => {
    const isEnabled = item?.enabled || false;

    return (
        <div 
            className={`
                relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group
                ${isEnabled 
                    ? 'border-pink-500 bg-pink-50/50 shadow-sm' 
                    : 'border-gray-100 bg-white hover:border-pink-200 hover:bg-gray-50'}
            `}
            onClick={onToggle}
        >
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${isEnabled ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400 group-hover:bg-pink-50 group-hover:text-pink-400'} transition-colors`}>
                    {icon}
                </div>
                {/* Custom Toggle Switch */}
                <div className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${isEnabled ? 'bg-pink-500' : 'bg-gray-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${isEnabled ? 'translate-x-4' : ''}`} />
                </div>
            </div>
            
            <h4 className={`font-jakarta font-semibold text-sm mb-1 ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                {label}
            </h4>

            {/* Inputs Section - Only visible if enabled */}
            <div 
                className={`overflow-hidden transition-all duration-300 ${isEnabled ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
                onClick={(e) => e.stopPropagation()} // Prevent toggle when clicking inputs
            >
                <div className="flex items-center gap-2">
                    {serviceKey === 'dias_extras' && (
                         <div className="flex items-center bg-white border border-pink-200 rounded-lg px-2 py-1 shadow-sm">
                            <span className="text-[10px] text-gray-400 font-bold mr-1">QTD</span>
                            <input 
                                type="number" 
                                min="1"
                                value={item.quantity || 1}
                                onChange={(e) => onQuantityChange(e.target.value)}
                                className="w-8 text-sm font-semibold text-gray-700 focus:outline-none text-center bg-transparent"
                            />
                        </div>
                    )}
                    <div className="flex items-center flex-1 bg-white border border-pink-200 rounded-lg px-2 py-1 shadow-sm">
                        <span className="text-xs text-gray-400 mr-1">R$</span>
                        <input 
                            type="number" 
                            placeholder="0,00"
                            value={item.value || ''}
                            onChange={(e) => onValueChange(e.target.value)}
                            className="w-full text-sm font-semibold text-gray-700 focus:outline-none bg-transparent"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExtraServicesSelection: React.FC<ExtraServicesSelectionProps> = ({ 
    extraServices, 
    onToggle, 
    onValueChange, 
    onQuantityChange,
    type 
}) => {
    
    // Configuração dos serviços
    const servicesConfig = [
        // Gerais
        { key: 'so_tosa', label: 'Só Tosa', icon: <ScissorsIcon className="w-5 h-5" />, category: 'general' },
        { key: 'so_banho', label: 'Só Banho', icon: <BeakerIcon className="w-5 h-5" />, category: 'general' },
        { key: 'hidratacao', label: 'Hidratação', icon: <SparklesIcon className="w-5 h-5" />, category: 'general' },
        { key: 'botinha', label: 'Botinha', icon: <PaintBrushIcon className="w-5 h-5" />, category: 'general' },
        { key: 'contorno', label: 'Contorno', icon: <ScissorsIcon className="w-5 h-5" />, category: 'general' },
        { key: 'pintura', label: 'Pintura', icon: <PaintBrushIcon className="w-5 h-5" />, category: 'general' },
        { key: 'patacure', label: 'Patacure', icon: <SparklesIcon className="w-5 h-5" />, category: 'general' },
        { key: 'tintura', label: 'Tintura', icon: <PaintBrushIcon className="w-5 h-5" />, category: 'general' },
        { key: 'penteado', label: 'Penteado', icon: <ScissorsIcon className="w-5 h-5" />, category: 'general' },
        { key: 'desembolo', label: 'Desembolo', icon: <ScissorsIcon className="w-5 h-5" />, category: 'general' },
        
        // Daycare/Hotel specific
        { key: 'adestrador', label: 'Adestrador', icon: <UserIcon className="w-5 h-5" />, category: 'care' },
        { key: 'dias_extras', label: 'Dias Extras', icon: <PlusCircleIcon className="w-5 h-5" />, category: 'care' },
        { key: 'hora_extra', label: 'Hora Extra', icon: <ClockIcon className="w-5 h-5" />, category: 'care' },
        { key: 'medicamento', label: 'Medicamento', icon: <BeakerIcon className="w-5 h-5" />, category: 'care' },
        { key: 'pernoite', label: 'Pernoite', icon: <HomeIcon className="w-5 h-5" />, category: 'care' },
        { key: 'racao', label: 'Ração', icon: <SparklesIcon className="w-5 h-5" />, category: 'care' },
        { key: 'veterinario', label: 'Veterinário', icon: <SparklesIcon className="w-5 h-5" />, category: 'care' },
    ];

    // Filter based on type if needed, but showing all is usually safer or requested behavior.
    // However, keeping logic simple: just render what's in config.
    
    const generalServices = servicesConfig.filter(s => s.category === 'general');
    const careServices = servicesConfig.filter(s => s.category === 'care');

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Estética & Cuidados</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {generalServices.map(service => (
                        <ServiceCard 
                            key={service.key}
                            serviceKey={service.key}
                            label={service.label}
                            icon={service.icon}
                            item={extraServices[service.key]}
                            onToggle={() => onToggle(service.key)}
                            onValueChange={(val) => onValueChange(service.key, val)}
                            onQuantityChange={(qty) => onQuantityChange(service.key, qty)}
                        />
                    ))}
                </div>
            </div>

            {(type === 'daycare' || type === 'hotel' || type === 'monthly') && (
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Hospedagem & Creche</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {careServices.map(service => (
                            <ServiceCard 
                                key={service.key}
                                serviceKey={service.key}
                                label={service.label}
                                icon={service.icon}
                                item={extraServices[service.key]}
                                onToggle={() => onToggle(service.key)}
                                onValueChange={(val) => onValueChange(service.key, val)}
                                onQuantityChange={(qty) => onQuantityChange(service.key, qty)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Icon for User (missing import)
function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
    );
}

export default ExtraServicesSelection;
