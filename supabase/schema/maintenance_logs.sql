
-- Create maintenance_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    action_type text NOT NULL,
    status text NOT NULL,
    details jsonb,
    CONSTRAINT maintenance_logs_pkey PRIMARY KEY (id)
);

-- Policy to allow authenticated users to insert/read logs (simplified for this context)
-- In a real prod env, this should be restricted to admins
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read/write for authenticated" ON public.maintenance_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
