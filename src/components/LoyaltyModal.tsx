import React from 'react';
import { XMarkIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import LoyaltyCardPage from './LoyaltyCardPage';

interface LoyaltyModalProps {
    isOpen: boolean;
    onClose: () => void;
    petName: string;
    ownerName: string;
}

const LoyaltyModal: React.FC<LoyaltyModalProps> = ({ isOpen, onClose, petName, ownerName }) => {
    if (!isOpen) return null;

    const url = `${window.location.origin}/?fidelidade=true&pet=${encodeURIComponent(petName)}&owner=${encodeURIComponent(ownerName)}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        // Poderiamos adicionar um feedback visual aqui, mas o usuário pediu para não adicionar nada extra
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-pink-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
                {/* Header Admin */}
                <div className="bg-pink-50/80 px-8 py-4 border-b border-pink-100 flex justify-between items-center relative z-20">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-pink-100 rounded-lg text-pink-600">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                        </span>
                        <h2 className="font-outfit font-bold text-pink-900">Prévia do Cartão</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-pink-100 rounded-full transition-colors text-pink-400 hover:text-pink-600"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Loyalty Card Content */}
                <div className="max-h-[70vh] overflow-y-auto bg-rose-50/30">
                    <LoyaltyCardPage petName={petName} ownerName={ownerName} />
                </div>

                {/* Footer Admin / Action Area */}
                <div className="bg-white px-8 py-6 border-t border-pink-100">
                    <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-3">Link para o Cliente</p>
                    <div className="flex items-center gap-2 bg-pink-50 rounded-2xl p-1.5 border border-pink-100">
                        <input 
                            type="text" 
                            readOnly 
                            value={url}
                            className="flex-1 bg-transparent border-none text-xs font-medium text-pink-800 focus:ring-0 px-3 truncate"
                        />
                        <button
                            onClick={handleCopy}
                            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
                        >
                            <ClipboardDocumentCheckIcon className="w-4 h-4" />
                            Copiar Link
                        </button>
                    </div>
                    <p className="text-[10px] text-pink-300 mt-3 text-center italic">Este link mostrará apenas o cartão acima para o tutor.</p>
                </div>
            </div>

            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default LoyaltyModal;
