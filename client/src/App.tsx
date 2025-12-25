import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import SearchPage from "@/pages/search";
import UploadPage from "@/pages/upload";
import BrowsePage from "@/pages/browse";
import AnalysisListPage from "@/pages/analysis-list";
import NewAnalysisPage from "@/pages/analysis-new";
import AnalysisDetailPage from "@/pages/analysis-detail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/search" component={SearchPage} />
        <Route path="/upload" component={UploadPage} />
        <Route path="/browse" component={BrowsePage} />
        <Route path="/analyses" component={AnalysisListPage} />
        <Route path="/analyses/new" component={NewAnalysisPage} />
        <Route path="/analyses/:id" component={AnalysisDetailPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
