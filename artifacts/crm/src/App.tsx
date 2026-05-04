import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout";

// Pages
import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import ContactDetail from "@/pages/contact-detail";
import Pipeline from "@/pages/pipeline";
import LeadsNew from "@/pages/leads-new";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/leads/new" component={LeadsNew} />
      <Route path="/">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path="/contacts">
        <AppLayout>
          <Contacts />
        </AppLayout>
      </Route>
      <Route path="/contacts/:id">
        <AppLayout>
          <ContactDetail />
        </AppLayout>
      </Route>
      <Route path="/pipeline">
        <AppLayout>
          <Pipeline />
        </AppLayout>
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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
