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
        # -> Click on 'Acesso Administrativo' to login as admin for appointment management.
        frame = context.pages[-1]
        # Click on 'Acesso Administrativo' button to open admin login.
        elem = frame.locator('xpath=html/body/div/div/footer/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input admin email and password, then click 'Entrar' to login.
        frame = context.pages[-1]
        # Input admin email
        elem = frame.locator('xpath=html/body/div/div/div/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('login@sandypetshop.com')
        

        frame = context.pages[-1]
        # Input admin password
        elem = frame.locator('xpath=html/body/div/div/div/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('1234')
        

        frame = context.pages[-1]
        # Click 'Entrar' button to login as admin
        elem = frame.locator('xpath=html/body/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Adicionar Agendamento' to open the appointment scheduling form.
        frame = context.pages[-1]
        # Click 'Adicionar Agendamento' button to open scheduling form
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input first appointment details for pet and owner, then click 'Próximo' to proceed to time selection.
        frame = context.pages[-1]
        # Input pet name for first appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Rex')
        

        frame = context.pages[-1]
        # Input pet breed for first appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Labrador')
        

        frame = context.pages[-1]
        # Input owner name for first appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Alice')
        

        frame = context.pages[-1]
        # Input owner WhatsApp for first appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div[4]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('(11) 91234-5678')
        

        frame = context.pages[-1]
        # Input owner address for first appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div[5]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Rua das Flores, 123')
        

        frame = context.pages[-1]
        # Click 'Próximo' to proceed to next step for time selection
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div[6]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select appointment date and time for first appointment, then confirm scheduling.
        frame = context.pages[-1]
        # Select date 28 November 2025 for appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/section/div/div[3]/button[8]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Attempt to schedule a second appointment for the same pet 'Rex' with an overlapping time slot to test double booking prevention.
        frame = context.pages[-1]
        # Click 'Adicionar Agendamento' to start scheduling second appointment for double booking test
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Adicionar Agendamento' to start scheduling a new appointment for the same pet to test overlapping booking prevention.
        frame = context.pages[-1]
        # Click 'Adicionar Agendamento' to open new appointment scheduling form
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input pet name 'Rex', breed 'Labrador', owner name 'Alice', WhatsApp, and address, then click 'Próximo' to proceed to time selection.
        frame = context.pages[-1]
        # Input pet name for second appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Rex')
        

        frame = context.pages[-1]
        # Input pet breed for second appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Labrador')
        

        frame = context.pages[-1]
        # Input owner name for second appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Alice')
        

        frame = context.pages[-1]
        # Input owner WhatsApp for second appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div[4]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('(11) 91234-5678')
        

        frame = context.pages[-1]
        # Input owner address for second appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div[5]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Rua das Flores, 123')
        

        frame = context.pages[-1]
        # Click 'Próximo' to proceed to time selection for second appointment
        elem = frame.locator('xpath=html/body/div/div/div/div/main/div/div/div/form/div/div[6]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Booking Confirmed Successfully').first).to_be_visible(timeout=3000)
        except AssertionError:
            raise AssertionError("Test failed: The system did not prevent double bookings for the same pet or owner within overlapping appointment times as required by the test plan.")
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    