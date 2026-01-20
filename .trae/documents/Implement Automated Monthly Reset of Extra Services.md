I will implement a robust automated system to reset extra services for monthly clients and hotel/daycare records on the 1st of every month, starting Feb 1, 2026.

1. **Create a New Database Function (SQL)**:

   * I'll write a PL/PGSQL function `reset_monthly_extras` that:

     * Updates `monthly_clients`, `daycare_enrollments`, and `hotel_registrations`.

     * Sets `extra_services` to `null` or empty JSON.

     * Recalculates the `price` (or `total_price`) by subtracting the value of removed extras.

     * Logs the operation into a new `system_logs` table (or similar) for audit.

     * This ensures data integrity and atomic updates within the database transaction.

2. **Create a Scheduled Trigger (Supabase/pg\_cron)**:

   * Since I cannot configure `pg_cron` directly from here without SQL access to the `cron` schema (usually), I will implement a robust **client-side check** in `App.tsx` (or a dedicated `MonthlyResetManager` component) that runs on app load.

   * **Logic**:

     * Check a `system_settings` or `maintenance_logs` table for the last run date of "monthly\_reset".

     * If today is the 1st of the month (or later) and the last run was in a previous month:

       * Trigger the reset function via Supabase RPC or a sequence of updates.

       * Log the successful run.

       * This simulates a cron job effectively for a client-side app, ensuring it runs at least once when the admin logs in.

3. **Frontend Implementation**:

   * Create `src/components/MonthlyResetManager.tsx`.

   * It will perform the check on mount.

   * It will handle the "adjust total value" logic by fetching current prices, subtracting extras, and updating the record.

   * It will log actions to a new `maintenance_logs` table in Supabase.

4. **Data Integrity & Error Handling**:

   * The update logic will be wrapped in a `try/catch` block.

   * If an update fails, it logs the error and retries or alerts the admin.

   * It will specifically target `extra_services` column.

5. **Testing**:

   * I will add a "Test Reset" button (hidden or dev-only) to force-trigger the logic for validation.

   * I'll verify that base cards remain and only extras are stripped.

*Self-correction*: Since I cannot create new SQL functions easily without direct SQL console access (RPC might be restricted), I will implement the logic in Typescript within the `MonthlyResetManager` component, processing records in batches. This is safer and easier to debug in this environment.

**Plan**:

1. Create `maintenance_logs` table via SQL (using `App.tsx` or a script to run it once if needed, or just assume I can create it). *Actually, I'll check if I can use an existing table or just* *`notifications`* *for logs to keep it simple, but a dedicated table is better.* I'll try to create it using a setup script.
2. Implement `MonthlyResetManager.tsx`.
3. Integrate it into `App.tsx`.
4. Add logic to `monthly_clients`, `daycare`, and `hotel` to strip `extra_services` and update price.
5. Verify logic.

