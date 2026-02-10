import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from './supabaseClient';
import ExtraServicesSelection from './src/components/ExtraServicesSelection';

// Mantendo a interface original para compatibilidade de tipos
export interface ExtraServicesData {
  // Serviços Gerais
  so_tosa: { enabled: boolean; value: string | number };
  so_banho: { enabled: boolean; value: string | number };
  hidratacao: { enabled: boolean; value: string | number };
  botinha: { enabled: boolean; value: string | number };
  contorno: { enabled: boolean; value: string | number };
  pintura: { enabled: boolean; value: string | number };
  patacure: { enabled: boolean; value: string | number };
  tintura: { enabled: boolean; value: string | number };
  penteado: { enabled: boolean; value: string | number };
  desembolo: { enabled: boolean; value: string | number };
  
  // Serviços Daycare
  adestrador: { enabled: boolean; value: string | number };
  dias_extras: { enabled: boolean; value: string | number; quantity?: number };
  hora_extra: { enabled: boolean; value: string | number };
  medicamento: { enabled: boolean; value: string | number };
  pernoite: { enabled: boolean; value: string | number };
  racao: { enabled: boolean; value: string | number };
  veterinario: { enabled: boolean; value: string | number };
}

interface ExtraServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedData: any) => void;
  data: any;
  type: 'appointment' | 'monthly' | 'daycare' | 'hotel';
  title?: string;
}

const ExtraServicesModal: React.FC<ExtraServicesModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  data,
  type,
  title = 'Serviços Extras'
}) => {
  const [extraServices, setExtraServices] = useState<ExtraServicesData>({
    // Serviços Gerais
    so_tosa: { enabled: data.extra_services?.so_tosa?.enabled || false, value: data.extra_services?.so_tosa?.value || '' },
    so_banho: { enabled: data.extra_services?.so_banho?.enabled || false, value: data.extra_services?.so_banho?.value || '' },
    hidratacao: { enabled: data.extra_services?.hidratacao?.enabled || false, value: data.extra_services?.hidratacao?.value || '' },
    botinha: { enabled: data.extra_services?.botinha?.enabled || false, value: data.extra_services?.botinha?.value || '' },
    contorno: { enabled: data.extra_services?.contorno?.enabled || false, value: data.extra_services?.contorno?.value || '' },
    pintura: { enabled: data.extra_services?.pintura?.enabled || false, value: data.extra_services?.pintura?.value || '' },
    patacure: { enabled: data.extra_services?.patacure?.enabled || false, value: data.extra_services?.patacure?.value || '' },
    tintura: { enabled: data.extra_services?.tintura?.enabled || false, value: data.extra_services?.tintura?.value || '' },
    penteado: { enabled: data.extra_services?.penteado?.enabled || false, value: data.extra_services?.penteado?.value || '' },
    desembolo: { enabled: data.extra_services?.desembolo?.enabled || false, value: data.extra_services?.desembolo?.value || '' },

    // Serviços Daycare
    adestrador: { enabled: data.extra_services?.adestrador?.enabled || false, value: data.extra_services?.adestrador?.value || '' },
    dias_extras: { enabled: data.extra_services?.dias_extras?.enabled || false, value: data.extra_services?.dias_extras?.value || '', quantity: data.extra_services?.dias_extras?.quantity || 1 },
    hora_extra: { enabled: data.extra_services?.hora_extra?.enabled || false, value: data.extra_services?.hora_extra?.value || '' },
    medicamento: { enabled: data.extra_services?.medicamento?.enabled || false, value: data.extra_services?.medicamento?.value || '' },
    pernoite: { enabled: data.extra_services?.pernoite?.enabled || false, value: data.extra_services?.pernoite?.value || '' },
    racao: { enabled: data.extra_services?.racao?.enabled || false, value: data.extra_services?.racao?.value || '' },
    veterinario: { enabled: data.extra_services?.veterinario?.enabled || false, value: data.extra_services?.veterinario?.value || '' }
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleServiceToggle = (service: string) => {
    setExtraServices(prev => ({
      ...prev,
      [service]: {
        ...(prev as any)[service],
        enabled: !(prev as any)[service].enabled
      }
    }));
  };

  const handleValueChange = (service: string, value: string) => {
    setExtraServices(prev => ({
      ...prev,
      [service]: {
        ...(prev as any)[service],
        value: value
      }
    }));
  };

  const handleQuantityChange = (service: string, quantity: string) => {
    setExtraServices(prev => ({
      ...prev,
      [service]: {
        ...(prev as any)[service],
        quantity: parseInt(quantity) || 1
      }
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    (Object.keys(extraServices) as Array<keyof ExtraServicesData>).forEach((key) => {
      const service = extraServices[key];
      if (service && service.enabled) {
        if (key === 'dias_extras' && 'quantity' in service && service.quantity) {
          total += (Number(service.value) || 0) * service.quantity;
        } else {
          total += Number(service.value) || 0;
        }
      }
    });
    return total;
  };

  const getTableName = () => {
    switch (type) {
      case 'appointment': return 'appointments';
      case 'monthly': return 'monthly_clients';
      case 'daycare': return 'daycare_enrollments';
      case 'hotel': return 'hotel_registrations';
      default: return '';
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const tableName = getTableName();
      const extraServicesForSave: any = {};
      
      (Object.keys(extraServices) as Array<keyof ExtraServicesData>).forEach(key => {
        const service = extraServices[key];
        if (service) {
          extraServicesForSave[key] = {
            enabled: service.enabled,
            value: service.value === '' ? undefined : Number(service.value)
          };
          
          if (key === 'dias_extras' && 'quantity' in service) {
            extraServicesForSave[key].quantity = service.quantity;
          }
        }
      });
      
      const mergedExtras = { ...(data?.extra_services || {}), ...extraServicesForSave };
      
      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update({ extra_services: mergedExtras })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;

      onSuccess({ ...data, ...updatedData });
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar serviços extras:', error);
      alert(`Erro ao salvar serviços extras. ${error.message || 'Tente novamente.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10001] p-4 animate-fadeIn" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all animate-scaleIn">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-white">
          <div>
            <h2 className="text-2xl font-bold font-outfit text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500 font-jakarta mt-1">Selecione os serviços adicionais para este cliente</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
            <ExtraServicesSelection 
                extraServices={extraServices as any}
                onToggle={handleServiceToggle}
                onValueChange={handleValueChange}
                onQuantityChange={handleQuantityChange}
                type={type}
            />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-100 bg-white">
             <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Estimado</span>
                <span className="text-2xl font-bold text-pink-600 font-outfit">
                    R$ {calculateTotal().toFixed(2).replace('.', ',')}
                </span>
             </div>
             
             <div className="flex space-x-3">
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-gray-600 font-medium border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all focus:ring-2 focus:ring-gray-200"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-pink-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Salvando...
                        </span>
                    ) : 'Confirmar Alterações'}
                </button>
             </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExtraServicesModal;
