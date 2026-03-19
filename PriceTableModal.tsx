import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PriceTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PriceTableModal: React.FC<PriceTableModalProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [img1Error, setImg1Error] = useState(false);
  const [img2Error, setImg2Error] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300); // Wait for animation
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isVisible && !isOpen) return null;

  const modal = (
    <div 
      className={`fixed inset-0 z-[10002] flex items-center justify-center p-4 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
      role="dialog" 
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-pink-950/40 backdrop-blur-md transition-opacity duration-500 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className={`relative bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(244,114,182,0.3)] w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] border border-pink-100/50 ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}`}
      >
        {/* Header fixo com o botão de fechar */}
        <div className="sticky top-0 z-30 flex justify-between items-center p-6 bg-white/90 backdrop-blur-sm border-b border-pink-50 rounded-t-[2rem]">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pink-950 tracking-tight">Tabela de Preços</h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2.5 bg-white rounded-full text-pink-400 hover:text-pink-600 hover:bg-pink-50 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(244,114,182,0.2)] hover:scale-110 ml-4"
            aria-label="Fechar"
          >
            <XMarkIcon className="h-6 w-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Images Container */}
        <div className="p-6 sm:p-10 flex flex-col items-center overflow-y-auto space-y-8 relative z-10">
          
          {/* Imagem Superior */}
          <div className="w-full flex justify-center relative group">
            <div className="absolute inset-0 bg-pink-200/20 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative w-full rounded-[1.5rem] p-2 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 transition-transform duration-500 hover:-translate-y-1">
              {!img1Error ? (
                <img 
                  src="https://i.imgur.com/4bJHpV4.jpeg" 
                  alt="Tabela de Preços Sandy's Pet Shop - Parte 1" 
                  className="w-full h-auto rounded-[1rem] object-contain"
                  loading="eager"
                  referrerPolicy="no-referrer"
                  onError={() => setImg1Error(true)}
                />
              ) : (
                <div className="w-full h-64 bg-pink-50 flex flex-col items-center justify-center rounded-[1rem] text-pink-300">
                  <span className="text-2xl mb-2">🐾</span>
                  <span className="text-sm font-medium">Imagem indisponível</span>
                </div>
              )}
            </div>
          </div>

          {/* Imagem Inferior */}
          <div className="w-full flex justify-center relative group">
             <div className="absolute inset-0 bg-pink-200/20 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <div className="relative w-full rounded-[1.5rem] p-2 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 transition-transform duration-500 hover:-translate-y-1">
              {!img2Error ? (
                <img 
                  src="https://i.imgur.com/JClKgTV.jpeg" 
                  alt="Tabela de Preços Sandy's Pet Shop - Parte 2" 
                  className="w-full h-auto rounded-[1rem] object-contain"
                  loading="eager"
                  referrerPolicy="no-referrer"
                  onError={() => setImg2Error(true)}
                />
              ) : (
                <div className="w-full h-64 bg-pink-50 flex flex-col items-center justify-center rounded-[1rem] text-pink-300">
                  <span className="text-2xl mb-2">🐾</span>
                  <span className="text-sm font-medium">Imagem indisponível</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default PriceTableModal;
