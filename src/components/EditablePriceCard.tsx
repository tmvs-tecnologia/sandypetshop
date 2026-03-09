import React, { useState, useEffect } from 'react';

interface EditablePriceCardProps {
  initialPrice: number;
  onPriceChange: (price: number) => void;
  title: string;
}

const EditablePriceCard: React.FC<EditablePriceCardProps> = ({
  initialPrice,
  onPriceChange,
  title
}) => {
  const [price, setPrice] = useState(initialPrice);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(initialPrice.toString());

  // Sincroniza o estado interno com a prop inicial
  useEffect(() => {
    setPrice(initialPrice);
    setInputValue(initialPrice.toString());
  }, [initialPrice]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Converte para número e valida
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setPrice(numericValue);
      onPriceChange(numericValue);
    }
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    // Garante que o valor final seja um número válido
    const numericValue = parseFloat(inputValue);
    if (isNaN(numericValue) || numericValue < 0) {
      setPrice(0);
      setInputValue('0');
      onPriceChange(0);
    } else {
      setPrice(numericValue);
      setInputValue(numericValue.toString());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(price.toString());
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setInputValue(price.toString());
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          onClick={startEditing}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          title="Editar preço"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Valor:</span>
        
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">R$</span>
            <input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyPress}
              className="w-24 px-2 py-1 border border-gray-300 rounded text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              autoFocus
              step="0.01"
              min="0"
            />
          </div>
        ) : (
          <div 
            className="font-outfit font-bold text-lg text-gray-900 whitespace-nowrap cursor-pointer hover:text-pink-600 transition-colors"
            onClick={startEditing}
            title="Clique para editar"
          >
            R$ {price.toFixed(2).replace('.', ',')}
          </div>
        )}
      </div>
      
      {/* Visualização do valor em tempo real */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-1">Valor atual:</div>
        <div className="font-outfit font-bold text-xl text-gray-900">
          R$ {price.toFixed(2).replace('.', ',')}
        </div>
      </div>
    </div>
  );
};

export default EditablePriceCard;