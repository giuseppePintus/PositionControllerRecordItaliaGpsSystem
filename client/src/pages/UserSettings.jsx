import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings, Palette, Table2, Bell, Moon, Sun, Monitor, 
  Save, RotateCcw, Check, Eye, Loader2
} from 'lucide-react';
import api from '../api';

// Colori tema principale
const primaryColors = [
  { id: 'blue', name: 'Blu', color: '#3b82f6' },
  { id: 'emerald', name: 'Verde', color: '#10b981' },
  { id: 'orange', name: 'Arancione', color: '#f97316' },
  { id: 'purple', name: 'Viola', color: '#a855f7' },
  { id: 'rose', name: 'Rosa', color: '#f43f5e' },
  { id: 'cyan', name: 'Ciano', color: '#06b6d4' },
];

// Colori tema secondario (accent)
const secondaryColors = [
  { id: 'slate', name: 'Grigio', color: '#64748b' },
  { id: 'amber', name: 'Ambra', color: '#f59e0b' },
  { id: 'lime', name: 'Lime', color: '#84cc16' },
  { id: 'teal', name: 'Teal', color: '#14b8a6' },
  { id: 'indigo', name: 'Indaco', color: '#6366f1' },
  { id: 'pink', name: 'Rosa', color: '#ec4899' },
];

// Opzioni records per pagina
const pageSizeOptions = [10, 15, 20, 25, 50, 100];

// Modalità tema (chiaro/scuro)
const themeModes = [
  { id: 'light', name: 'Chiaro', icon: Sun },
  { id: 'dark', name: 'Scuro', icon: Moon },
  { id: 'system', name: 'Sistema', icon: Monitor },
];

// Impostazioni di default
const defaultSettings = {
  themeColor: 'blue',
  secondaryColor: 'slate',
  themeMode: 'light',
  defaultPageSize: 15,
  compactMode: false,
  showNotifications: true,
  soundEnabled: true,
  language: 'it',
};

// Sezioni del menu
const menuSections = [
  { id: 'aspetto', name: 'Aspetto', icon: Palette },
  { id: 'tabelle', name: 'Tabelle e Dati', icon: Table2 },
  { id: 'notifiche', name: 'Notifiche', icon: Bell },
];

