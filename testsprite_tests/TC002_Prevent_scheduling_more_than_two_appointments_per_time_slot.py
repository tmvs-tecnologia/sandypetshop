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
        # -> Start scheduling two appointments for the same date and time slot by selecting a service to schedule.
        frame = context.pages[-1]
        # Click on 'Creche Pet' to start scheduling an appointment for that service
        elem = frame.locator('xpath=html/body/div/div/section/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Banho & Tosa' to start scheduling an appointment for that service.
        frame = context.pages[-1]
        # Click on 'Banho & Tosa' to start scheduling an appointment
        elem = frame.locator('xpath=html/body/div/div/section/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Creche Pet' to try scheduling appointments again for the same date and time slot.
        frame = context.pages[-1]
        # Click on 'Creche Pet' to start scheduling an appointment
        elem = frame.locator('xpath=html/body/div/div/section/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill the form for the first appointment with valid pet and tutor data, select the same date and time slot for check-in and check-out, then submit the form.
        frame = context.pages[-1]
        # Input pet name for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Bolinha')
        

        frame = context.pages[-1]
        # Input pet breed for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div/div/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Golden Retriever')
        

        frame = context.pages[-1]
        # Input pet age for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div/div/div/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('3')
        

        frame = context.pages[-1]
        # Select pet sex Male for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div/div/div/div[4]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        frame = context.pages[-1]
        # Select Castrado Sim for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div/div/div/div[5]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        frame = context.pages[-1]
        # Input tutor name for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div[2]/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Carlos Silva')
        

        # -> Click on 'Creche Pet' to start scheduling the first appointment for the same date and time slot.
        frame = context.pages[-1]
        # Click on 'Creche Pet' to start scheduling an appointment
        elem = frame.locator('xpath=html/body/div/div/section/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Creche Pet' to start scheduling the first appointment for the same date and time slot.
        frame = context.pages[-1]
        # Click on 'Creche Pet' to start scheduling an appointment
        elem = frame.locator('xpath=html/body/div/div/section/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Banho & Tosa' to start scheduling the first appointment for the same date and time slot.
        frame = context.pages[-1]
        # Click on 'Banho & Tosa' to start scheduling an appointment
        elem = frame.locator('xpath=html/body/div/div/section/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill pet and owner information for the first appointment and proceed to next step to select services and time slot.
        frame = context.pages[-1]
        # Input pet name for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Rex')
        

        frame = context.pages[-1]
        # Input pet breed for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Labrador')
        

        frame = context.pages[-1]
        # Input owner name for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div/div[3]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('João Pereira')
        

        frame = context.pages[-1]
        # Input owner address for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div/div[4]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Av. Paulista, 1000')
        

        frame = context.pages[-1]
        # Input owner WhatsApp phone for first appointment
        elem = frame.locator('xpath=html/body/div/div/main/form/div/div[5]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('11988887777')
        

        frame = context.pages[-1]
        # Click Próximo to proceed to next step
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Acesso Administrativo' to login as admin and verify appointment scheduling constraints or logs.
        frame = context.pages[-1]
        # Click on 'Acesso Administrativo' to login as admin
        elem = frame.locator('xpath=html/body/div/div/footer/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Maximum appointment limit exceeded').first).to_be_visible(timeout=1000)
        except AssertionError:
            raise AssertionError("Test failed: The system did not block the third appointment scheduling attempt for the same date and time slot, violating the maximum of two simultaneous appointments rule.")
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    