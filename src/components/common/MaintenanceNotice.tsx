import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api-client";

export function MaintenanceNotice() {
  const { data: settings } = useQuery<{ maintenance_mode?: boolean }>({
    queryKey: ["settings", "public"],
    queryFn: () => api.get("/settings/public"),
    staleTime: 30 * 1000,
  });

  if (!settings?.maintenance_mode) return null;

  return (
    <aside aria-label="Maintenance Notice" className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 font-bold px-4 py-2 text-center text-xs flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
      <AlertTriangle className="size-4 shrink-0 text-stone-950" />
      <span>
        Platform Maintenance Mode: Scheduled upgrades are in progress. Some member actions and payments may be temporarily restricted.
      </span>
    </aside>
  );
}
