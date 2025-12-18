import { useAnalyses } from "@/hooks/use-analyses";
import { Link } from "wouter";
import { Plus, BarChart2, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AnalysisListPage() {
  const { data: analyses, isLoading } = useAnalyses();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analysis Reports</h1>
          <p className="text-muted-foreground mt-2">View status and results of your computational jobs.</p>
        </div>
        <Link href="/analyses/new">
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5 mr-2" />
            New Analysis
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
             <div key={i} className="h-24 bg-muted/50 rounded-2xl animate-pulse" />
          ))
        ) : analyses?.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
            <BarChart2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold">No Analyses Yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">Run your first sequence analysis to see results here.</p>
            <Link href="/analyses/new">
              <Button>Get Started</Button>
            </Link>
          </div>
        ) : (
          analyses?.map(analysis => (
            <Link key={analysis.id} href={`/analyses/${analysis.id}`}>
              <div className="group glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-xl",
                    analysis.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                    analysis.status === 'running' ? "bg-blue-500/10 text-blue-500" :
                    analysis.status === 'failed' ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-500"
                  )}>
                    {analysis.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                     analysis.status === 'running' ? <ActivityIcon className="w-6 h-6 animate-pulse" /> :
                     analysis.status === 'failed' ? <XCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{analysis.type.replace('_', ' ').toUpperCase()}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>ID: #{analysis.id}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{new Date(analysis.createdAt!).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                   <Badge variant={
                     analysis.status === 'completed' ? "default" :
                     analysis.status === 'running' ? "secondary" : "destructive"
                   } className="capitalize px-3 py-1">
                     {analysis.status}
                   </Badge>
                   <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
