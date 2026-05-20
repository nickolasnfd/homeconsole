import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type TableName = "inventory" | "maintenance";

export function useTable<T = any>(table: TableName, orderBy?: { column: string; ascending?: boolean }) {
  return useQuery({
    queryKey: [table, orderBy],
    queryFn: async () => {
      let q = supabase.from(table).select("*");
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}