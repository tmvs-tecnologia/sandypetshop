import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { PET_WEIGHT_OPTIONS } from '../../constants';
import { PetWeight } from '../../types';
import { XMarkIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';

interface PriceRow {
  weight_category: string;
  bath_price: number;
  bath_and_grooming_price: number;
  grooming_only_price: number;
}

interface PriceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPricesUpdated?: () => void;
}

const PriceManagementModal: React.FC<PriceManagementModalProps> = ({ isOpen, onClose, onPricesUpdated }) => {
  const [prices, setPrices] = useState<Record<string, PriceRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPrices();
    }
  }, [isOpen]);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('service_prices')
        .select('*');

      if (error) throw error;

      if (data) {
        const pricesMap: Record<string, PriceRow> = {};
        data.forEach(row => {
          pricesMap[row.weight_category] = row;
        });
        setPrices(pricesMap);
      }
    } catch (err: any) {
      console.error('Error fetching prices:', err);
      setError('Erro ao carregar os preços. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (weightCategory: string, field: keyof PriceRow, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    setPrices(prev => {
      const current = prev[weightCategory] || { 
        weight_category: weightCategory, 
        bath_price: 0, 
        bath_and_grooming_price: 0, 
        grooming_only_price: 0 
      };
      
      const updated = { ...current, [field]: numValue };
      
      // Automatic calculation logic for grooming_only_price
      // Banho & Tosa = Banho + Só Tosa
      if (field === 'bath_price' || field === 'bath_and_grooming_price') {
         updated.grooming_only_price = Math.max(0, updated.bath_and_grooming_price - updated.bath_price);
      } else if (field === 'grooming_only_price') {
         updated.bath_and_grooming_price = updated.bath_price + updated.grooming_only_price;
      }

      return {
        ...prev,
        [weightCategory]: updated
      };
    });
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updates = (Object.values(prices) as PriceRow[]).map(p => ({
        weight_category: p.weight_category,
        bath_price: p.bath_price,
        bath_and_grooming_price: p.bath_and_grooming_price,
        grooming_only_price: p.grooming_only_price,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('service_prices')
        .upsert(updates, { onConflict: 'weight_category' });

      if (error) throw error;
      
      setSuccess(true);
      if (onPricesUpdated) onPricesUpdated();
      
      setTimeout(() => {
        onClose();
      }, 2500);

    } catch (err: any) {
      console.error('Error saving prices:', err);
      setError('Erro ao salvar os preços. Verifique sua conexão e permissões.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500" onClick={saving || success ? undefined : onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        
        {/* Success Full Overlay */}
        <div 
          className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md transition-all duration-500 ${
            success ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
        >
          <div className={`w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-150 ${success ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center shadow-inner">
               <CheckCircleIcon className="w-10 h-10 text-green-600" strokeWidth={2.5} />
            </div>
          </div>
          <h3 className={`text-4xl font-bold text-gray-800 transition-all duration-700 ease-out delay-300 ${success ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ fontFamily: 'Lobster Two, cursive' }}>
            Preços Atualizados!
          </h3>
          <p className={`text-gray-500 mt-3 text-lg font-medium transition-all duration-700 ease-out delay-400 ${success ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Os novos valores já estão ativos no sistema.
          </p>
        </div>

        {/* Content Wrapper for scaling effect */}
        <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${success ? 'scale-[0.97] blur-[2px] opacity-40' : 'scale-100 blur-none opacity-100'}`}>
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Lobster Two, cursive' }}>
                Definir Preços dos Serviços
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Altere os valores base dos serviços de acordo com o peso do pet.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
               <span>{error}</span>
            </div>
          )}

          {loading ? (
             <div className="flex flex-col items-center justify-center py-12 text-gray-400">
               <ArrowPathIcon className="w-8 h-8 animate-spin mb-4" />
               <p>Carregando preços...</p>
             </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
                    <th className="px-4 py-3 whitespace-nowrap">Peso</th>
                    <th className="px-4 py-3 min-w-[120px]">Banho (R$)</th>
                    <th className="px-4 py-3 min-w-[120px]">Banho & Tosa (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(PET_WEIGHT_OPTIONS).map(([key, label]) => {
                    const rowData = prices[key] || { 
                      bath_price: 0, 
                      bath_and_grooming_price: 0, 
                      grooming_only_price: 0 
                    };
                    return (
                      <tr key={key} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-700">
                          {label}
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={rowData.bath_price}
                            onChange={(e) => handlePriceChange(key, 'bath_price', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-shadow"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={rowData.bath_and_grooming_price}
                            onChange={(e) => handlePriceChange(key, 'bath_and_grooming_price', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-shadow"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-medium transition-all shadow-sm focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 outline-none disabled:opacity-50 flex items-center justify-center min-w-[120px] active:scale-95 ease-[cubic-bezier(0.23,1,0.32,1)]"
            >
              {saving ? (
                 <><ArrowPathIcon className="w-5 h-5 animate-spin mr-2" /> Salvando...</>
              ) : (
                 'Salvar Preços'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PriceManagementModal;
