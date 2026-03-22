import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { PET_WEIGHT_OPTIONS } from '../../constants';
import { PetWeight } from '../../types';
import { XMarkIcon, CheckCircleIcon, ArrowPathIcon, TagIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';
import { useRef } from 'react';

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

  // --- DRAG TO CLOSE (Igual Dashboard/Fechar Agenda) ---
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleDragStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startY.current = y;
    currentY.current = y;
  };

  const handleDragMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    currentY.current = y;
    const diff = y - startY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > 150) {
      setDragY(0);
      handleClose();
    } else {
      setDragY(0);
    }
  };

  const handleClose = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onClose();
      // Reset animation state after it finishes
      setTimeout(() => setIsAnimating(false), 100);
    }, 500);
  };
  // ------------------------------------------------------

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
      
      if (field === 'bath_price' || field === 'bath_and_grooming_price') {
         updated.grooming_only_price = Math.max(0, updated.bath_and_grooming_price - updated.bath_price);
      } else if (field === 'grooming_only_price') {
         updated.bath_and_grooming_price = updated.bath_price + updated.grooming_only_price;
      }

      return { ...prev, [weightCategory]: updated };
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

  const weightEntries = Object.entries(PET_WEIGHT_OPTIONS);

  const modalContent = (
    <div className="fixed inset-0 z-[10005] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={saving || success ? undefined : onClose}
      />

      {/* Panel — Agora Arrastável */}
      <div 
        className={`relative bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] transition-all ease-out transform origin-top ${isAnimating ? 'translate-y-full opacity-0 duration-500' : 'animate-fadeIn opacity-100 scale-100'} ${!isDragging && !isAnimating ? 'duration-500' : 'duration-0'}`}
        style={!isAnimating && dragY > 0 ? { transform: `translateY(${dragY}px)` } : {}}
      >

        {/* Success Overlay */}
        <div
          className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/97 backdrop-blur-md transition-all duration-500 ${
            success ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
        >
          <div className={`w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-5 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-150 ${success ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="w-10 h-10 text-green-500" strokeWidth={2} />
            </div>
          </div>
          <h3
            className={`text-3xl font-bold text-gray-800 transition-all duration-700 ease-out delay-300 ${success ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ fontFamily: 'Lobster Two, cursive' }}
          >
            Preços Atualizados!
          </h3>
          <p className={`text-gray-500 mt-2 text-base font-medium transition-all duration-700 ease-out delay-[400ms] ${success ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Os novos valores já estão ativos.
          </p>
        </div>

        {/* Content */}
        <div className={`flex flex-col flex-1 min-h-0 transition-all duration-500 ${success ? 'blur-sm opacity-30 scale-[0.98]' : ''}`}>

          {/* Header Elegante (Cópia Dashboard) */}
          <div 
            className="relative p-6 sm:p-10 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100 rounded-t-[2rem] overflow-hidden shrink-0 cursor-grab active:cursor-grabbing select-none"
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            {/* Elementos Decorativos */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-pink-300/40 rounded-full mt-3 hover:bg-pink-300/60 transition-colors"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

            <button
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              type="button"
              className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white text-pink-900 shadow-sm border border-pink-100/50 backdrop-blur-sm transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
              title="Fechar"
            >
              <XMarkIcon className="w-6 h-6" strokeWidth={2.5} />
            </button>

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2
                  className="text-pink-950 text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3"
                  style={{ fontFamily: 'Lobster Two, cursive' }}
                >
                  Definir Preços
                </h2>
                <p className="text-pink-800/70 text-sm sm:text-base font-medium leading-relaxed max-w-xs">
                  Valores base por faixa de peso do pet
                </p>
              </div>
            </div>

            {/* Column headers row — agora integrado ao header elegante */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="text-pink-900/40 text-[0.65rem] font-black uppercase tracking-[0.2em]">Peso</div>
              <div className="text-pink-900/40 text-[0.65rem] font-black uppercase tracking-[0.2em]">Banho</div>
              <div className="text-pink-900/40 text-[0.65rem] font-black uppercase tracking-[0.2em]">{`Banho & Tosa`}</div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] bg-gray-50/60">
            {error && (
              <div className="mx-5 mt-4 p-3.5 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <ArrowPathIcon className="w-7 h-7 animate-spin" />
                <p className="text-sm">Carregando preços...</p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-2.5">
                {weightEntries.map(([key, label]) => {
                  const rowData = prices[key] || { bath_price: 0, bath_and_grooming_price: 0, grooming_only_price: 0 };
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-3 gap-3 items-center bg-white rounded-2xl px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-gray-100"
                    >
                      {/* Weight badge */}
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 text-xs font-bold whitespace-nowrap">
                          {label}
                        </span>
                      </div>

                      {/* Bath price */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                          <span className="text-gray-400 text-xs font-semibold">R$</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={rowData.bath_price || ''}
                          placeholder="0"
                          onChange={(e) => handlePriceChange(key, 'bath_price', e.target.value)}
                          className="w-full pl-7 pr-2 py-2 text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                        />
                      </div>

                      {/* Bath & Grooming price */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                          <span className="text-gray-400 text-xs font-semibold">R$</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={rowData.bath_and_grooming_price || ''}
                          placeholder="0"
                          onChange={(e) => handlePriceChange(key, 'bath_and_grooming_price', e.target.value)}
                          className="w-full pl-7 pr-2 py-2 text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex-[2] px-4 py-3 bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-pink-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Salvando...</>
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
