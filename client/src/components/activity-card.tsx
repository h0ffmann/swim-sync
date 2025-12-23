import { Calendar, Clock, MapPin, Waves, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import type { Activity } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface ActivityCardProps {
  activity: Activity;
  onClick?: () => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  // Helpers to format display data
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatPace = (pace: number | null) => {
    if (!pace) return "--";
    const mins = Math.floor(pace / 60);
    const secs = Math.round(pace % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/100m`;
  };

  return (
    <div className="bg-card hover:bg-card/80 border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pl-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
            {activity.type === 'pool' ? <Waves className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-none mb-1 capitalize">
              {activity.stroke.replace('_', ' ')} Swim
            </h3>
            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(activity.date), "MMM d, yyyy • h:mm a")}
            </div>
          </div>
        </div>
        
        {onClick && (
          <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={onClick}>
            Details <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 pl-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Distance</p>
          <p className="text-xl font-bold font-display">{activity.distance}m</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Time</p>
          <p className="text-xl font-bold font-display">{formatDuration(activity.duration)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pace</p>
          <p className="text-xl font-bold font-display">{formatPace(activity.pace)}</p>
        </div>
      </div>
      
      {/* Mobile-only tap target overlay */}
      {onClick && (
        <button className="absolute inset-0 w-full h-full sm:hidden" onClick={onClick} aria-label="View activity details" />
      )}
    </div>
  );
}
