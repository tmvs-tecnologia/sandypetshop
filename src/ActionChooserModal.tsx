import React from 'react';

const ActionChooserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddObservation: () => void;
  onAddExtraServices: () => void;
}> = ({ isOpen, onClose, onAddObservation, onAddExtraServices }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm animate-scaleIn">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Mais Ações</h2>
        </div>
        <div className="p-6 space-y-3">
          <button 
            onClick={() => { onAddObservation(); }}
            className="w-full px-4 py-3 text-left rounded-lg border hover:bg-gray-50 transition-colors"
          >
            Adicionar Observação
          </button>
          <button 
            onClick={() => { onAddExtraServices(); }}
            className="w-full px-4 py-3 text-left rounded-lg border hover:bg-gray-50 transition-colors"
          >
            Adicionar Serviço Extra
          </button>
        </div>
        <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default ActionChooserModal;