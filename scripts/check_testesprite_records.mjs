import { createClient } from '@supabase/supabase-js'

// Supabase credentials from supabaseClient.ts
const supabaseUrl = 'https://phfzqvmofnqwxszdgjch.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZnpxdm1vZm5xd3hzemRnamNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE1MzIsImV4cCI6MjA3NzI1NzUzMn0.bWL2t6XGQJ5OmNxAB8mLjAzY5uF1fVzheMNksVJ2Dkk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchTable(table, filters) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .or(filters)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error(`[ERROR] ${table}:`, error.message)
    return []
  }
  return data || []
}

async function dedupeSansBanhoETosa() {
  console.log('\n[Dedup] Procurando duplicados para pet "Sans" em Banho & Tosa...')
  const { data: rows, error } = await supabase
    .from('appointments')
    .select('id, appointment_time, pet_name, owner_name, service, created_at')
    .ilike('pet_name', '%Sans%')
    .order('appointment_time', { ascending: true })

  if (error) {
    console.error('[Dedup][ERROR] Falha ao buscar agendamentos:', error.message)
    return { deleted: [], groups: [] }
  }

  const groups = new Map()
  for (const r of rows || []) {
    const ts = new Date(r.appointment_time)
    // chave por dia e hora (precisão minutos)
    const key = `${ts.getUTCFullYear()}-${String(ts.getUTCMonth()+1).padStart(2,'0')}-${String(ts.getUTCDate()).padStart(2,'0')} ${String(ts.getUTCHours()).padStart(2,'0')}:${String(ts.getUTCMinutes()).padStart(2,'0')}`
    const g = groups.get(key) || []
    g.push(r)
    groups.set(key, g)
  }

  const toDelete = []
  const duplicateSummary = []
  for (const [key, list] of groups.entries()) {
    if (list.length > 1) {
      // mantém o primeiro por created_at (mais antigo) e exclui os demais
      list.sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
      const keep = list[0]
      const remove = list.slice(1)
      toDelete.push(...remove.map(r => r.id))
      duplicateSummary.push({ key, keep: keep.id, remove: remove.map(r => r.id) })
    }
  }

  if (toDelete.length === 0) {
    console.log('[Dedup] Nenhum duplicado encontrado para "Sans".')
    return { deleted: [], groups: duplicateSummary }
  }

  console.log(`[Dedup] Excluindo ${toDelete.length} registros duplicados...`)
  const { data: deleted, error: delError } = await supabase
    .from('appointments')
    .delete()
    .in('id', toDelete)
    .select('id, appointment_time, pet_name, owner_name, service')

  if (delError) {
    console.error('[Dedup][ERROR] Falha ao excluir duplicados:', delError.message)
    return { deleted: [], groups: duplicateSummary }
  }

  console.log('[Dedup] Removidos:')
  for (const d of deleted || []) {
    console.log(`- id=${d.id} | pet=${d.pet_name} | dono=${d.owner_name} | servico=${d.service} | horario=${d.appointment_time}`)
  }

  return { deleted, groups: duplicateSummary }
}

async function dedupeSansMonthlyClients() {
  console.log('\n[Dedup] Procurando duplicados de Mensalistas para pet "Sans" (Banho & Tosa)...')
  const { data: rows, error } = await supabase
    .from('monthly_clients')
    .select('id, pet_name, owner_name, service, recurrence_day, recurrence_time, created_at')
    .ilike('pet_name', '%Sans%')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Dedup][ERROR] Falha ao buscar mensalistas:', error.message)
    return { deleted: [], groups: [] }
  }

  const groups = new Map()
  for (const r of rows || []) {
    const key = `${r.pet_name.toLowerCase()}|${String(r.recurrence_day)}|${String(r.recurrence_time)}|${(r.service||'').toLowerCase()}`
    const g = groups.get(key) || []
    g.push(r)
    groups.set(key, g)
  }

  const toDelete = []
  const duplicateSummary = []
  for (const [key, list] of groups.entries()) {
    if (list.length > 1) {
      list.sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
      const keep = list[0]
      const remove = list.slice(1)
      toDelete.push(...remove.map(r => r.id))
      duplicateSummary.push({ key, keep: keep.id, remove: remove.map(r => r.id) })
    }
  }

  if (toDelete.length === 0) {
    console.log('[Dedup] Nenhum duplicado encontrado para mensalistas de "Sans".')
    return { deleted: [], groups: duplicateSummary }
  }

  console.log(`[Dedup] Excluindo ${toDelete.length} registros duplicados de mensalistas...`)
  const { data: deleted, error: delError } = await supabase
    .from('monthly_clients')
    .delete()
    .in('id', toDelete)
    .select('id, pet_name, owner_name, service, recurrence_day, recurrence_time')

  if (delError) {
    console.error('[Dedup][ERROR] Falha ao excluir duplicados de mensalistas:', delError.message)
    return { deleted: [], groups: duplicateSummary }
  }

  console.log('[Dedup] Mensalistas removidos:')
  for (const d of deleted || []) {
    console.log(`- id=${d.id} | pet=${d.pet_name} | dono=${d.owner_name} | servico=${d.service} | dia=${d.recurrence_day} | hora=${d.recurrence_time}`)
  }

  return { deleted, groups: duplicateSummary }
}

