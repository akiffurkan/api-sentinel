import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { MonitorsPage } from './pages/MonitorsPage';
import { MonitorDetailPage } from './pages/MonitorDetailPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthGatePage } from './pages/AuthGatePage';
import { AddMonitorModal } from './components/AddMonitorModal';
import { Incident, Monitor, OverviewData } from './types';
import { api } from './services/api';

type Tab = 'overview' | 'monitors' | 'incidents' | 'settings';

const DashboardContent: React.FC = () => {
  const { isAuthenticated, isAuthRequired, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (isAuthRequired && !isAuthenticated) return;
    try {
      const [ovData, mons, incs] = await Promise.all([
        api.getOverview(),
        api.getMonitors(),
        api.getIncidents(),
      ]);
      setOverviewData(ovData);
      setMonitors(mons);
      setIncidents(incs);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && (!isAuthRequired || isAuthenticated)) {
      fetchData();
      // Live polling every 10 seconds
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthLoading, isAuthRequired, isAuthenticated]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (isAuthRequired && !isAuthenticated) {
    return <AuthGatePage />;
  }

  const handleNavigateToMonitor = (id: string) => {
    setSelectedMonitorId(id);
  };

  const openIncidentsCount = overviewData?.open_incidents_count || 0;

  return (
    <div className="min-h-screen bg-background text-slate-200">
      <Navbar
        activeTab={selectedMonitorId ? 'monitors' : activeTab}
        setActiveTab={(tab) => {
          setSelectedMonitorId(null);
          setActiveTab(tab);
        }}
        openIncidentsCount={openIncidentsCount}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {selectedMonitorId ? (
          <MonitorDetailPage
            monitorId={selectedMonitorId}
            onBack={() => setSelectedMonitorId(null)}
            onMonitorDeleted={() => {
              setSelectedMonitorId(null);
              fetchData();
            }}
          />
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewPage
                data={overviewData}
                isLoading={isLoading}
                onRefresh={fetchData}
                onNavigateToMonitor={handleNavigateToMonitor}
                onNavigateToMonitors={() => setActiveTab('monitors')}
                onNavigateToIncidents={() => setActiveTab('incidents')}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />
            )}

            {activeTab === 'monitors' && (
              <MonitorsPage
                monitors={monitors}
                isLoading={isLoading}
                onRefresh={fetchData}
                onNavigateToMonitor={handleNavigateToMonitor}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />
            )}

            {activeTab === 'incidents' && (
              <IncidentsPage
                incidents={incidents}
                isLoading={isLoading}
                onRefresh={fetchData}
                onNavigateToMonitor={handleNavigateToMonitor}
              />
            )}

            {activeTab === 'settings' && <SettingsPage />}
          </>
        )}
      </main>

      {/* Global Add Monitor Dialog */}
      <AddMonitorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onMonitorCreated={fetchData}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
};

export default App;
