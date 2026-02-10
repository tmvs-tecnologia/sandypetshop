import { ServiceType, PetWeight, AddonService } from './types';

export const SERVICES = {
  [ServiceType.BATH]: {
    label: 'Banho',
    duration: 1, // in hours
  },
  [ServiceType.BATH_AND_GROOMING]: {
    label: 'Banho & Tosa',
    duration: 2, // in hours
  },
  [ServiceType.GROOMING_ONLY]: {
    label: 'Só Tosa',
    duration: 2, // in hours
  },
  [ServiceType.VISIT_DAYCARE]: {
    label: 'Visita — Creche Pet',
    duration: 1,
  },
  [ServiceType.VISIT_HOTEL]: {
    label: 'Visita — Hotel Pet',
    duration: 1,
  },
  [ServiceType.PET_MOBILE_BATH]: {
    label: 'Banho (Pet Móvel)',
    duration: 1.5,
  },
  [ServiceType.PET_MOBILE_BATH_AND_GROOMING]: {
    label: 'Banho & Tosa (Pet Móvel)',
    duration: 2.5,
  },
  [ServiceType.PET_MOBILE_GROOMING_ONLY]: {
    label: 'Só Tosa (Pet Móvel)',
    duration: 2.5,
  },
  [ServiceType.UNKNOWN]: {
    label: 'Agendamento',
    duration: 1,
  },
};

export const PET_WEIGHT_OPTIONS: Record<PetWeight, string> = {
  [PetWeight.UP_TO_5]: 'Até 5kg',
  [PetWeight.KG_10]: 'Até 10kg',
  [PetWeight.KG_15]: 'Até 15kg',
  [PetWeight.KG_20]: 'Até 20kg',
  [PetWeight.KG_25]: 'Até 25kg',
  [PetWeight.KG_30]: 'Até 30kg',
  [PetWeight.OVER_30]: 'Acima de 30kg',
};

// Preços base por peso: Banho e Só Tosa (tosa isolada)
// Observação: O preço de "Banho & Tosa" é a soma Banho + Só Tosa
export const SERVICE_PRICES: Record<PetWeight, { [key in ServiceType.BATH | ServiceType.GROOMING_ONLY]: number }> = {
  [PetWeight.UP_TO_5]: { [ServiceType.BATH]: 65, [ServiceType.GROOMING_ONLY]: 65 },
  [PetWeight.KG_10]: { [ServiceType.BATH]: 75, [ServiceType.GROOMING_ONLY]: 75 },
  [PetWeight.KG_15]: { [ServiceType.BATH]: 85, [ServiceType.GROOMING_ONLY]: 85 },
  [PetWeight.KG_20]: { [ServiceType.BATH]: 95, [ServiceType.GROOMING_ONLY]: 95 },
  [PetWeight.KG_25]: { [ServiceType.BATH]: 105, [ServiceType.GROOMING_ONLY]: 105 },
  [PetWeight.KG_30]: { [ServiceType.BATH]: 115, [ServiceType.GROOMING_ONLY]: 115 },
  [PetWeight.OVER_30]: { [ServiceType.BATH]: 150, [ServiceType.GROOMING_ONLY]: 150 },
};

export const ADDON_SERVICES: AddonService[] = [
  { id: 'tosa_tesoura', label: 'Tosa na Tesoura', price: 160 },
  { id: 'aparacao', label: 'Aparação Contorno', price: 35 },
  { id: 'hidratacao', label: 'Hidratação', price: 25 },
  { id: 'tosa_higienica', label: 'Tosa Higiênica', price: 0 },
  { id: 'botinhas', label: 'Botinhas', price: 25 },
  { id: 'desembolo', label: 'Desembolo', price: 25 },
  { id: 'patacure1', label: 'Patacure (1 cor)', price: 10 },
  { id: 'patacure2', label: 'Patacure (2 cores)', price: 20 },
  { id: 'tintura', label: 'Tintura (1 parte)', price: 20 },
];


// Preços dos planos da creche
export const DAYCARE_PLAN_PRICES: Record<string, number> = {
  '4x_month': 300,
  '8x_month': 520,
  '12x_month': 660,
  '16x_month': 720,
  '20x_month': 800,
};

// Preços dos serviços extras da creche
export const DAYCARE_EXTRA_SERVICES_PRICES: Record<string, number> = {
  pernoite: 50,
  banho_tosa: 80,
  so_banho: 40,
  adestrador: 60,
  despesa_medica: 100,
  dia_extra: 30,
};

// Preços base do hotel pet (por dia)
export const HOTEL_BASE_PRICE = 80;

// Preços dos serviços extras do hotel pet
export const HOTEL_EXTRA_SERVICES_PRICES: Record<string, number> = {
  banho_tosa: 100,
  transporte: 50,
  veterinario: 120,
  adestramento: 80,
};

export const WORKING_HOURS: number[] = [9, 10, 11, 12, 14, 15, 16, 17];
export const VISIT_WORKING_HOURS: number[] = [9, 10, 11, 12, 14, 15, 16, 17, 18, 19];
export const LUNCH_HOUR = 13;
export const MAX_CAPACITY_PER_SLOT = 1; // Single groomer/slot
