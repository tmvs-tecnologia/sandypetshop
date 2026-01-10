const { chromium } = require('playwright');
const fs = require('fs');

async function capture(page, name) {
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `testsprite_output/screenshots/${name}`, fullPage: true });
  console.log('Saved', name);
}

async function clickText(page, text) {
  try { await page.getByText(text, { exact: false }).first().click(); } catch {}
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  fs.mkdirSync('testsprite_output/screenshots', { recursive: true });

  await page.goto('http://localhost:5000/');
  await capture(page, 'scheduler_home.png');

  await clickText(page, 'Agendar Visita');
  await capture(page, 'visita_selector.png');
  await clickText(page, 'Creche Pet');
  await capture(page, 'visita_form_creche.png');
  try { await page.goBack(); } catch {}
  await clickText(page, 'Hotel Pet');
  await capture(page, 'visita_form_hotel.png');

  await clickText(page, 'Admin');
  await capture(page, 'admin_login.png');
  try {
    await page.fill('input[type="email"]', 'login@sandypetshop.com');
    await page.fill('input[type="password"]', '1234');
    await page.getByRole('button', { name: /Entrar|Login/i }).click();
  } catch {}

  await capture(page, 'admin_banho_diario.png');
  await clickText(page, 'Ver Todos');
  await capture(page, 'admin_banho_todos.png');

  await clickText(page, 'Pet Móvel');
  await capture(page, 'pet_movel_list.png');
  await clickText(page, 'Ver Calendário');
  await capture(page, 'pet_movel_calendar.png');

  await clickText(page, 'Creche');
  await capture(page, 'creche.png');

  await clickText(page, 'Hotel Pet');
  await capture(page, 'hotel.png');

  await clickText(page, 'Clientes');
  await capture(page, 'clientes.png');

  await clickText(page, 'Mensalistas');
  await capture(page, 'mensalistas.png');

  try { await page.getByRole('button', { name: /Adicionar Mensalista/i }).click(); } catch {}
  await capture(page, 'add_mensalista.png');

  // Best-effort modais
  try { await page.getByRole('button', { name: /Serviços Extras|Extras/i }).click(); await capture(page, 'extras_modal.png'); } catch {}
  try { await page.getByRole('button', { name: /Adicionar Agendamento|Novo Agendamento/i }).click(); await capture(page, 'add_appointment.png'); } catch {}
  try { await page.getByRole('button', { name: /Editar|Edit/i }).click(); await capture(page, 'edit_appointment.png'); } catch {}
  try { await page.getByRole('button', { name: /Notificações|Notifications|Sino/i }).click(); await capture(page, 'notifications.png'); } catch {}

  await browser.close();
}

run().catch(err => { console.error(err); process.exit(1); });