async function dedupeAllMonthlyAppointments() {
  console.log('\n[Dedup] Removendo duplicados em appointments para todos Mensalistas...')
  const { data: rows, error } = await supabase
    .from('appointments')
    .select('id, appointment_time, monthly_client_id, pet_name, owner_name, created_at')
    .not('monthly_client_id', 'is', null)
    .order('appointment_time', { ascending: true })

  if (error) {
    console.error('[Dedup][ERROR] Buscar appointments:', error.message)
    return { deleted: [] }
  }

  const groups = new Map()
  for (const r of rows || []) {
    const t = new Date(r.appointment_time)
    const key = `${r.monthly_client_id}|${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(t.getUTCDate()).padStart(2,'0')} ${String(t.getUTCHours()).padStart(2,'0')}:${String(t.getUTCMinutes()).padStart(2,'0')}`
    const g = groups.get(key) || []
    g.push(r)
    groups.set(key, g)
  }

  const toDelete = []
  for (const [, list] of groups.entries()) {
    if (list.length > 1) {
      list.sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
      const remove = list.slice(1)
      toDelete.push(...remove.map(r => r.id))
    }
  }

  if (toDelete.length === 0) {
    console.log('[Dedup] Nenhum duplicado encontrado em appointments.')
    return { deleted: [] }
  }

  console.log(`[Dedup] Excluindo ${toDelete.length} appointments duplicados...`)
  const { data: deleted, error: delError } = await supabase
    .from('appointments')
    .delete()
    .in('id', toDelete)
    .select('id, pet_name, owner_name, appointment_time')

  if (delError) {
    console.error('[Dedup][ERROR] Excluir appointments:', delError.message)
    return { deleted: [] }
  }

  console.log('[Dedup] Appointments removidos:')
  for (const d of deleted || []) {
    console.log(`- id=${d.id} | pet=${d.pet_name} | dono=${d.owner_name} | horario=${d.appointment_time}`)
  }

  return { deleted }
}
async function main() {
  console.log('Checking records for identifier "testeSprite"...')

  const appointments = await fetchTable('appointments', 'owner_name.ilike.%testeSprite%,pet_name.ilike.%testeSprite%')
  const petMovel = await fetchTable('pet_movel_appointments', 'owner_name.ilike.%testeSprite%,pet_name.ilike.%testeSprite%')
  const hotel = await fetchTable('hotel_registrations', 'tutor_name.ilike.%testeSprite%,pet_name.ilike.%testeSprite%')
  const daycare = await fetchTable('daycare_enrollments', 'tutor_name.ilike.%testeSprite%,pet_name.ilike.%testeSprite%')

  const summarize = (rows, fields) => rows.map(r => fields.map(f => `${f}: ${r[f]}`).join(' | '))

  console.log('\nAppointments (appointments):')
  console.log(appointments.length ? summarize(appointments, ['id', 'owner_name', 'pet_name', 'service', 'status']).join('\n') : 'No records found')

  console.log('\nPet Móvel (pet_movel_appointments):')
  console.log(petMovel.length ? summarize(petMovel, ['id', 'owner_name', 'pet_name', 'service', 'status']).join('\n') : 'No records found')

  console.log('\nHotel Pet (hotel_registrations):')
  console.log(hotel.length ? summarize(hotel, ['id', 'tutor_name', 'pet_name', 'check_in_date', 'check_out_date']).join('\n') : 'No records found')

  console.log('\nCreche Pet (daycare_enrollments):')
  console.log(daycare.length ? summarize(daycare, ['id', 'tutor_name', 'pet_name', 'contracted_plan', 'status']).join('\n') : 'No records found')

  await dedupeSansBanhoETosa()
  await dedupeSansMonthlyClients()
  await dedupeAllMonthlyAppointments()
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
