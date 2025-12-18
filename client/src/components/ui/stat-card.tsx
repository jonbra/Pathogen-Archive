import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 group-hover:scale-125 duration-500">
        {icon}
      </div>
      
      <div className="relative z-10">
        <div className="p-3 bg-primary/10 w-fit rounded-xl text-primary mb-4">
          {icon}
        </div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-foreground font-mono">{value}</span>
        </div>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
