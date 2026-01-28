import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from './supabaseClient';

interface ExtraServicesData {
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
  transporte: { enabled: boolean; value: string | number };
}

interface ExtraServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedData: any) => void;
  data: any; // Pode ser AdminAppointment, MonthlyClient, DaycareRegistration ou HotelRegistration
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
    so_tosa: {
      enabled: data.extra_services?.so_tosa?.enabled || false,
      value: data.extra_services?.so_tosa?.value || ''
    },
    so_banho: {
      enabled: data.extra_services?.so_banho?.enabled || false,
      value: data.extra_services?.so_banho?.value || ''
    },
    hidratacao: {
      enabled: data.extra_services?.hidratacao?.enabled || false,
      value: data.extra_services?.hidratacao?.value || ''
    },
    botinha: {
      enabled: data.extra_services?.botinha?.enabled || false,
      value: data.extra_services?.botinha?.value || ''
    },
    contorno: {
      enabled: data.extra_services?.contorno?.enabled || false,
      value: data.extra_services?.contorno?.value || ''
    },
    pintura: {
      enabled: data.extra_services?.pintura?.enabled || false,
      value: data.extra_services?.pintura?.value || ''
    },
    patacure: {
      enabled: data.extra_services?.patacure?.enabled || false,
      value: data.extra_services?.patacure?.value || ''
    },
    tintura: {
      enabled: data.extra_services?.tintura?.enabled || false,
      value: data.extra_services?.tintura?.value || ''
    },
    penteado: {
      enabled: data.extra_services?.penteado?.enabled || false,
      value: data.extra_services?.penteado?.value || ''
    },
    desembolo: {
      enabled: data.extra_services?.desembolo?.enabled || false,
      value: data.extra_services?.desembolo?.value || ''
    },

    // Serviços Daycare
    adestrador: {
      enabled: data.extra_services?.adestrador?.enabled || false,
      value: data.extra_services?.adestrador?.value || ''
    },
    dias_extras: {
      enabled: data.extra_services?.dias_extras?.enabled || false,
      value: data.extra_services?.dias_extras?.value || '',
      quantity: data.extra_services?.dias_extras?.quantity || 1
    },
    hora_extra: {
      enabled: data.extra_services?.hora_extra?.enabled || false,
      value: data.extra_services?.hora_extra?.value || ''
    },
    medicamento: {
      enabled: data.extra_services?.medicamento?.enabled || false,
      value: data.extra_services?.medicamento?.value || ''
    },
    pernoite: {
      enabled: data.extra_services?.pernoite?.enabled || false,
      value: data.extra_services?.pernoite?.value || ''
    },
    racao: {
      enabled: data.extra_services?.racao?.enabled || false,
      value: data.extra_services?.racao?.value || ''
    },
    veterinario: {
      enabled: data.extra_services?.veterinario?.enabled || false,
      value: data.extra_services?.veterinario?.value || ''
    },
    transporte: {
      enabled: data.extra_services?.transporte?.enabled || false,
      value: data.extra_services?.transporte?.value || ''
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleServiceToggle = (service: keyof ExtraServicesData) => {
    setExtraServices(prev => ({
      ...prev,
      [service]: {
        ...prev[service]!,
        enabled: !prev[service]!.enabled
      }
    }));
  };

  const handleValueChange = (service: keyof ExtraServicesData, value: string) => {
    setExtraServices(prev => ({
      ...prev,
      [service]: {
        ...prev[service]!,
        value: value
      }
    }));
  };

  const handleQuantityChange = (service: keyof ExtraServicesData, quantity: string) => {
    setExtraServices(prev => ({
      ...prev,
      [service]: {
        ...prev[service]!,
        quantity: parseInt(quantity) || 1
      }
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    // Soma genérica para todas as chaves habilitadas
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

      // Itera sobre todas as chaves para preparar o salvamento
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

  const renderServiceItem = (key: keyof ExtraServicesData, label: string) => (
    <div className="flex items-center justify-between p-4 border rounded-lg" key={key}>
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={extraServices[key]?.enabled || false}
          onChange={() => handleServiceToggle(key)}
          className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
        />
        <label className="text-sm font-medium text-gray-700">{label}</label>
      </div>
      {extraServices[key]?.enabled && (
        <div className="flex items-center space-x-2">
          {key === 'dias_extras' && (
            <div className="flex items-center mr-2">
              <span className="text-sm text-gray-600 mr-1">Qtd:</span>
              <input
                type="number"
                min="1"
                value={(extraServices[key] as any).quantity || 1}
                onChange={(e) => handleQuantityChange(key, e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
          )}
          <span className="text-sm text-gray-600">R$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={extraServices[key]?.value}
            onChange={(e) => handleValueChange(key, e.target.value)}
            className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
            placeholder="0,00"
          />
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10001] p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {type === 'daycare' ? (
            <>
              {renderServiceItem('pernoite', 'Pernoite')}
              {renderServiceItem('hora_extra', 'Hora Extra')}
              {renderServiceItem('dias_extras', 'Dia Extra')}
              {renderServiceItem('so_banho', 'Banho')}
              {renderServiceItem('veterinario', 'Veterinário')}
              {renderServiceItem('adestrador', 'Adestrador')}
            </>
          ) : type === 'monthly' ? (
            <>
              {renderServiceItem('so_tosa', 'Tosa')}
              {renderServiceItem('hidratacao', 'Hidratação')}
              {renderServiceItem('patacure', 'Patacure')}
              {renderServiceItem('tintura', 'Tintura')}
              {renderServiceItem('contorno', 'Contorno')}
              {renderServiceItem('penteado', 'Penteado')}
              {renderServiceItem('hora_extra', 'Hora Extra')}
              {renderServiceItem('desembolo', 'Desembolo')}
              {renderServiceItem('veterinario', 'Veterinário')}
              {renderServiceItem('transporte', 'Transporte')}
            </>
          ) : (
            <>
              {renderServiceItem('so_tosa', 'Tosa')}
              {renderServiceItem('so_banho', 'Banho')}
              {renderServiceItem('botinha', 'Botinha')}
              {renderServiceItem('hidratacao', 'Hidratação')}
              {renderServiceItem('contorno', 'Contorno')}
              {renderServiceItem('pintura', 'Pintura')}
              {renderServiceItem('patacure', 'Patacure')}
            </>
          )}

          {/* Total */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total dos Serviços Extras:</span>
              <span className="text-xl font-bold text-pink-600">
                R$ {calculateTotal().toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExtraServicesModal;