// Componente Toggle Switch
function ToggleSwitch({ enabled, onChange, size = 'md' }) {
  const sizes = {
    sm: { track: 'w-9 h-5', thumb: 'w-4 h-4', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' },
  };
  
  const s = sizes[size] || sizes.md;
  
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${s.track} ${enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
    >
      <span className={`pointer-events-none inline-block rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${s.thumb} ${enabled ? s.translate : 'translate-x-0'}`} />
    </button>
  );
}

// Applica tema al documento - funzione globale
function applyTheme(themeMode, themeColor, secondaryColor) {
  const root = document.documentElement;
  
  // Determina se usare tema scuro
  let isDark = themeMode === 'dark';
  if (themeMode === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  // Rimuovi prima tutte le classi dark
  root.classList.remove('dark');
  
  // Applica classe dark solo se necessario
  if (isDark) {
    root.classList.add('dark');
  }
  
  // Applica attributi tema
  root.setAttribute('data-theme', themeColor || 'blue');
  root.setAttribute('data-secondary', secondaryColor || 'slate');
  root.setAttribute('data-mode', isDark ? 'dark' : 'light');
  
  // Salva in localStorage per persistenza
  const settings = {
    themeColor: themeColor || 'blue',
    secondaryColor: secondaryColor || 'slate',
    themeMode: themeMode || 'light'
  };
  
  // Merge con impostazioni esistenti
  try {
    const existing = JSON.parse(localStorage.getItem('userSettings') || '{}');
    localStorage.setItem('userSettings', JSON.stringify({ ...existing, ...settings }));
  } catch (e) {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }
}

export default function UserSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('aspetto');
  const saveTimeoutRef = useRef(null);
  const initialLoadDone = useRef(false);

  // Carica impostazioni dal server (database)
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        // Prima prova a caricare dal server
        const response = await api.get('/gestionale/user-settings');
        const serverSettings = response.data;
        
        if (serverSettings && Object.keys(serverSettings).length > 0) {
          // Converti dal formato del server al formato locale
          const loadedSettings = { ...defaultSettings };
          for (const [key, value] of Object.entries(serverSettings)) {
            // Parse JSON se necessario
            try {
              loadedSettings[key] = typeof value === 'string' && (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false')
                ? JSON.parse(value)
                : value;
            } catch {
              loadedSettings[key] = value;
            }
          }
          setSettings(loadedSettings);
          // Salva anche in localStorage come fallback
          localStorage.setItem('userSettings', JSON.stringify(loadedSettings));
          // Applica tema
          applyTheme(loadedSettings.themeMode, loadedSettings.themeColor, loadedSettings.secondaryColor);
        } else {
          // Fallback a localStorage
          const localSettings = localStorage.getItem('userSettings');
          if (localSettings) {
            const parsed = JSON.parse(localSettings);
            setSettings({ ...defaultSettings, ...parsed });
            applyTheme(parsed.themeMode || 'light', parsed.themeColor || 'blue', parsed.secondaryColor || 'slate');
          }
        }
      } catch (err) {
        console.warn('Caricamento da server fallito, uso localStorage:', err);
        // Fallback a localStorage
        try {
          const localSettings = localStorage.getItem('userSettings');
          if (localSettings) {
            const parsed = JSON.parse(localSettings);
            setSettings({ ...defaultSettings, ...parsed });
            applyTheme(parsed.themeMode || 'light', parsed.themeColor || 'blue', parsed.secondaryColor || 'slate');
          }
        } catch (e) {
          console.error('Errore lettura localStorage:', e);
        }
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    };
    
    loadSettings();
  }, []);

  // Ascolta cambio preferenza sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (settings.themeMode === 'system') {
        applyTheme(settings.themeMode, settings.themeColor, settings.secondaryColor);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.themeMode, settings.themeColor, settings.secondaryColor]);

  // Salva impostazioni nel database (con debounce)
  const saveToDatabase = useCallback(async (newSettings) => {
    if (!initialLoadDone.current) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Salva ogni impostazione singolarmente nel database
        for (const [key, value] of Object.entries(newSettings)) {
          await api.post(`/gestionale/user-settings/${key}`, { 
            value: typeof value === 'object' ? JSON.stringify(value) : value 
          });
        }
      } catch (err) {
        console.warn('Salvataggio automatico su server fallito:', err);
      }
    }, 500);
  }, []);

  // Salva impostazioni manualmente
  const handleSave = async () => {
    setSaving(true);
    try {
      // Salva in localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      // Salva nel database
      for (const [key, value] of Object.entries(settings)) {
        await api.post(`/gestionale/user-settings/${key}`, { 
          value: typeof value === 'object' ? JSON.stringify(value) : value 
        });
      }
      
      // Applica tema
      applyTheme(settings.themeMode, settings.themeColor, settings.secondaryColor);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Errore salvataggio:', err);
      // Salva almeno in localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  // Reset impostazioni
  const handleReset = async () => {
    setSettings(defaultSettings);
    localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
    applyTheme('light', 'blue', 'slate');
    
    // Reset anche nel database
    try {
      for (const [key, value] of Object.entries(defaultSettings)) {
        await api.post(`/gestionale/user-settings/${key}`, { 
          value: typeof value === 'object' ? JSON.stringify(value) : value 
        });
      }
    } catch (err) {
      console.warn('Reset su server fallito:', err);
    }
  };

  // Update singola impostazione (applica subito il tema e salva)
  const updateSetting = (key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Applica immediatamente i cambiamenti del tema
      if (key === 'themeMode' || key === 'themeColor' || key === 'secondaryColor') {
        applyTheme(
          key === 'themeMode' ? value : newSettings.themeMode,
          key === 'themeColor' ? value : newSettings.themeColor,
          key === 'secondaryColor' ? value : newSettings.secondaryColor
        );
      }
      
      // Salva in localStorage immediatamente
      localStorage.setItem('userSettings', JSON.stringify(newSettings));
      
      // Salva nel database (con debounce)
      saveToDatabase(newSettings);
      
      return newSettings;
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary-600" size={32} />
          <p className="text-gray-500">Caricamento impostazioni...</p>
        </div>
      </div>
    );
  }

  // Sezione Aspetto
  const AspettoSection = () => (
    <div className="space-y-6">
      {/* Colore Principale */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Colore Principale
        </label>
        <div className="flex flex-wrap gap-3">
          {primaryColors.map(color => (
            <button
              key={color.id}
              onClick={() => updateSetting('themeColor', color.id)}
              className={`relative w-10 h-10 rounded-xl transition-all duration-200 hover:scale-110 ${settings.themeColor === color.id ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
              style={{ backgroundColor: color.color }}
              title={color.name}
            >
              {settings.themeColor === color.id && (
                <Check className="absolute inset-0 m-auto text-white" size={18} />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Colore per pulsanti, link e elementi principali
        </p>
      </div>

      {/* Colore Secondario */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Colore Secondario
        </label>
        <div className="flex flex-wrap gap-3">
          {secondaryColors.map(color => (
            <button
              key={color.id}
              onClick={() => updateSetting('secondaryColor', color.id)}
              className={`relative w-10 h-10 rounded-xl transition-all duration-200 hover:scale-110 ${settings.secondaryColor === color.id ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
              style={{ backgroundColor: color.color }}
              title={color.name}
            >
              {settings.secondaryColor === color.id && (
                <Check className="absolute inset-0 m-auto text-white" size={18} />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Colore per accenti e elementi secondari
        </p>
      </div>

      {/* Modalità Tema */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Modalità Tema
        </label>
        <div className="flex gap-2">
          {themeModes.map(mode => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => updateSetting('themeMode', mode.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${settings.themeMode === mode.id ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <Icon size={18} />
                {mode.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {settings.themeMode === 'system' 
            ? 'Il tema seguirà le preferenze del sistema operativo'
            : settings.themeMode === 'dark'
              ? 'Interfaccia scura, ideale per ambienti con poca luce'
              : 'Interfaccia chiara, ideale per uso diurno'}
        </p>
      </div>

      {/* Anteprima */}
      <div className="pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Eye size={16} />
          Anteprima
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm">
            Primario
          </button>
          <button className="px-4 py-2 bg-secondary-600 hover:bg-secondary-700 text-white rounded-lg transition-colors text-sm">
            Secondario
          </button>
          <button className="px-4 py-2 border border-primary-600 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors text-sm">
            Outline
          </button>
          <span className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
            Badge
          </span>
          <span className="px-3 py-1.5 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium">
            Badge 2
          </span>
        </div>
      </div>
    </div>
  );

  // Sezione Tabelle
  const TabelleSection = () => (
    <div className="space-y-6">
      {/* Record per pagina */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Record per Pagina (default)
        </label>
        <div className="flex flex-wrap gap-2">
          {pageSizeOptions.map(size => (
            <button
              key={size}
              onClick={() => updateSetting('defaultPageSize', size)}
              className={`px-4 py-2 rounded-lg border transition-colors font-medium ${settings.defaultPageSize === size ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {size}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Numero di record visualizzati per pagina nelle tabelle
        </p>
      </div>

      {/* Modalità compatta */}
      <div className="flex items-center justify-between py-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Modalità Compatta
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Riduce lo spazio tra gli elementi nelle tabelle
          </p>
        </div>
        <ToggleSwitch 
          enabled={settings.compactMode} 
          onChange={(v) => updateSetting('compactMode', v)} 
        />
      </div>
    </div>
  );

  // Sezione Notifiche
  const NotificheSection = () => (
    <div className="space-y-4">
      {/* Notifiche Desktop */}
      <div className="flex items-center justify-between py-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notifiche Desktop
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Ricevi notifiche push sul browser
          </p>
        </div>
        <ToggleSwitch 
          enabled={settings.showNotifications} 
          onChange={(v) => updateSetting('showNotifications', v)} 
        />
      </div>

      {/* Suoni */}
      <div className="flex items-center justify-between py-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Suoni Notifiche
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Riproduci suoni per eventi importanti
          </p>
        </div>
        <ToggleSwitch 
          enabled={settings.soundEnabled} 
          onChange={(v) => updateSetting('soundEnabled', v)} 
        />
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'aspetto': return <AspettoSection />;
      case 'tabelle': return <TabelleSection />;
      case 'notifiche': return <NotificheSection />;
      default: return <AspettoSection />;
    }
  };

  return (
    <div className="p-6 h-full overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="text-primary-600" size={28} />
          Impostazioni Utente
        </h1>
        <p className="text-gray-500 mt-1">
          Personalizza l'aspetto e il comportamento dell'applicazione
        </p>
      </div>

      <div className="flex gap-6">
        {/* Menu Laterale */}
        <div className="w-56 shrink-0">
          <nav className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
            {menuSections.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4 ${isActive ? 'bg-primary-50 border-primary-600 text-primary-700' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{section.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Azioni */}
          <div className="mt-4 space-y-2 sticky top-48">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : saved ? (
                <Check size={18} />
              ) : (
                <Save size={18} />
              )}
              {saved ? 'Salvato!' : 'Salva'}
            </button>
            
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw size={18} />
              Ripristina
            </button>
          </div>
        </div>

        {/* Contenuto */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
            {(() => {
              const section = menuSections.find(s => s.id === activeSection);
              const Icon = section?.icon || Settings;
              return (
                <>
                  <Icon size={22} className="text-primary-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {section?.name || 'Impostazioni'}
                  </h2>
                </>
              );
            })()}
          </div>
          
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
