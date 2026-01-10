import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Click on 'Acesso Administrativo' to open admin login
        frame = context.pages[-1]
        # Click on 'Acesso Administrativo' button to open admin login
        elem = frame.locator('xpath=html/body/div/div/footer/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input admin email and password, then click Entrar to log in
        frame = context.pages[-1]
        # Input admin email
        elem = frame.locator('xpath=html/body/div/div/div/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('login@sandypetshop.com')
        

        frame = context.pages[-1]
        # Input admin password
        elem = frame.locator('xpath=html/body/div/div/div/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('1234')
        

        frame = context.pages[-1]
        # Click Entrar button to submit login form
        elem = frame.locator('xpath=html/body/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Clientes' button to access client management panel and verify active and recurring clients
        frame = context.pages[-1]
        # Click on 'Clientes' button to open client management panel
        elem = frame.locator('xpath=html/body/div/div/div/div/aside/nav/button[5]/img').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Navigate to the reporting/statistics section to generate a monthly scheduling and revenue report for verification
        frame = context.pages[-1]
        # Click on 'Estatísticas' button to open reporting/statistics section
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div[2]/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Capture full-page screenshot of the admin dashboard overview page as per testing instructions
        await page.mouse.wheel(0, await page.evaluate('() => window.innerHeight'))
        

        # -> Capture full-page screenshot of the admin dashboard overview page as per testing instructions
        frame = context.pages[-1]
        # Click on 'Banho & Tosa' tab to ensure dashboard overview is fully loaded
        elem = frame.locator('xpath=html/body/div/div/div/div/aside/nav/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        await page.mouse.wheel(0, await page.evaluate('() => window.innerHeight'))
        

        # -> Capture full-page screenshot of the client management panel as per testing instructions
        frame = context.pages[-1]
        # Click on 'Clientes' button to open client management panel for screenshot capture
        elem = frame.locator('xpath=html/body/div/div/div/div/aside/nav/button[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Capture full-page screenshot of the reporting/statistics page as per testing instructions
        frame = context.pages[-1]
        # Click on 'Estatísticas' button to open reporting/statistics page for screenshot capture
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div[3]/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Close the 'Editar Cliente' modal and navigate to the reporting/statistics page to capture screenshots and verify report data
        frame = context.pages[-1]
        # Click 'Cancelar' button to close 'Editar Cliente' modal
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Estatísticas' button to open reporting/statistics page for screenshot capture
        frame = context.pages[-1]
        # Click on 'Mensalistas' button to open reporting/statistics page for screenshot capture
        elem = frame.locator('xpath=html/body/div/div/div/div/aside/nav/button[6]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Estatísticas' button (index 18) to open reporting/statistics page for screenshot capture and verification
        frame = context.pages[-1]
        # Click on 'Estatísticas' button to open reporting/statistics page for screenshot capture
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div[2]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Sandy\'s Pet Shop').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Painel Administrativo').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Banho & Tosa').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Pet Móvel').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Creche').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Hotel Pet').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Clientes').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Mensalistas').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📊 Estatísticas de Serviços').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Selecione o dia').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📅 Hoje (28/11/2025)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Total de Serviços').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=0').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Receita Total').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=R$ 0,00').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📊 Esta Semana').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=21').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=R$ 1355,00').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Serviços Realizados:').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Banho & Tosa (Pet Móvel)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=2').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Banho (Pet Móvel)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=9').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=4x Banho (Pet Móvel)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=5').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Banho & Tosa').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=1').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Banho').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=4').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📈 Este Mês').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=125').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=R$ 8330,00').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Serviços Realizados:').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Banho & Tosa (Pet Móvel)').nth(1)).to_be_visible(timeout=30000)
        await expect(frame.locator('text=5').nth(1)).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Banho (Pet Móvel)').nth(1)).to_be_visible(timeout=30000)
        await expect(frame.locator('text=37').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=4x Banho (Pet Móvel)').nth(1)).to_be_visible(timeout=30000)
        await expect(frame.locator('text=15').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Banho & Tosa').nth(1)).to_be_visible(timeout=30000)
        await expect(frame.locator('text=2').nth(1)).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Banho').nth(1)).to_be_visible(timeout=30000)
        await expect(frame.locator('text=14').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=2x Banho (Pet Móvel)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=7').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=2x Banho').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=2').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Só Banho (Pet Móvel)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=28').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Só Tosa (Pet Móvel)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=3').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Só Banho').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=10').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Creche Pet').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=2').nth(1)).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Agendamentos - 28/11/2025').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=CONCLUÍDO').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Nala neri').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Eduarda').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Banho & Tosa').nth(1)).to_be_visible(timeout=30000)
        await expect(frame.locator('text=R$ 130,00').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    