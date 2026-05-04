import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Columns, LogOut, Menu, X, ChevronRight, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Pipeline", url: "/pipeline", icon: Columns },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage = navItems.find(item => item.url === location)?.title || "Dashboard";

  return (
    <div className="crm-bg min-h-screen relative">
      <div className="relative z-10 flex h-screen overflow-hidden w-full">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed md:static inset-y-0 left-0 z-40
          w-[280px] md:w-64
          glass-sidebar flex flex-col
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-5 flex items-center justify-between">
            <span className="font-bold text-xl text-primary tracking-tight">TradeStack CRM</span>
            <button
              className="md:hidden p-1 rounded-lg hover:bg-black/5 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {user && (
            <div className="px-5 pb-4 text-xs text-muted-foreground truncate">
              {user.businessName}
            </div>
          )}

          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.url;
              return (
                <Link
                  key={item.title}
                  href={item.url}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isActive
                      ? 'glass text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/10'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto opacity-50" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 mt-auto space-y-1">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/10 transition-all duration-200 w-full"
            >
              {theme === "light" ? <Moon className="h-5 w-5 shrink-0" /> : <Sun className="h-5 w-5 shrink-0" />}
              <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/10 transition-all duration-200 w-full"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 flex items-center px-4 md:px-6 glass-subtle shrink-0 gap-3 z-10">
            <button
              className="md:hidden p-2 -ml-1 rounded-xl hover:bg-white/30 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="font-semibold text-base">{currentPage}</div>
            {user && (
              <div className="ml-auto text-xs text-muted-foreground bg-white/30 dark:bg-white/10 px-3 py-1.5 rounded-full">
                {user.email}
              </div>
            )}
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
