import { Box, LayoutDashboard, Network, PlayCircle, Terminal } from 'lucide-react';
import { useState } from 'react';
import { Button } from './components/ui/button';
import { ApiTester } from './features/api-tester/ApiTester';
import { ContainerInspector } from './features/container/ContainerInspector';
import { Dashboard } from './features/dashboard/Dashboard';
import { LiveLogs } from './features/live-logs/LiveLogs';
import { RoutesExplorer } from './features/routes/RoutesExplorer';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-2 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-primary-foreground">
            S
          </div>
          <span className="font-bold text-lg">Stratix DevTools</span>
        </div>
        
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard size={18} />}
        >
          Dashboard
        </NavButton>
        <NavButton 
          active={activeTab === 'routes'} 
          onClick={() => setActiveTab('routes')}
          icon={<Network size={18} />}
        >
          Routes
        </NavButton>
        <NavButton 
          active={activeTab === 'container'} 
          onClick={() => setActiveTab('container')}
          icon={<Box size={18} />}
        >
          Container
        </NavButton>
        <NavButton 
          active={activeTab === 'api-tester'} 
          onClick={() => setActiveTab('api-tester')}
          icon={<PlayCircle size={18} />}
        >
          API Tester
        </NavButton>
         <NavButton 
          active={activeTab === 'logs'} 
          onClick={() => setActiveTab('logs')}
          icon={<Terminal size={18} />}
        >
          Logs
        </NavButton>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'routes' && <RoutesExplorer />}
        {activeTab === 'container' && <ContainerInspector />}
        {activeTab === 'api-tester' && <ApiTester />}
        {activeTab === 'logs' && <LiveLogs />}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, children, icon }: any) {
  return (
    <Button 
      variant={active ? "secondary" : "ghost"} 
      className="w-full justify-start gap-2"
      onClick={onClick}
    >
      {icon}
      {children}
    </Button>
  );
}

export default App;
