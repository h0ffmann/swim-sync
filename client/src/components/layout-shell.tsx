import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Activity, 
  BarChart3, 
  BrainCircuit, 
  Settings, 
  Menu, 
  X,
  LogOut,
  Waves
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAVIGATION = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Activities", href: "/activities", icon: Activity },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "AI Coach", href: "/coach", icon: BrainCircuit },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <Waves className="w-8 h-8 text-primary" />
          <span className="font-display font-bold text-xl tracking-tight">SwimSync</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full p-6">
          <div className="hidden md:flex items-center gap-3 mb-10 px-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Waves className="w-6 h-6 text-primary" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">SwimSync</span>
          </div>

          <div className="mb-8 px-2">
             <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
               <Avatar className="w-10 h-10 border border-border">
                 <AvatarImage src={user?.profileImageUrl} />
                 <AvatarFallback className="bg-primary/10 text-primary font-bold">
                   {user?.firstName?.charAt(0) || "U"}
                 </AvatarFallback>
               </Avatar>
               <div className="overflow-hidden">
                 <p className="font-medium text-sm truncate">{user?.firstName || "Swimmer"}</p>
                 <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
               </div>
             </div>
          </div>

          <nav className="space-y-1 flex-1">
            {NAVIGATION.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.name} href={item.href} className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm group
                  ${isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary transition-colors"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-border">
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background/50 relative">
        {/* Backdrop blur for modern feel */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10 dark:bg-grid-slate-900/10 pointer-events-none" />
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
          {children}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
