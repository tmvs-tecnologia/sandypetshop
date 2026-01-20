// FIX: Define and export all types to be used across the application.
// This file should only contain type definitions, not constant values.
export enum ServiceType {
  BATH = 'BATH',
  BATH_AND_GROOMING = 'BATH_AND_GROOMING',
  GROOMING_ONLY = 'GROOMING_ONLY',
  VISIT_DAYCARE = 'VISIT_DAYCARE',
  VISIT_HOTEL = 'VISIT_HOTEL',
  PET_MOBILE_BATH = 'PET_MOBILE_BATH',
  PET_MOBILE_BATH_AND_GROOMING = 'PET_MOBILE_BATH_AND_GROOMING',
  PET_MOBILE_GROOMING_ONLY = 'PET_MOBILE_GROOMING_ONLY',
  UNKNOWN = 'UNKNOWN',
}

export enum PetWeight {
  UP_TO_5 = 'UP_TO_5',
  KG_10 = 'KG_10',
  KG_15 = 'KG_15',
  KG_20 = 'KG_20',
  KG_25 = 'KG_25',
  KG_30 = 'KG_30',
  OVER_30 = 'OVER_30',
}

export interface AddonService {
  id: string;
  label: string;
  price: number;
  requiresWeight?: PetWeight[];
  excludesWeight?: PetWeight[];
  requiresService?: ServiceType;
}

export interface Appointment {
  id: string;
  petName: string;
  ownerName: string;
  whatsapp: string;
  service: ServiceType;
  appointmentTime: Date;
  monthly_client_id?: string;
  condominium?: string;
  status?: string;
}

export interface AdminAppointment {
  id: string;
  appointment_time: string;
  pet_name: string;
  owner_name: string;
  service: string;
  status: 'AGENDADO' | 'CONCLUÍDO';
  price: number;
  addons: string[];
  whatsapp: string;
  weight: string;
  observation?: string;
  monthly_client_id?: string;
  owner_address?: string;
  pet_breed?: string;
  condominium?: string;
  responsible?: string;
  extra_services?: {
    pernoite: { enabled: boolean; value: number };
    banho_tosa: { enabled: boolean; value: number };
    so_banho: { enabled: boolean; value: number };
    adestrador: { enabled: boolean; value: number };
    hidratacao: { enabled: boolean; value: number };
    despesa_medica: { enabled: boolean; value: number };
    dias_extras: { quantity: number; value: number };
    botinha?: { enabled: boolean; value: number };
    contorno?: { enabled: boolean; value: number };
    pintura?: { enabled: boolean; value: number };
    patacure?: { enabled: boolean; value: number };
  };
}

export interface PetMovelAppointment extends AdminAppointment {
    condominium: string;
    client_name: string;
    apartment?: string;
    date: string;
    time: string;
}


export interface Client {
  id: string;
  name: string;
  phone: string;
}

export interface MonthlyClient {
  id: string;
  pet_name: string;
  pet_breed: string;
  owner_name: string;
  owner_address: string;
  whatsapp: string;
  service: string;
  weight: string;
  price: number;
  recurrence_type: 'weekly' | 'bi-weekly' | 'monthly';
  recurrence_day: number;
  recurrence_time: number;
  payment_due_date: string;
  is_active: boolean;
  payment_status: 'Pendente' | 'Pago';
  condominium?: string;
  pet_photo_url?: string | null;
  extra_services?: {
    pernoite: { enabled: boolean; value: number };
    banho_tosa: { enabled: boolean; value: number };
    so_banho: { enabled: boolean; value: number };
    adestrador: { enabled: boolean; value: number };
    hidratacao: { enabled: boolean; value: number };
    despesa_medica: { enabled: boolean; value: number };
    dias_extras: { quantity: number; value: number };
  };
}

