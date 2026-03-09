import React, { useState } from 'react';
import { PriceSyncExample, EditableAppointmentCard } from './PriceSyncExample';
import EditablePriceCard from './EditablePriceCard';

// Componente de teste para demonstrar a funcionalidade
const TestEditablePrice: React.FC = () => {
  const [testAppointments, setTestAppointments] = useState([
    { id: 1, petName: 'Rex', service: 'Banho & Tosa', initialPrice: 85.00 },
    { id: 2, petName: 'Luna', service: 'Consulta Veterinária', initialPrice: 120.50 },
    { id: 3, petName: 'Thor', service: 'Vacinação', initialPrice: 45.00 },
  ]);

  const handlePriceChange = (id: number, newPrice: number) => {
    console.log(`Preço do agendamento ${id} alterado para R$ ${newPrice.toFixed(2)}`);
    setTestAppointments(prev => 
      prev.map(appointment => 
        appointment.id === id 
          ? { ...appointment, initialPrice: newPrice }
          : appointment
      )
    );
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Teste de Edição de Preços</h1>
      
      {/* Exemplo 1: Sincronização simples */}
      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Exemplo 1: Sincronização Simples</h2>
        <div className="max-w-md">
          <PriceSyncExample initialPrice={17.5} />
        </div>
      </section>

      {/* Exemplo 2: Card editável */}
      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Exemplo 2: Card de Agendamento Editável</h2>
        <div className="grid gap-4 max-w-2xl">
          {testAppointments.map(appointment => (
            <EditableAppointmentCard
              key={appointment.id}
              appointment={appointment}
            />
          ))}
        </div>
      </section>

      {/* Exemplo 3: Card completo com preço editável */}
      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Exemplo 3: Card Completo</h2>
        <div className="grid gap-4 max-w-md">
          <EditablePriceCard
            initialPrice={270.00}
            onPriceChange={(newPrice) => console.log('Novo preço:', newPrice)}
            title="Banho & Tosa - Rex"
          />
          <EditablePriceCard
            initialPrice={150.00}
            onPriceChange={(newPrice) => console.log('Novo preço:', newPrice)}
            title="Consulta - Luna"
          />
        </div>
      </section>

      {/* Demonstração do problema resolvido */}
      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Problema Resolvido</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">
            ✅ O valor do input agora sincroniza automaticamente com a div!
            <br />
            ✅ Ao editar o preço no input, a div é atualizada em tempo real.
            <br />
            ✅ Sem regras complicadas - simplesmente digite e veja o valor mudar.
          </p>
        </div>
      </section>
    </div>
  );
};

export default TestEditablePrice;