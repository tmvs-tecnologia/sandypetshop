import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xilavhopbmjhsovvybza.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- INICIANDO DIAGNÓSTICO MAIO/2026 ---');
  
  const currentYear = 2026;
  const currentMonth = 4; // Maio é 4 (0-indexado)

  const isConcluido = (s) => {
    const up = String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return up === 'CONCLUIDO' || up === 'COMPLETED' || up === 'DONE' || up === 'FINALIZADO' || up === 'APROVADO' || up === 'APPROVED';
  };

  const parseYearMonth = (dateStr) => {
    if (!dateStr) return { year: -1, month: -1 };
    const cleanStr = String(dateStr).trim();
    const parts = cleanStr.slice(0, 10).split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      if (!isNaN(year) && !isNaN(month)) {
        return { year, month };
      }
    }
    return { year: -1, month: -1 };
  };

  // 1. Banho & Tosa
  const banhoRes = await supabase.from('agendamento_banhotosa').select('price, appointment_time, status, pet_name');
  const banhoData = banhoRes.data || [];
  const banhoConcluidos = banhoData.filter(d => isConcluido(d.status));
  const banhoMes = banhoConcluidos.filter(d => {
    const { year, month } = parseYearMonth(d.appointment_time);
    return year === currentYear && month === currentMonth;
  });
  const banhoSum = banhoMes.reduce((sum, d) => sum + Number(d.price || 0), 0);
  console.log(`Banho & Tosa em Maio/2026: R$ ${banhoSum} (${banhoMes.length} servicos)`);

  // 2. Pet Móvel (appointments + pet_movel_appointments)
  const apptRes = await supabase.from('appointments').select('price, appointment_time, status, service, pet_name');
  const pmRes = await supabase.from('pet_movel_appointments').select('price, appointment_time, status, pet_name');
  
  const realPetMovel = [
    ...(pmRes.data || []).map(d => ({ price: d.price, dateStr: d.appointment_time, status: d.status })),
    ...(apptRes.data || []).map(d => ({ price: d.price, dateStr: d.appointment_time, status: d.status }))
  ];
  const pmConcluidos = realPetMovel.filter(d => isConcluido(d.status));
  const pmMes = pmConcluidos.filter(d => {
    const { year, month } = parseYearMonth(d.dateStr);
    return year === currentYear && month === currentMonth;
  });
  const pmSum = pmMes.reduce((sum, d) => sum + Number(d.price || 0), 0);
  console.log(`Pet Móvel em Maio/2026: R$ ${pmSum} (${pmMes.length} servicos)`);

  // 3. Creche
  const daycareRes = await supabase.from('daycare_enrollments').select('total_price, created_at, status, pet_name');
  const crecheData = daycareRes.data || [];
  const crecheConcluidos = crecheData.filter(d => isConcluido(d.status));
  const crecheMes = crecheConcluidos.filter(d => {
    const { year, month } = parseYearMonth(d.created_at);
    return year === currentYear && month === currentMonth;
  });
  const crecheSum = crecheMes.reduce((sum, d) => sum + Number(d.total_price || 0), 0);
  console.log(`Creche em Maio/2026: R$ ${crecheSum} (${crecheMes.length} servicos)`);

  // 4. Hotel
  const hotelRes = await supabase.from('hotel_registrations').select('total_services_price, check_in_date, status, pet_name');
  const hotelData = hotelRes.data || [];
  const hotelConcluidos = hotelData.filter(d => isConcluido(d.status));
  const hotelMes = hotelConcluidos.filter(d => {
    const { year, month } = parseYearMonth(d.check_in_date);
    return year === currentYear && month === currentMonth;
  });
  const hotelSum = hotelMes.reduce((sum, d) => sum + Number(d.total_services_price || 0), 0);
  console.log(`Hotel em Maio/2026: R$ ${hotelSum} (${hotelMes.length} servicos)`);

  const totalReal = banhoSum + pmSum + crecheSum + hotelSum;
  console.log(`Total geral Maio/2026: R$ ${totalReal}`);
  console.log('---------------------------------------');
}

run();
