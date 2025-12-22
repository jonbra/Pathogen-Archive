import { Link, useLocation } from "wouter";
import { Dna, Database, UploadCloud, BarChart2, Menu, X, Activity } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/upload", label: "Upload Data", icon: UploadCloud },
  { href: "/browse", label: "Browse Database", icon: Database },
  { href: "/analyses", label: "Analyses", icon: BarChart2 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-2xl transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:shadow-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Dna className="w-8 h-8" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">HAV DB</h1>
                <p className="text-xs text-muted-foreground font-medium">Hepatitis A Virus genome sequences</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-semibold" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform group-hover:scale-110",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                    )} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-lg">
            <h4 className="font-bold text-sm mb-1">Status: Online</h4>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected to Server
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-border bg-card flex items-center justify-between px-4 z-30 sticky top-0">
          <div className="flex items-center gap-2">
            <Dna className="w-6 h-6 text-primary" />
            <span className="font-bold">ViroBase</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-foreground">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
