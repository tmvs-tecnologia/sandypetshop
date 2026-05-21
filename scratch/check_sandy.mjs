import fetch from 'node-fetch';

const SUPABASE_URL = 'https://xilavhopbmjhsovvybza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI';

const currentYear = 2026;
const currentMonth = 4; // 0-indexed, 4 = Maio

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

async function queryTable(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  return res.json();
}

async function check() {
  console.log('--- BUSCANDO REGISTROS NO SUPABASE ---');
  
  try {
    const banhoTosa = await queryTable('agendamento_banhotosa');
    const appointments = await queryTable('appointments');
    const petMovel = await queryTable('pet_movel_appointments');
    const daycare = await queryTable('daycare_enrollments');
    const hotel = await queryTable('hotel_registrations');

    console.log(`\nDaycare enrollments total: ${daycare.length}`);
    console.log(`Hotel registrations total: ${hotel.length}`);

    // Filtros de Maio de 2026
    const banhoTosaMaio = banhoTosa.filter(d => {
      const { year, month } = parseYearMonth(d.appointment_time);
      return year === currentYear && month === currentMonth && isConcluido(d.status);
    });

    const appointmentsMaio = appointments.filter(d => {
      const { year, month } = parseYearMonth(d.appointment_time);
      return year === currentYear && month === currentMonth && isConcluido(d.status);
    });

    const petMovelMaio = petMovel.filter(d => {
      const { year, month } = parseYearMonth(d.appointment_time);
      return year === currentYear && month === currentMonth && isConcluido(d.status);
    });

    const daycareMaio = daycare.filter(d => {
      const { year, month } = parseYearMonth(d.created_at);
      return year === currentYear && month === currentMonth && isConcluido(d.status);
    });

    const hotelMaio = hotel.filter(d => {
      const { year, month } = parseYearMonth(d.check_in_date);
      return year === currentYear && month === currentMonth && isConcluido(d.status);
    });

    console.log('\n--- TOTAIS CONCLUÍDOS MAIO/2026 ---');
    
    const sumBanho = banhoTosaMaio.reduce((sum, d) => sum + Number(d.price || 0), 0);
    console.log(`Banho & Tosa: R$ ${sumBanho} (${banhoTosaMaio.length} servicos)`);

    const sumAppt = appointmentsMaio.reduce((sum, d) => sum + Number(d.price || 0), 0);
    const sumPm = petMovelMaio.reduce((sum, d) => sum + Number(d.price || 0), 0);
    const sumPetMovel = sumAppt + sumPm;
    console.log(`Pet Móvel: R$ ${sumPetMovel} (${appointmentsMaio.length + petMovelMaio.length} servicos)`);

    const sumDaycare = daycareMaio.reduce((sum, d) => sum + Number(d.total_price || 0), 0);
    console.log(`Creche Pet: R$ ${sumDaycare} (${daycareMaio.length} servicos)`);

    const sumHotel = hotelMaio.reduce((sum, d) => sum + Number(d.total_services_price || 0), 0);
    console.log(`Hotel Pet: R$ ${sumHotel} (${hotelMaio.length} servicos)`);

    const totalEntradas = sumBanho + sumPetMovel + sumDaycare + sumHotel;
    console.log(`\nTOTAL DE ENTRADAS CONSOLIDADO: R$ ${totalEntradas}`);

    console.log('\nStatus de todos os Daycare:');
    daycare.forEach(d => {
      console.log(`- Pet: ${d.pet_name}, Status: "${d.status}", Price: ${d.total_price}, Date: ${d.created_at}`);
    });

    console.log('\nStatus de todos os Hotel:');
    hotel.forEach(d => {
      console.log(`- Pet: ${d.pet_name}, Status: "${d.status}", Price: ${d.total_services_price}, Date: ${d.check_in_date}`);
    });

  } catch (error) {
    console.error('Erro na execução:', error);
  }
}

check();
