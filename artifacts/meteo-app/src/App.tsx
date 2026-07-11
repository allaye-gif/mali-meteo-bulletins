import React from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { NouveauBulletin } from '@/pages/bulletins/NouveauBulletin';
import { EditBulletin } from '@/pages/bulletins/EditBulletin';
import { PreviewBulletin } from '@/pages/bulletins/PreviewBulletin';
import { Historique } from '@/pages/Historique';
import NotFound from '@/pages/not-found';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path="/historique">
        <AppLayout>
          <Historique />
        </AppLayout>
      </Route>
      <Route path="/bulletins/nouveau">
        <AppLayout>
          <NouveauBulletin />
        </AppLayout>
      </Route>
      <Route path="/bulletins/:id/edit">
        <AppLayout>
          <EditBulletin />
        </AppLayout>
      </Route>
      <Route path="/bulletins/:id/preview">
        <PreviewBulletin />
      </Route>
      <Route>
        <AppLayout>
          <NotFound />
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
