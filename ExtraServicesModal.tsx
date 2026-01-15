import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from './supabaseClient';

interface ExtraServicesData {
  so_tosa: { enabled: boolean; value: string | number };
  so_banho: { enabled: boolean; value: string | number };
  hidratacao: { enabled: boolean; value: string | number };
  botinha: { enabled: boolean; value: string | number };
  contorno: { enabled: boolean; value: string | number };
  pintura: { enabled: boolean; value: string | number };
  patacure: { enabled: boolean; value: string | number };
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
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleServiceToggle = (service: keyof ExtraServicesData) => {
    setExtraServices(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        enabled: !prev[service].enabled
      }
    }));
  };

  const handleValueChange = (service: keyof ExtraServicesData, value: string) => {
    setExtraServices(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        value: value
      }
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    if (extraServices.so_banho.enabled) total += Number(extraServices.so_banho.value) || 0;
    if (extraServices.so_tosa.enabled) total += Number(extraServices.so_tosa.value) || 0;
    if (extraServices.hidratacao.enabled) total += Number(extraServices.hidratacao.value) || 0;
    if (extraServices.botinha.enabled) total += Number(extraServices.botinha.value) || 0;
    if (extraServices.contorno.enabled) total += Number(extraServices.contorno.value) || 0;
    if (extraServices.pintura.enabled) total += Number(extraServices.pintura.value) || 0;
    if (extraServices.patacure.enabled) total += Number(extraServices.patacure.value) || 0;
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
      
      // Converter strings para números antes de salvar
      const extraServicesForSave = {
        so_tosa: { 
          enabled: extraServices.so_tosa.enabled, 
          value: extraServices.so_tosa.value === '' ? undefined : Number(extraServices.so_tosa.value)
        },
        so_banho: { 
          enabled: extraServices.so_banho.enabled, 
          value: extraServices.so_banho.value === '' ? undefined : Number(extraServices.so_banho.value)
        },
        hidratacao: {
          enabled: extraServices.hidratacao.enabled,
          value: extraServices.hidratacao.value === '' ? undefined : Number(extraServices.hidratacao.value)
        },
        botinha: { 
          enabled: extraServices.botinha.enabled, 
          value: extraServices.botinha.value === '' ? undefined : Number(extraServices.botinha.value)
        },
        contorno: { 
          enabled: extraServices.contorno.enabled, 
          value: extraServices.contorno.value === '' ? undefined : Number(extraServices.contorno.value)
        },
        pintura: { 
          enabled: extraServices.pintura.enabled, 
          value: extraServices.pintura.value === '' ? undefined : Number(extraServices.pintura.value)
        },
        patacure: { 
          enabled: extraServices.patacure.enabled, 
          value: extraServices.patacure.value === '' ? undefined : Number(extraServices.patacure.value)
        },
      };
      
      const mergedExtras = { ...(data?.extra_services || {}), ...extraServicesForSave };
      
      // Log para debug
      console.log('Salvando serviços extras:', {
        tableName,
        dataId: data.id,
        extraServices: mergedExtras,
        type
      });

      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update({ extra_services: mergedExtras })
        .eq('id', data.id)
        .select()
        .single();

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      console.log('Dados atualizados:', updatedData);

      // Não atualizar o campo `price` do mensalista ao salvar serviços extras.
      // O total exibido no card deve ser calculado como: preço base + extras atuais.
      // Atualizamos apenas `extra_services` para refletir os extras selecionados.

      onSuccess({ ...data, ...updatedData });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar serviços extras:', error);
      
      // Mostrar erro mais detalhado
      let errorMessage = 'Erro ao salvar serviços extras. ';
      if (error.message) {
        errorMessage += `Detalhes: ${error.message}`;
      } else {
        errorMessage += 'Tente novamente.';
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10001] p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tosa */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.so_tosa.enabled}
                onChange={() => handleServiceToggle('so_tosa')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Tosa</label>
            </div>
            {extraServices.so_tosa.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.so_tosa.value}
                  onChange={(e) => handleValueChange('so_tosa', e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Banho */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.so_banho.enabled}
                onChange={() => handleServiceToggle('so_banho')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Banho</label>
            </div>
            {extraServices.so_banho.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.so_banho.value}
                  onChange={(e) => handleValueChange('so_banho', e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Botinha */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.botinha.enabled}
                onChange={() => handleServiceToggle('botinha')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Botinha</label>
            </div>
            {extraServices.botinha.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.botinha.value}
                  onChange={(e) => handleValueChange('botinha', e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Hidratação */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.hidratacao.enabled}
                onChange={() => handleServiceToggle('hidratacao')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Hidratação</label>
            </div>
            {extraServices.hidratacao.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.hidratacao.value}
                  onChange={(e) => handleValueChange('hidratacao', e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Contorno */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.contorno.enabled}
                onChange={() => handleServiceToggle('contorno')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Contorno</label>
            </div>
            {extraServices.contorno.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.contorno.value}
                  onChange={(e) => handleValueChange('contorno', e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Pintura */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.pintura.enabled}
                onChange={() => handleServiceToggle('pintura')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Pintura</label>
            </div>
            {extraServices.pintura.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.pintura.value}
                  onChange={(e) => handleValueChange('pintura', e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Patacure */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.patacure.enabled}
                onChange={() => handleServiceToggle('patacure')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Patacure</label>
            </div>
            {extraServices.patacure.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.patacure.value}
                  onChange={(e) => handleValueChange('patacure', e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  placeholder="0,00"
                />
          </div>
        )}
      </div>

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
    </div>
  );

  return createPortal(modal, document.body);
};

export default ExtraServicesModal;
