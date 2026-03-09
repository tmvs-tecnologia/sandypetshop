import React, { useState } from 'react';

// Componente simples para demonstrar a sincronização de preços
const TestPriceSyncPage: React.FC = () => {
  const [price, setPrice] = useState(17.5);
  const [inputValue, setInputValue] = useState('17.5');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      setPrice(numericValue);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Teste de Sincronização de Preços</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Card de Agendamento - Exemplo 1</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Editar Preço:
              </label>
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Valor do Serviço:</div>
              <div className="font-outfit font-bold text-2xl text-gray-900">
                R$ {price.toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Card de Agendamento - Exemplo 2</h2>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Rex - Banho & Tosa</h3>
                <p className="text-sm text-gray-600">ID: 12345</p>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Valor:</div>
                <div className="font-outfit font-bold text-lg text-gray-900">
                  R$ {price.toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Ajustar Preço:
              </label>
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-green-800 mb-2">✅ Problema Resolvido!</h3>
          <p className="text-green-700">
            O valor do input agora sincroniza automaticamente com a div. 
            Ao editar o preço no input, a div é atualizada em tempo real sem nenhuma regra complicada.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPriceSyncPage;