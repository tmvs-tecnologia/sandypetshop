import React, { useState } from 'react';
import EditablePriceCard from './EditablePriceCard';

// Exemplo de como usar o EditablePriceCard
const EditablePriceCardExample: React.FC = () => {
  const [appointments, setAppointments] = useState([
    { id: 1, title: 'Banho & Tosa - Rex', price: 85.00 },
    { id: 2, title: 'Consulta - Luna', price: 120.50 },
    { id: 3, title: 'Vacina - Thor', price: 45.00 },
  ]);

  const handlePriceChange = (id: number, newPrice: number) => {
    setAppointments(prev => 
      prev.map(appointment => 
        appointment.id === id 
          ? { ...appointment, price: newPrice }
          : appointment
      )
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Agendamentos</h2>
      
      {appointments.map(appointment => (
        <EditablePriceCard
          key={appointment.id}
          initialPrice={appointment.price}
          onPriceChange={(newPrice) => handlePriceChange(appointment.id, newPrice)}
          title={appointment.title}
        />
      ))}
    </div>
  );
};

// Exemplo de como implementar a mesma lógica diretamente em um componente existente
export const EditablePriceInline: React.FC<{ initialPrice: number; onPriceChange: (price: number) => void }> = ({ 
  initialPrice, 
  onPriceChange 
}) => {
  const [price, setPrice] = useState(initialPrice);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(initialPrice.toString());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setPrice(numericValue);
      onPriceChange(numericValue);
    }
  };

  const handleInputBlur = () => {
    setIsEditing(false);
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

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Valor:</span>
      
      {isEditing ? (
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">R$</span>
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
            autoFocus
            step="0.01"
            min="0"
          />
        </div>
      ) : (
        <div 
          className="font-outfit font-bold text-lg text-gray-900 whitespace-nowrap cursor-pointer hover:text-pink-600 transition-colors"
          onClick={() => {
            setIsEditing(true);
            setInputValue(price.toString());
          }}
          title="Clique para editar"
        >
          R$ {price.toFixed(2).replace('.', ',')}
        </div>
      )}
    </div>
  );
};

export default EditablePriceCardExample;