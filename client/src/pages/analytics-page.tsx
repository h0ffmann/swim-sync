import { useActivities } from "@/hooks/use-activities";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsPage() {
  const { data: activities, isLoading } = useActivities();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-48" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  // --- Process Weekly Data ---
  // Simple logic: aggregate distance by day for the last available week of data (or current week)
  const today = new Date();
  const start = startOfWeek(today);
  const end = endOfWeek(today);
  const days = eachDayOfInterval({ start, end });

  const weeklyData = days.map(day => {
    const dayStr = format(day, 'EEE'); // Mon, Tue...
    const dayTotal = activities?.filter(a => {
      const aDate = new Date(a.date);
      return format(aDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    }).reduce((sum, a) => sum + a.distance, 0) || 0;

    return { name: dayStr, distance: dayTotal };
  });

  // --- Process Stroke Distribution ---
  const strokeCounts: Record<string, number> = {};
  activities?.forEach(a => {
    strokeCounts[a.stroke] = (strokeCounts[a.stroke] || 0) + a.distance;
  });

  const strokeData = Object.entries(strokeCounts).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value
  }));

  const COLORS = ['#0ea5e9', '#0f766e', '#6366f1', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Deep dive into your performance metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Volume Chart */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-6">Weekly Distance (meters)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    borderRadius: '8px', 
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                  }}
                />
                <Bar 
                  dataKey="distance" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stroke Distribution */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-6">Distance by Stroke</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {strokeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={strokeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {strokeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      borderRadius: '8px', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No data available yet</p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {strokeData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
