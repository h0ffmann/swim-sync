import { useActivities } from "@/hooks/use-activities";
import { ActivityCard } from "@/components/activity-card";
import { AddActivityDialog } from "@/components/add-activity-dialog";
import { ImportCSVDialog } from "@/components/import-csv-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

export default function ActivitiesPage() {
  const { data: activities, isLoading } = useActivities();
  const [search, setSearch] = useState("");

  const filteredActivities = activities?.filter(a => 
    a.notes?.toLowerCase().includes(search.toLowerCase()) || 
    a.stroke.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Activities</h1>
          <p className="text-muted-foreground">Your complete swimming history.</p>
        </div>
        <div className="flex gap-2">
          <ImportCSVDialog />
          <AddActivityDialog />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input 
          placeholder="Search by stroke or notes..." 
          className="pl-10 bg-card border-border/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredActivities?.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
          {filteredActivities?.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              No activities found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
