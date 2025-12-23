import { useActivities } from "@/hooks/use-activities";
import { usePersonalRecords } from "@/hooks/use-personal-records";
import { ActivityCard } from "@/components/activity-card";
import { AddActivityDialog } from "@/components/add-activity-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Waves, TrendingUp, Trophy } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: activities, isLoading: isLoadingActivities } = useActivities();
  const { data: records, isLoading: isLoadingRecords } = usePersonalRecords();

  // Compute summary stats
  const totalSwims = activities?.length || 0;
  const totalDistance = activities?.reduce((acc, act) => acc + act.distance, 0) || 0;
  
  // Get recent activities (last 3)
  const recentActivities = activities?.slice(0, 3) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to the water.</p>
        </div>
        <AddActivityDialog />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex items-center gap-3 mb-2 opacity-90">
            <Waves className="w-5 h-5" />
            <span className="font-medium">Total Distance</span>
          </div>
          <p className="text-4xl font-display font-bold">{(totalDistance / 1000).toFixed(1)} <span className="text-lg opacity-80 font-sans font-normal">km</span></p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">Total Swims</span>
          </div>
          <p className="text-4xl font-display font-bold text-foreground">{totalSwims}</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Trophy className="w-5 h-5" />
            <span className="font-medium">Personal Records</span>
          </div>
          <p className="text-4xl font-display font-bold text-foreground">
            {isLoadingRecords ? "-" : records?.length || 0}
          </p>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Recent Swims</h2>
          <Link href="/activities">
            <Button variant="link" className="text-primary font-semibold">View All</Button>
          </Link>
        </div>

        {isLoadingActivities ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : recentActivities.length > 0 ? (
          <div className="grid gap-4">
            {recentActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
            <Waves className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <h3 className="font-semibold text-lg text-muted-foreground">No swims recorded yet</h3>
            <p className="text-sm text-muted-foreground/80 mb-4">Log your first activity to get started!</p>
            <AddActivityDialog />
          </div>
        )}
      </div>
    </div>
  );
}
