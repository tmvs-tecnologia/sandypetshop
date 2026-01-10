-- Enforce valid operational hours for in-store appointments (America/Sao_Paulo)
-- This CHECK constraint prevents inserts/updates outside allowed hours and non-zero minutes.
-- Note: added as NOT VALID to avoid blocking existing legacy rows; it still applies to new rows.

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_valid_hours_ck
CHECK (
  extract(minute from appointment_time AT TIME ZONE 'America/Sao_Paulo') = 0 AND
  (
    CASE
      WHEN service IN ('Hotel Pet','Creche Pet')
        THEN extract(hour from appointment_time AT TIME ZONE 'America/Sao_Paulo') IN (9,10,11,12,14,15,16)
      ELSE
        extract(hour from appointment_time AT TIME ZONE 'America/Sao_Paulo') IN (9,10,11,12,14,15,16,17)
    END
  )
) NOT VALID;

-- Optional: once legacy rows are fixed, validate the constraint
-- ALTER TABLE public.appointments VALIDATE CONSTRAINT appointments_valid_hours_ck;