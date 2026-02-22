import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import MainLayout from './components/layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Geofences from './pages/Geofences';
import Routes_ from './pages/Routes';
import Alarms from './pages/Alarms';
import Events from './pages/Events';
import Settings from './pages/Settings';
import Drivers from './pages/Drivers';
import UserSettings from './pages/UserSettings';

// Gestionale pages - Anagrafiche
import { 
  Clienti, 
  Vettori, 
  MittentiDestinatari,
  Piattaforme,
  Magazzino,
  TipiVeicoli,
  Autisti,
  Officine,
  TipiDocumenti
} from './pages/gestionale/anagrafiche';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Placeholder component for pages not yet implemented
const ComingSoon = ({ title }) => (
  <div className="p-6 flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500">Questa sezione sarà disponibile prossimamente</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          {/* Satellitare routes */}
          <Route index element={<Dashboard />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="geofences" element={<Geofences />} />
          <Route path="routes" element={<Routes_ />} />
          <Route path="alarms" element={<Alarms />} />
          <Route path="events" element={<Events />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="settings" element={<Settings />} />
          
          {/* Impostazioni Utente (fuori da Satellitare/Gestionale) */}
          <Route path="user-settings" element={<UserSettings />} />
          
          {/* Gestionale routes */}
          <Route path="gestionale">
            {/* Anagrafiche */}
            <Route path="anagrafiche">
              <Route path="clienti" element={<Clienti />} />
              <Route path="vettori" element={<Vettori />} />
              <Route path="mittenti-destinatari" element={<MittentiDestinatari />} />
              <Route path="piattaforme" element={<Piattaforme />} />
              <Route path="magazzino" element={<Magazzino />} />
              <Route path="tipi-veicoli" element={<TipiVeicoli />} />
              <Route path="autisti" element={<Autisti />} />
              <Route path="officine" element={<Officine />} />
              <Route path="tipi-documenti" element={<TipiDocumenti />} />
            </Route>
            
            {/* Fatture */}
            <Route path="fatture">
              <Route path="clienti" element={<ComingSoon title="Fatture Clienti" />} />
              <Route path="fornitori" element={<ComingSoon title="Fatture Fornitori" />} />
            </Route>
            
            {/* Ordini */}
            <Route path="ordini">
              <Route path="lista" element={<ComingSoon title="Lista Ordini" />} />
              <Route path="da-abbinare" element={<ComingSoon title="Ordini da Abbinare" />} />
              <Route path="magazzino" element={<ComingSoon title="Gestione Magazzino" />} />
            </Route>
            
            {/* Automezzi */}
            <Route path="automezzi">
              <Route path="lista" element={<ComingSoon title="Lista Automezzi" />} />
              <Route path="rifornimenti" element={<ComingSoon title="Rifornimenti" />} />
              <Route path="manutenzioni" element={<ComingSoon title="Manutenzioni" />} />
              <Route path="documenti" element={<ComingSoon title="Documenti Automezzi" />} />
            </Route>
            
            {/* Trasporti */}
            <Route path="trasporti">
              <Route path="pianificazione" element={<ComingSoon title="Pianificazione Trasporti" />} />
            </Route>
            
            {/* Report */}
            <Route path="report">
              <Route path="dashboard" element={<ComingSoon title="Dashboard Report" />} />
            </Route>
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
