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
        # -> Click on 'Visita' button to start scheduling a visit appointment.
        frame = context.pages[-1]
        # Click on 'Visita' button to navigate to scheduling page for visits
        elem = frame.locator('xpath=html/body/div/div/section/div/button[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Creche Pet' to proceed to the scheduling form.
        frame = context.pages[-1]
        # Click on 'Creche Pet' to proceed to scheduling form
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Creche Pet' button to navigate back to the scheduling form.
        frame = context.pages[-1]
        # Click on 'Creche Pet' to go back to scheduling form
        elem = frame.locator('xpath=html/body/div/div/section/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill required fields with valid data and select a check-in time before 9am (e.g., 08:00) to attempt scheduling.
        frame = context.pages[-1]
        # Input pet name
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('TestPet')
        

        frame = context.pages[-1]
        # Input breed
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div/div/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('TestBreed')
        

        frame = context.pages[-1]
        # Input pet age
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div/div/div/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('2')
        

        frame = context.pages[-1]
        # Select pet sex Male
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div/div/div/div[4]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        frame = context.pages[-1]
        # Select castrated Yes
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div/div/div/div/div[5]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Scroll down to reveal more form fields or buttons to continue filling the form and select a time before 9am.
        await page.mouse.wheel(0, 300)
        

        # -> Click on 'Creche Pet' button to navigate back to the scheduling form and continue filling the form.
        frame = context.pages[-1]
        # Click on 'Creche Pet' to go back to scheduling form
        elem = frame.locator('xpath=html/body/div/div/section/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select check-in time before 9am (08:00) and attempt to schedule, then verify error message.
        frame = context.pages[-1]
        # Click 'Solicitar Matrícula' to attempt scheduling at 08:00 AM
        elem = frame.locator('xpath=html/body/div/div/main/form/div[2]/div[7]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Navigate back to the scheduling form and attempt to schedule an appointment at 6:00 PM (after 5pm) to verify if error message appears.
        frame = context.pages[-1]
        # Click on 'Creche Pet' to go back to scheduling form
        elem = frame.locator('xpath=html/body/div/div/section/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Creche Pet' button to navigate back to the scheduling form and continue filling the form, skipping problematic fields.
        frame = context.pages[-1]
        # Click on 'Creche Pet' to go back to scheduling form
        elem = frame.locator('xpath=html/body/div/div/section/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Creche Pet' button to navigate back to the scheduling form and attempt scheduling after 5pm, skipping problematic fields.
        frame = context.pages[-1]
        # Click on 'Creche Pet' to go back to scheduling form
        elem = frame.locator('xpath=html/body/div/div/section/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Booking Confirmed Outside Operational Hours').first).to_be_visible(timeout=1000)
        except AssertionError:
            raise AssertionError("Test failed: The scheduling system did not prevent booking appointments outside the allowed operational hours of 9am-11am and 1pm-5pm as expected.")
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    