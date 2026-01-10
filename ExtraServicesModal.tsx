import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from './supabaseClient';

interface ExtraServicesData {
  pernoite: { enabled: boolean; value: string | number };
  banho_tosa: { enabled: boolean; value: string | number };
  so_banho: { enabled: boolean; value: string | number };
  adestrador: { enabled: boolean; value: string | number };
  hidratacao: { enabled: boolean; value: string | number };
  despesa_medica: { enabled: boolean; value: string | number };
  dias_extras: { enabled: boolean; quantity: string | number; value: string | number };
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
    pernoite: { 
      enabled: data.extra_services?.pernoite?.enabled || false, 
      value: data.extra_services?.pernoite?.value || '' 
    },
    banho_tosa: { 
      enabled: data.extra_services?.banho_tosa?.enabled || false, 
      value: data.extra_services?.banho_tosa?.value || '' 
    },
    so_banho: { 
      enabled: data.extra_services?.so_banho?.enabled || false, 
      value: data.extra_services?.so_banho?.value || '' 
    },
    adestrador: { 
      enabled: data.extra_services?.adestrador?.enabled || false, 
      value: data.extra_services?.adestrador?.value || '' 
    },
    hidratacao: {
      enabled: data.extra_services?.hidratacao?.enabled || false,
      value: data.extra_services?.hidratacao?.value || ''
    },
    despesa_medica: { 
      enabled: data.extra_services?.despesa_medica?.enabled || false, 
      value: data.extra_services?.despesa_medica?.value || '' 
    },
    dias_extras: { 
      enabled: data.extra_services?.dias_extras?.enabled || false,
      quantity: data.extra_services?.dias_extras?.quantity || '', 
      value: data.extra_services?.dias_extras?.value || '' 
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleServiceToggle = (service: keyof ExtraServicesData) => {
    if (service === 'dias_extras') {
      setExtraServices(prev => ({
        ...prev,
        dias_extras: {
          ...prev.dias_extras,
          enabled: !prev.dias_extras.enabled,
          quantity: !prev.dias_extras.enabled ? '' : '',
          value: !prev.dias_extras.enabled ? '' : prev.dias_extras.value
        }
      }));
    } else {
      setExtraServices(prev => ({
        ...prev,
        [service]: {
          ...prev[service],
          enabled: !prev[service].enabled
        }
      }));
    }
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

  const handleQuantityChange = (value: string) => {
    setExtraServices(prev => ({
      ...prev,
      dias_extras: {
        ...prev.dias_extras,
        quantity: value
      }
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    if (extraServices.pernoite.enabled) total += Number(extraServices.pernoite.value) || 0;
    if (extraServices.banho_tosa.enabled) total += Number(extraServices.banho_tosa.value) || 0;
    if (extraServices.so_banho.enabled) total += Number(extraServices.so_banho.value) || 0;
    if (extraServices.adestrador.enabled) total += Number(extraServices.adestrador.value) || 0;
    if (extraServices.hidratacao.enabled) total += Number(extraServices.hidratacao.value) || 0;
    if (extraServices.despesa_medica.enabled) total += Number(extraServices.despesa_medica.value) || 0;
    if (extraServices.dias_extras.enabled && Number(extraServices.dias_extras.quantity) > 0) {
      total += Number(extraServices.dias_extras.quantity) * (Number(extraServices.dias_extras.value) || 0);
    }
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
        pernoite: { 
          enabled: extraServices.pernoite.enabled, 
          value: extraServices.pernoite.value === '' ? undefined : Number(extraServices.pernoite.value)
        },
        banho_tosa: { 
          enabled: extraServices.banho_tosa.enabled, 
          value: extraServices.banho_tosa.value === '' ? undefined : Number(extraServices.banho_tosa.value)
        },
        so_banho: { 
          enabled: extraServices.so_banho.enabled, 
          value: extraServices.so_banho.value === '' ? undefined : Number(extraServices.so_banho.value)
        },
        adestrador: { 
          enabled: extraServices.adestrador.enabled, 
          value: extraServices.adestrador.value === '' ? undefined : Number(extraServices.adestrador.value)
        },
        hidratacao: {
          enabled: extraServices.hidratacao.enabled,
          value: extraServices.hidratacao.value === '' ? undefined : Number(extraServices.hidratacao.value)
        },
        despesa_medica: { 
          enabled: extraServices.despesa_medica.enabled, 
          value: extraServices.despesa_medica.value === '' ? undefined : Number(extraServices.despesa_medica.value)
        },
        dias_extras: { 
          enabled: extraServices.dias_extras.enabled,
          quantity: extraServices.dias_extras.quantity === '' ? 0 : Number(extraServices.dias_extras.quantity), 
          value: extraServices.dias_extras.value === '' ? undefined : Number(extraServices.dias_extras.value)
        }
      };
      
      // Log para debug
      console.log('Salvando serviços extras:', {
        tableName,
        dataId: data.id,
        extraServices: extraServicesForSave,
        type
      });

      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update({ extra_services: extraServicesForSave })
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
          {/* Pernoite */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.pernoite.enabled}
                onChange={() => handleServiceToggle('pernoite')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Pernoite</label>
            </div>
            {extraServices.pernoite.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.pernoite.value}
                  onChange={(e) => handleValueChange('pernoite', e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Banho & Tosa */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.banho_tosa.enabled}
                onChange={() => handleServiceToggle('banho_tosa')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Banho & Tosa</label>
            </div>
            {extraServices.banho_tosa.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.banho_tosa.value}
                  onChange={(e) => handleValueChange('banho_tosa', e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Só Banho */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.so_banho.enabled}
                onChange={() => handleServiceToggle('so_banho')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Só Banho</label>
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

          {/* Adestrador */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.adestrador.enabled}
                onChange={() => handleServiceToggle('adestrador')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Adestrador</label>
            </div>
            {extraServices.adestrador.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.adestrador.value}
                  onChange={(e) => handleValueChange('adestrador', e.target.value)}
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

          {/* Despesa Médica */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={extraServices.despesa_medica.enabled}
                onChange={() => handleServiceToggle('despesa_medica')}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">Despesa Médica</label>
            </div>
            {extraServices.despesa_medica.enabled && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraServices.despesa_medica.value}
                  onChange={(e) => handleValueChange('despesa_medica', e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  placeholder="0,00"
                />
              </div>
            )}
          </div>

          {/* Dias Extras */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={extraServices.dias_extras.enabled}
                  onChange={() => handleServiceToggle('dias_extras')}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">Dias Extras</label>
              </div>
            </div>
            {extraServices.dias_extras.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Quantidade de dias</label>
                  <input
                    type="number"
                    min="1"
                    value={extraServices.dias_extras.quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Valor por dia (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={extraServices.dias_extras.value}
                    onChange={(e) => handleValueChange('dias_extras', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-pink-500 focus:border-pink-500"
                    placeholder="0,00"
                  />
                </div>
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
