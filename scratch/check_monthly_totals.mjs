import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xilavhopbmjhsovvybza.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const isConcluido = (s) => {
  const up = String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return up === 'CONCLUIDO' || up === 'COMPLETED' || up === 'DONE' || up === 'FINALIZADO' || up === 'APROVADO' || up === 'APPROVED';
};

async function check() {
  const currentMonth = 4; // Maio (index 4)
  const currentYear = 2026;

  console.log(`Verificando faturamento real para o mês ${currentMonth + 1}/${currentYear}...`);

  const { data: banhoTosa } = await supabase.from('agendamento_banhotosa').select('price, appointment_time, status');
  const { data: appointments } = await supabase.from('appointments').select('price, appointment_time, status');
  const { data: petMovel } = await supabase.from('pet_movel_appointments').select('price, appointment_time, status');
  const { data: daycare } = await supabase.from('daycare_enrollments').select('total_price, created_at, status');
  const { data: hotel } = await supabase.from('hotel_registrations').select('total_services_price, check_in_date, status');

  const banhoTosaReal = (banhoTosa || []).filter(d => {
    if (!isConcluido(d.status)) return false;
    const date = d.appointment_time ? new Date(d.appointment_time) : null;
    return date && date.getUTCMonth() === currentMonth && date.getUTCFullYear() === currentYear;
  });
  const banhoTosaSum = banhoTosaReal.reduce((sum, d) => sum + Number(d.price || 0), 0);

  const pmReal1 = (appointments || []).filter(d => {
    if (!isConcluido(d.status)) return false;
    const date = d.appointment_time ? new Date(d.appointment_time) : null;
    return date && date.getUTCMonth() === currentMonth && date.getUTCFullYear() === currentYear;
  });
  const pmReal2 = (petMovel || []).filter(d => {
    if (!isConcluido(d.status)) return false;
    const date = d.appointment_time ? new Date(d.appointment_time) : null;
    return date && date.getUTCMonth() === currentMonth && date.getUTCFullYear() === currentYear;
  });
  const petMovelSum = [...pmReal1, ...pmReal2].reduce((sum, d) => sum + Number(d.price || 0), 0);

  const daycareReal = (daycare || []).filter(d => {
    if (!isConcluido(d.status)) return false;
    const date = d.created_at ? new Date(d.created_at) : null;
    return date && date.getUTCMonth() === currentMonth && date.getUTCFullYear() === currentYear;
  });
  const daycareSum = daycareReal.reduce((sum, d) => sum + Number(d.total_price || 0), 0);

  const hotelReal = (hotel || []).filter(d => {
    if (!isConcluido(d.status)) return false;
    const date = d.check_in_date ? new Date(d.check_in_date) : null;
    return date && date.getUTCMonth() === currentMonth && date.getUTCFullYear() === currentYear;
  });
  const hotelSum = hotelReal.reduce((sum, d) => sum + Number(d.total_services_price || 0), 0);

  console.log(`\nResultados Reais Maio/2026:`);
  console.log(`- Banho & Tosa: R$ ${banhoTosaSum} (${banhoTosaReal.length} serviços)`);
  console.log(`- Pet Móvel: R$ ${petMovelSum} (${pmReal1.length + pmReal2.length} serviços)`);
  console.log(`- Creche Pet: R$ ${daycareSum} (${daycareReal.length} serviços)`);
  console.log(`- Hotel Pet: R$ ${hotelSum} (${hotelReal.length} serviços)`);
  console.log(`Total Geral: R$ ${banhoTosaSum + petMovelSum + daycareSum + hotelSum}`);

  // Verificar se há algum outro mês com dados (ex: Dezembro/2025)
  console.log(`\nVerificando Dezembro/2025 (11/2025)...`);
  const decMonth = 11;
  const decYear = 2025;

  const banhoDec = (banhoTosa || []).filter(d => {
    if (!isConcluido(d.status)) return false;
    const date = d.appointment_time ? new Date(d.appointment_time) : null;
    return date && date.getUTCMonth() === decMonth && date.getUTCFullYear() === decYear;
  });
  const banhoDecSum = banhoDec.reduce((sum, d) => sum + Number(d.price || 0), 0);

  const pmDec1 = (appointments || []).filter(d => {
    if (!isConcluido(d.status)) return false;
    const date = d.appointment_time ? new Date(d.appointment_time) : null;
    return date && date.getUTCMonth() === decMonth && date.getUTCFullYear() === decYear;
  });
  const pmDec2 = (petMovel || []).filter(d => {
    if (!isConcluido(d.status)) return false;
    const date = d.appointment_time ? new Date(d.appointment_time) : null;
    return date && date.getUTCMonth() === decMonth && date.getUTCFullYear() === decYear;
  });
  const pmDecSum = [...pmDec1, ...pmDec2].reduce((sum, d) => sum + Number(d.price || 0), 0);

  const daycareDec = (daycare || []).filter(d => {
    if (!isConcluido(d.status)) return false;
    const date = d.created_at ? new Date(d.created_at) : null;
    return date && date.getUTCMonth() === decMonth && date.getUTCFullYear() === decYear;
  });
  const daycareDecSum = daycareDec.reduce((sum, d) => sum + Number(d.total_price || 0), 0);

  const hotelDec = (hotel || []).filter(d => {
    if (!isConcluido(d.status)) return false;
    const date = d.check_in_date ? new Date(d.check_in_date) : null;
    return date && date.getUTCMonth() === decMonth && date.getUTCFullYear() === decYear;
  });
  const hotelDecSum = hotelDec.reduce((sum, d) => sum + Number(d.total_services_price || 0), 0);

  console.log(`\nResultados Reais Dezembro/2025:`);
  console.log(`- Banho & Tosa: R$ ${banhoDecSum}`);
  console.log(`- Pet Móvel: R$ ${pmDecSum}`);
  console.log(`- Creche Pet: R$ ${daycareDecSum}`);
  console.log(`- Hotel Pet: R$ ${hotelDecSum}`);
  console.log(`Total Geral Dezembro/2025: R$ ${banhoDecSum + pmDecSum + daycareDecSum + hotelDecSum}`);
}

check();
