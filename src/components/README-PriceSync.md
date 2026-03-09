# Sincronização de Preços - Solução

## Problema
O valor editado no `input` não sincronizava automaticamente com a `div` que exibe o preço no card de agendamento.

## Solução
Implementei uma sincronização bidirecional entre o input e a div usando estados do React.

### Como funciona:

1. **Estado compartilhado**: O valor do preço é armazenado em um estado único
2. **Atualização em tempo real**: Quando o input muda, o estado é atualizado instantaneamente
3. **Reflexo na UI**: A div exibe automaticamente o valor atualizado do estado

### Exemplos de implementação:

#### 1. Sincronização Simples (PriceSyncExample)
```tsx
const [price, setPrice] = useState(initialPrice);
const [inputValue, setInputValue] = useState(initialPrice.toString());

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setInputValue(value);
  
  const numericValue = parseFloat(value);
  if (!isNaN(numericValue) && numericValue >= 0) {
    setPrice(numericValue); // Atualiza o estado do preço
  }
};

// Input para editar
<input
  type="number"
  value={inputValue}
  onChange={handleInputChange}
/>

// Div que mostra o valor sincronizado
<div className="font-outfit font-bold text-lg text-gray-900">
  R$ {price.toFixed(2).replace('.', ',')}
</div>
```

#### 2. Edição Inline (EditableAppointmentCard)
```tsx
const [isEditing, setIsEditing] = useState(false);
const [price, setPrice] = useState(initialPrice);

// Mostra input quando está editando, div quando não está
{isEditing ? (
  <input
    type="number"
    value={inputValue}
    onChange={handleInputChange}
    onBlur={() => setIsEditing(false)}
  />
) : (
  <div onClick={() => setIsEditing(true)}>
    R$ {price.toFixed(2).replace('.', ',')}
  </div>
)}
```

#### 3. Card Completo (AppointmentCardWithEditablePrice)
Componente completo baseado no AppointmentCard original, mas com preço editável inline.

### Para implementar no seu código:

1. **Substitua o estado do preço** para usar `useState` em vez de apenas exibir o valor
2. **Adicione a função handleInputChange** para sincronizar input com estado
3. **Use o estado sincronizado** na div que exibe o valor

### Exemplo mínimo:
```tsx
// Antes (não sincronizado)
<div>R$ {price}</div>
<input type="number" value={price} />

// Depois (sincronizado)
const [currentPrice, setCurrentPrice] = useState(price);

const handlePriceChange = (e) => {
  const value = parseFloat(e.target.value);
  if (!isNaN(value)) setCurrentPrice(value);
};

<div>R$ {currentPrice.toFixed(2)}</div>
<input type="number" value={currentPrice} onChange={handlePriceChange} />
```

### Teste
Use o componente `TestEditablePrice` para ver a funcionalidade em ação:

```tsx
import TestEditablePrice from './components/TestEditablePrice';

function App() {
  return <TestEditablePrice />;
}
```

### Arquivos criados:
- `EditablePriceCard.tsx` - Componente reutilizável de card com preço editável
- `PriceSyncExample.tsx` - Exemplos de implementação
- `AppointmentCardWithEditablePrice.tsx` - Versão editável do AppointmentCard
- `TestEditablePrice.tsx` - Página de teste demonstrando a funcionalidade