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
      className={`fixed inset-0 z-[10002] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      role="dialog" 
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className={`relative bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white text-gray-600 hover:text-pink-600 transition-colors z-10 shadow-sm hover:shadow-md"
          aria-label="Fechar"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Images Container */}
        <div className="p-4 sm:p-6 flex flex-col items-center bg-white min-h-[300px]">
          {/* Imagem Superior */}
          <div className="w-full flex justify-center mb-[20px]">
            {!img1Error ? (
              <img 
                src="https://i.imgur.com/j2PoC91.jpeg" 
                alt="Tabela de Preços Sandy's Pet Shop - Parte 1" 
                className="w-full h-auto rounded-lg shadow-sm object-contain"
                loading="eager"
                referrerPolicy="no-referrer"
                onError={() => setImg1Error(true)}
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded-lg text-gray-400">
                Imagem indisponível
              </div>
            )}
          </div>

          {/* Imagem Inferior */}
          <div className="w-full flex justify-center">
            {!img2Error ? (
              <img 
                src="https://i.imgur.com/JClKgTV.jpeg" 
                alt="Tabela de Preços Sandy's Pet Shop - Parte 2" 
                className="w-full h-auto rounded-lg shadow-sm object-contain"
                loading="eager"
                referrerPolicy="no-referrer"
                onError={() => setImg2Error(true)}
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded-lg text-gray-400">
                Imagem indisponível
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default PriceTableModal;
