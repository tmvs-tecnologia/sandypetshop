import React from 'react';
import { createPortal } from 'react-dom';
import { DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FiscalConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    petName: string;
    ownerName: string;
    serviceName: string;
    amount: number;
    isMonthly?: boolean;
    isDaycare?: boolean;
}

const FiscalConfirmationModal: React.FC<FiscalConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    petName, 
    ownerName, 
    serviceName,
    amount,
    isMonthly,
    isDaycare 
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleIn border border-pink-50">
                {/* Header com Gradiente Luxury */}
                <div className="relative h-32 bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center">
                    <div className="absolute top-0 right-0 p-4">
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-md"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="bg-white/20 p-4 rounded-full backdrop-blur-xl border border-white/30 shadow-inner">
                        <DocumentTextIcon className="w-12 h-12 text-white" />
                    </div>
                    
                    {/* Elementos Decorativos */}
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute top-0 -right-4 w-16 h-16 bg-rose-300/20 rounded-full blur-xl"></div>
                </div>

                {/* Conteúdo */}
                <div className="px-8 pt-10 pb-8 text-center">
                    <h3 className="text-2xl font-extrabold text-gray-800 tracking-tight mb-2">
                        Emitir Nota Fiscal?
                    </h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        Você está prestes a gerar a NFS-e oficial para os serviços prestados.
                    </p>

                    {/* Card de Detalhes */}
                    <div className="bg-pink-50/50 rounded-3xl p-5 mb-8 border border-pink-100/50">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-pink-400 uppercase tracking-widest">Beneficiário</span>
                            <span className="text-sm font-bold text-gray-700">{petName}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-pink-400 uppercase tracking-widest">Tutor</span>
                            <span className="text-sm font-medium text-gray-600">{ownerName}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-pink-400 uppercase tracking-widest">Serviço</span>
                            <span className="text-sm font-medium text-gray-600">{serviceName}</span>
                        </div>
                        <div className="h-px bg-pink-100/50 my-3"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-pink-400 uppercase tracking-widest">Valor do Serviço</span>
                            <span className="text-lg font-black text-rose-500">R$ {amount.toFixed(2).replace('.', ',')}</span>
                        </div>
                        {isMonthly && !isDaycare && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                </span>
                                Plano Mensalista
                            </div>
                        )}
                        {isDaycare && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-pink-100 text-pink-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                                </span>
                                Plano Creche Pet
                            </div>
                        )}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                        >
                            Confirmar Emissão
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                        >
                            Agora não
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FiscalConfirmationModal;
