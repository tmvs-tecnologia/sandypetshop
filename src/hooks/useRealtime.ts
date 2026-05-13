import { useEffect } from 'react';
import { supabase } from '../../supabaseClient';

/**
 * Hook that subscribes to Supabase Realtime changes for the given tables.
 * When any INSERT, UPDATE, or DELETE occurs on those tables, the provided
 * `onChange` callback is invoked – typically a data‑fetch function.
 *
 * @param tables   List of table names (e.g. ['adoption_pets']).
 * @param onChange Function to re‑fetch data when a change happens.
 * @param opts     Optional configuration: schema (default 'public') and a list of event types.
 */
export function useRealtime(
  tables: string[],
  onChange: () => void,
  opts?: { schema?: string; events?: ('INSERT' | 'UPDATE' | 'DELETE')[] }
) {
  const { schema = 'public', events = ['INSERT', 'UPDATE', 'DELETE'] } = opts || {};

  useEffect(() => {
    // Guard against empty table list
    if (!tables.length) return;

    // Create a single channel for this group of tables.
    const channel = supabase.channel(`realtime-${tables.join('-')}`);

    tables.forEach(table => {
      channel
        .on(
          'postgres_changes',
          { event: '*', schema, table },
          payload => {
            // payload.eventType is one of INSERT, UPDATE, DELETE
            if (events.includes(payload.eventType as any)) {
              onChange();
            }
          }
        )
        .subscribe();
    });

    // Cleanup – unsubscribe when component unmounts or dependencies change.
    return () => {
      supabase.removeChannel(channel);
    };
    // We only want to re‑subscribe when the list of tables or the callback changes.
  }, [tables.join(','), onChange, schema, events.join(',')]);
}
