import React, { useState } from 'react';

// Exemplo simples de sincronização entre input e div
export const PriceSyncExample: React.FC<{ initialPrice: number }> = ({ initialPrice }) => {
  const [price, setPrice] = useState(initialPrice);
  const [inputValue, setInputValue] = useState(initialPrice.toString());

  // Atualiza o valor quando o input muda
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Converte para número e atualiza o estado do preço
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setPrice(numericValue);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Card de Agendamento</h3>
      
      {/* Input para editar o preço */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Editar Preço:
        </label>
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          className="w-full mt-1 px-5 py-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          step="0.01"
          min="0"
        />
      </div>
      
      {/* Div que mostra o preço atualizado em tempo real */}
      <div className="border-t pt-4">
        <div className="text-sm text-gray-600 mb-1">Valor do Serviço:</div>
        <div className="font-outfit font-bold text-lg text-gray-900 whitespace-nowrap">
          R$ {price.toFixed(2).replace('.', ',')}
        </div>
      </div>
    </div>
  );
};

// Exemplo de como integrar isso em um card existente
export const EditableAppointmentCard: React.FC<{ 
  appointment: { id: number; petName: string; service: string; initialPrice: number } 
}> = ({ appointment }) => {
  const [price, setPrice] = useState(appointment.initialPrice);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(appointment.initialPrice.toString());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setPrice(numericValue);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setInputValue(price.toString());
  };

  const saveEdit = () => {
    setIsEditing(false);
    const numericValue = parseFloat(inputValue);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setPrice(numericValue);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setInputValue(price.toString());
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{appointment.petName}</h3>
          <p className="text-sm text-gray-600">{appointment.service}</p>
        </div>
        
        {/* Área de preço editável */}
        <div className="text-right">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">R$</span>
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm font-bold text-gray-900"
                autoFocus
                step="0.01"
                min="0"
              />
              <div className="flex gap-1">
                <button
                  onClick={saveEdit}
                  className="p-1 text-green-600 hover:text-green-800"
                  title="Salvar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Cancelar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="font-outfit font-bold text-lg text-gray-900 whitespace-nowrap cursor-pointer hover:text-pink-600 transition-colors"
              onClick={startEditing}
              title="Clique para editar o preço"
            >
              R$ {price.toFixed(2).replace('.', ',')}
            </div>
          )}
        </div>
      </div>
      
      {/* Informações adicionais */}
      <div className="border-t pt-3">
        <div className="text-xs text-gray-500">
          ID: {appointment.id} • Clique no valor para editar
        </div>
      </div>
    </div>
  );
};

export default { PriceSyncExample, EditableAppointmentCard };