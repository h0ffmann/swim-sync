import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function usePersonalRecords() {
  return useQuery({
    queryKey: [api.personalRecords.list.path],
    queryFn: async () => {
      const res = await fetch(api.personalRecords.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch personal records");
      return api.personalRecords.list.responses[200].parse(await res.json());
    },
  });
}
