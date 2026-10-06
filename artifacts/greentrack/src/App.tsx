import { type ReactNode } from 'react';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import AuthPage from '@/pages/auth';
import DashboardPage from '@/pages/dashboard';
import { TreeDetailPage, TreeFormPage, TreesPage } from '@/pages/trees';
import ResourcesPage from '@/pages/resources';
import AiPage from '@/pages/ai';
import { AlertsPage, MapPage, ProfilePage, ReportsPage, SettingsPage } from '@/pages/operations';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  const [path, navigate] = useLocation();
  const { session, loading, configured } = useAuth();
  useEffect(() => {
    if (path === '/' && !loading) navigate(session ? '/dashboard' : '/login', { replace: true });
  }, [path, session, loading]);
  if (path === '/login') return <AuthPage />;
  if (path === '/register') return <AuthPage mode="register" />;
  if (loading) return <div className="min-h-[100dvh] bg-background p-8"><div className="mx-auto mt-20 max-w-xl space-y-3">{[1,2,3].map(x=><div key={x} className="h-16 animate-pulse rounded-xl border border-border bg-card"/>)}</div></div>;
  if (!configured) return <AuthPage />;
  if (!session) return <AuthPage />;
  return (
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/trees" component={TreesPage} />
          <Route path="/trees/add" component={() => <TreeFormPage />} />
          <Route path="/trees/:treeId/edit" component={() => <TreeFormPage editing />} />
          <Route path="/trees/:treeId" component={TreeDetailPage} />
          <Route path="/species" component={() => <ResourcesPage module="species" />} />
          <Route path="/locations" component={() => <ResourcesPage module="locations" />} />
          <Route path="/map" component={MapPage} />
          <Route path="/maintenance" component={() => <ResourcesPage module="maintenance" />} />
          <Route path="/ai-health" component={() => <AiPage page="health" />} />
          <Route path="/ai-prediction" component={() => <AiPage page="prediction" />} />
          <Route path="/ai-recommendations" component={() => <AiPage page="recommendations" />} />
          <Route path="/ai-insights" component={() => <AiPage page="insights" />} />
          <Route path="/chatbot" component={() => <AiPage page="chat" />} />
          <Route path="/alerts" component={AlertsPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