export interface DaycareRegistration {
    id?: string;
    created_at?: string;
    enrollment_date?: string;
    pet_name: string;
    pet_breed: string;
    is_neutered: boolean | null;
    pet_sex: string;
    pet_age: string;
    pet_photo_url?: string | null;
    has_sibling_discount: boolean;
    tutor_name: string;
    tutor_rg: string;
    address: string;
    contact_phone: string;
    emergency_contact_name: string;
    vet_phone: string;
    gets_along_with_others: boolean | null;
    last_vaccine: string;
    last_deworming: string;
    last_flea_remedy: string;
    has_allergies: boolean | null;
    allergies_description: string;
    needs_special_care: boolean | null;
    special_care_description: string;
    delivered_items: {
        items: string[];
        other: string;
    };
    contracted_plan: string | null;
    check_in_date?: string;
    check_in_time?: string;
    check_out_date?: string;
    check_out_time?: string;
    attendance_days?: number[];
    // Serviços extras
    extra_services?: {
        pernoite?: boolean;
        banho_tosa?: boolean;
        so_banho?: boolean;
        adestrador?: boolean;
        despesa_medica?: boolean;
        dia_extra?: number;
        pernoite_quantity?: number;
        pernoite_price?: number;
        banho_tosa_quantity?: number;
        banho_tosa_price?: number;
        so_banho_quantity?: number;
        so_banho_price?: number;
        adestrador_quantity?: number;
        adestrador_price?: number;
        despesa_medica_quantity?: number;
        despesa_medica_price?: number;
        dia_extra_price?: number;
    };
    total_price?: number;
    payment_date: string;
    payment_status?: 'Pendente' | 'Pago';
    status: 'Pendente' | 'Aprovado' | 'Rejeitado';
}

export interface HotelRegistration {
    id?: string;
    created_at?: string;
    updated_at?: string;
    pet_name: string;
    pet_sex: 'Macho' | 'Fêmea' | null;
    pet_breed: string;
    is_neutered: boolean | null;
    pet_age: string;
    pet_weight?: PetWeight | null;
    pet_photo_url?: string | null;
    contract_accepted?: boolean;
    tutor_name: string;
    tutor_rg: string;
    tutor_address: string;
    tutor_phone: string;
    tutor_email: string;
    tutor_social_media: string | null;
    vet_phone: string | null;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relation: string;
    has_rg_document: boolean | null;
    has_residence_proof: boolean | null;
    has_vaccination_card: boolean | null;
    has_vet_certificate: boolean | null;
    has_flea_tick_remedy: boolean | null;
    flea_tick_remedy_date: string | null;
    photo_authorization: boolean | null;
    retrieve_at_checkout: boolean | null;
    preexisting_disease: string | null;
    allergies: string | null;
    behavior: string | null;
    fears_traumas: string | null;
    wounds_marks: string | null;
    food_brand: string | null;
    food_quantity: string | null;
    feeding_frequency: string | null;
    food_observations: string | null;
    accepts_treats: string | null;
    special_food_care: string | null;
    check_in_date: string | null;
    check_in_time: string | null;
    check_out_date: string | null;
    check_out_time: string | null;
    service_bath: boolean | null;
    service_transport: boolean | null;
    service_daily_rate: boolean | null;
    service_extra_hour: boolean | null;
    service_vet: boolean | null;
    service_training: boolean | null;
    total_services_price: number;
    additional_info: string | null;
    professional_name: string | null;
    registration_date: string;
    tutor_check_in_signature: string | null;
    tutor_check_out_signature: string | null;
    tutor_signature: string | null;
    declaration_accepted: boolean;
    status: 'Ativo' | 'Concluído' | 'Cancelado';
    checked_in_at?: string;
    checked_out_at?: string;
    check_in_status?: 'pending' | 'checked_in' | 'checked_out';
    approval_status?: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'pendente' | 'aprovado' | 'rejeitado';
    payment_status?: 'Pendente' | 'Pago';
    rejection_reason?: string | null;
    extra_services?: {
        pernoite: { enabled: boolean; value: number };
        banho_tosa: { enabled: boolean; value: number };
        so_banho: { enabled: boolean; value: number };
        adestrador: { enabled: boolean; value: number };
        hidratacao: { enabled: boolean; value: number };
        despesa_medica: { enabled: boolean; value: number };
        dias_extras: { quantity: number; value: number };
    };
}
