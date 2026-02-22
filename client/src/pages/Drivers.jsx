import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, Phone, Mail, Truck, Edit2, Save, X, Plus, Trash2, 
  MessageSquare, Clock, Bell, Link, ChevronDown, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API_BASE = '/api';

// API functions
const driversApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/drivers`);
    if (!res.ok) throw new Error('Errore caricamento autisti');
    return res.json();
  },
  getById: async (id) => {
    const res = await fetch(`${API_BASE}/drivers/${id}`);
    if (!res.ok) throw new Error('Autista non trovato');
    return res.json();
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE}/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Errore creazione autista');
    return res.json();
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE}/drivers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Errore aggiornamento autista');
    return res.json();
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE}/drivers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Errore eliminazione autista');
    return res.json();
  },
  assignVehicle: async (driverId, vehiclePlate) => {
    const res = await fetch(`${API_BASE}/drivers/${driverId}/assign-vehicle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_plate: vehiclePlate }),
    });
    if (!res.ok) throw new Error('Errore assegnazione veicolo');
    return res.json();
  },
  unassignVehicle: async (driverId, plate) => {
    const res = await fetch(`${API_BASE}/drivers/${driverId}/unassign-vehicle/${plate}`, { 
      method: 'DELETE' 
    });
    if (!res.ok) throw new Error('Errore rimozione assegnazione');
    return res.json();
  },
};

const vehiclesApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/vehicles`);
    if (!res.ok) throw new Error('Errore caricamento veicoli');
    return res.json();
  },
};

const responsablesApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/responsables`);
    if (!res.ok) throw new Error('Errore caricamento responsabili');
    return res.json();
  },
  create: async (data) => {
    const res = await fetch(`${API_BASE}/responsables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Errore creazione responsabile');
    return res.json();
  },
  update: async (id, data) => {
    const res = await fetch(`${API_BASE}/responsables/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Errore aggiornamento responsabile');
    return res.json();
  },
  delete: async (id) => {
    const res = await fetch(`${API_BASE}/responsables/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Errore eliminazione responsabile');
    return res.json();
  },
};

const whatsappApi = {
  getStatus: async () => {
    const res = await fetch(`${API_BASE}/whatsapp/status`);
    if (!res.ok) throw new Error('Errore stato WhatsApp');
    return res.json();
  },
  initialize: async () => {
    const res = await fetch(`${API_BASE}/whatsapp/initialize`, { method: 'POST' });
    if (!res.ok) throw new Error('Errore inizializzazione WhatsApp');
    return res.json();
  },
  disconnect: async () => {
    const res = await fetch(`${API_BASE}/whatsapp/disconnect`, { method: 'POST' });
    if (!res.ok) throw new Error('Errore disconnessione WhatsApp');
    return res.json();
  },
  updateConfig: async (config) => {
    const res = await fetch(`${API_BASE}/whatsapp/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Errore aggiornamento configurazione');
    return res.json();
  },
  sendTest: async (telefono, messaggio) => {
    const res = await fetch(`${API_BASE}/whatsapp/send-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono, messaggio }),
    });
    if (!res.ok) throw new Error('Errore invio messaggio');
    return res.json();
  },
};

// Componente per l'editing di un autista
function DriverForm({ driver, onSave, onCancel, vehicles }) {
  const [form, setForm] = useState({
    nome: driver?.nome || '',
    cognome: driver?.cognome || '',
    telefono: driver?.telefono || '',
    telefono_whatsapp: driver?.telefono_whatsapp || '',
    email: driver?.email || '',
    codice_fiscale: driver?.codice_fiscale || '',
    patente_numero: driver?.patente_numero || '',
    patente_scadenza: driver?.patente_scadenza || '',
    cqc_scadenza: driver?.cqc_scadenza || '',
    note: driver?.note || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nome *</label>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Cognome *</label>
          <input
            type="text"
            value={form.cognome}
            onChange={(e) => setForm({ ...form, cognome: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Telefono *</label>
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            placeholder="+39..."
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Telefono WhatsApp</label>
          <input
            type="tel"
            value={form.telefono_whatsapp}
            onChange={(e) => setForm({ ...form, telefono_whatsapp: e.target.value })}
            placeholder="Lascia vuoto se uguale al telefono"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Codice Fiscale</label>
          <input
            type="text"
            value={form.codice_fiscale}
            onChange={(e) => setForm({ ...form, codice_fiscale: e.target.value.toUpperCase() })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Numero Patente</label>
          <input
            type="text"
            value={form.patente_numero}
            onChange={(e) => setForm({ ...form, patente_numero: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Scadenza Patente</label>
          <input
            type="date"
            value={form.patente_scadenza || ''}
            onChange={(e) => setForm({ ...form, patente_scadenza: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Scadenza CQC</label>
          <input
            type="date"
            value={form.cqc_scadenza || ''}
            onChange={(e) => setForm({ ...form, cqc_scadenza: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Note</label>
        <textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          rows={2}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
        >
          <X className="w-4 h-4 inline mr-1" />
          Annulla
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded text-white"
        >
          <Save className="w-4 h-4 inline mr-1" />
          Salva
        </button>
      </div>
    </form>
  );
}

// Componente per WhatsApp Config
function WhatsAppConfig() {
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test dal sistema GPS');
  
  const { data: status, isLoading } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: whatsappApi.getStatus,
    refetchInterval: 10000,
  });

  const [config, setConfig] = useState({
    timeout_risposta_minuti: 5,
    timeout_chiamata_minuti: 10,
    timeout_responsabile_minuti: 15,
  });

  React.useEffect(() => {
    if (status?.config) {
      setConfig(status.config);
    }
  }, [status]);

  const initMutation = useMutation({
    mutationFn: whatsappApi.initialize,
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-status']);
      toast.success('Inizializzazione avviata - Controlla il QR code in console');
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: whatsappApi.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-status']);
      toast.success('WhatsApp disconnesso');
    },
    onError: (err) => toast.error(err.message),
  });

  const configMutation = useMutation({
    mutationFn: whatsappApi.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-status']);
      toast.success('Configurazione salvata');
    },
    onError: (err) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: () => whatsappApi.sendTest(testPhone, testMessage),
    onSuccess: () => toast.success('Messaggio inviato'),
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="text-gray-400">Caricamento stato WhatsApp...</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className={clsx('w-5 h-5', status?.isReady ? 'text-green-500' : 'text-gray-500')} />
          <span className="font-medium">
            WhatsApp Bot: {status?.isReady ? 'Connesso ✓' : 'Non connesso'}
          </span>
        </div>
        {status?.isReady ? (
          <button
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm"
          >
            Disconnetti
          </button>
        ) : (
          <button
            onClick={() => initMutation.mutate()}
            disabled={initMutation.isPending}
            className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
          >
            {initMutation.isPending ? 'Inizializzazione...' : 'Connetti'}
          </button>
        )}
      </div>

      {/* Escalation Timeouts */}
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Tempi di Escalation
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Attesa risposta (min)
            </label>
            <input
              type="number"
              min="1"
              value={config.timeout_risposta_minuti}
              onChange={(e) => setConfig({ ...config, timeout_risposta_minuti: parseInt(e.target.value) })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Richiamo urgente (min)
            </label>
            <input
              type="number"
              min="1"
              value={config.timeout_chiamata_minuti}
              onChange={(e) => setConfig({ ...config, timeout_chiamata_minuti: parseInt(e.target.value) })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Contatta responsabile (min)
            </label>
            <input
              type="number"
              min="1"
              value={config.timeout_responsabile_minuti}
              onChange={(e) => setConfig({ ...config, timeout_responsabile_minuti: parseInt(e.target.value) })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            />
          </div>
        </div>
        <button
          onClick={() => configMutation.mutate(config)}
          disabled={configMutation.isPending}
          className="mt-3 px-3 py-1 bg-primary-600 hover:bg-primary-500 rounded text-sm"
        >
          Salva Configurazione
        </button>
      </div>

      {/* Test Message */}
      {status?.isReady && (
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Invia Messaggio Test</h4>
          <div className="flex space-x-2">
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+39..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            />
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Messaggio"
              className="flex-2 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            />
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !testPhone}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm disabled:opacity-50"
            >
              Invia
            </button>
          </div>
        </div>
      )}

      {/* Info escalation */}
      <div className="border-t border-gray-700 pt-4 text-xs text-gray-500">
        <p className="font-medium mb-2">Sistema di Escalation:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Quando scatta un allarme, viene inviato messaggio WhatsApp all'autista</li>
          <li>Se non risponde entro {config.timeout_risposta_minuti} minuti → messaggio urgente</li>
          <li>Se non risponde entro {config.timeout_chiamata_minuti} minuti → escalation</li>
          <li>Dopo {config.timeout_responsabile_minuti} minuti → notifica ai responsabili</li>
        </ol>
        <p className="mt-2 text-gray-400">
          Risposte valide: OK, SI, CONFERMO, RICEVUTO, VISTO
        </p>
      </div>
    </div>
  );
}

export default function Drivers() {
  const queryClient = useQueryClient();
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddResponsable, setShowAddResponsable] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [assigningVehicle, setAssigningVehicle] = useState(null);
  const [expandedDriver, setExpandedDriver] = useState(null);
  const [activeTab, setActiveTab] = useState('drivers');

  // Queries
  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: driversApi.getAll,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.getAll,
  });

  const { data: responsables = [], isLoading: responsablesLoading } = useQuery({
    queryKey: ['responsables'],
    queryFn: responsablesApi.getAll,
  });

  // Mutations
  const createDriverMutation = useMutation({
    mutationFn: driversApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      setShowAddDriver(false);
      toast.success('Autista creato');
    },
    onError: (err) => toast.error(err.message),
  });

  const updateDriverMutation = useMutation({
    mutationFn: ({ id, data }) => driversApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      setEditingDriver(null);
      toast.success('Autista aggiornato');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteDriverMutation = useMutation({
    mutationFn: driversApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      toast.success('Autista eliminato');
    },
    onError: (err) => toast.error(err.message),
  });

  const assignVehicleMutation = useMutation({
    mutationFn: ({ driverId, plate }) => driversApi.assignVehicle(driverId, plate),
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      setAssigningVehicle(null);
      toast.success('Veicolo assegnato');
    },
    onError: (err) => toast.error(err.message),
  });

  const unassignVehicleMutation = useMutation({
    mutationFn: ({ driverId, plate }) => driversApi.unassignVehicle(driverId, plate),
    onSuccess: () => {
      queryClient.invalidateQueries(['drivers']);
      toast.success('Assegnazione rimossa');
    },
    onError: (err) => toast.error(err.message),
  });

  const createResponsableMutation = useMutation({
    mutationFn: responsablesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['responsables']);
      setShowAddResponsable(false);
      toast.success('Responsabile creato');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteResponsableMutation = useMutation({
    mutationFn: responsablesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['responsables']);
      toast.success('Responsabile eliminato');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <User className="w-6 h-6 mr-2" />
        Gestione Autisti & Notifiche WhatsApp
      </h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('drivers')}
          className={clsx(
            'px-4 py-2 -mb-px border-b-2',
            activeTab === 'drivers' 
              ? 'border-primary-500 text-primary-500' 
              : 'border-transparent text-gray-400 hover:text-white'
          )}
        >
          <User className="w-4 h-4 inline mr-2" />
          Autisti
        </button>
        <button
          onClick={() => setActiveTab('responsables')}
          className={clsx(
            'px-4 py-2 -mb-px border-b-2',
            activeTab === 'responsables' 
              ? 'border-primary-500 text-primary-500' 
              : 'border-transparent text-gray-400 hover:text-white'
          )}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          Responsabili
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={clsx(
            'px-4 py-2 -mb-px border-b-2',
            activeTab === 'whatsapp' 
              ? 'border-primary-500 text-primary-500' 
              : 'border-transparent text-gray-400 hover:text-white'
          )}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          WhatsApp Bot
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'drivers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400">
              {drivers.length} autisti registrati
            </span>
            <button
              onClick={() => setShowAddDriver(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Autista
            </button>
          </div>

          {/* Add Driver Form */}
          {showAddDriver && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Nuovo Autista</h3>
              <DriverForm
                vehicles={vehicles}
                onSave={(data) => createDriverMutation.mutate(data)}
                onCancel={() => setShowAddDriver(false)}
              />
            </div>
          )}

          {/* Drivers List */}
          {driversLoading ? (
            <div className="text-gray-400">Caricamento...</div>
          ) : drivers.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              Nessun autista registrato. Clicca "Nuovo Autista" per iniziare.
            </div>
          ) : (
            <div className="space-y-2">
              {drivers.map((driver) => (
                <div key={driver.id} className="bg-gray-800 rounded-lg overflow-hidden">
                  {editingDriver?.id === driver.id ? (
                    <div className="p-4">
                      <DriverForm
                        driver={driver}
                        vehicles={vehicles}
                        onSave={(data) => updateDriverMutation.mutate({ id: driver.id, data })}
                        onCancel={() => setEditingDriver(null)}
                      />
                    </div>
                  ) : (
                    <>
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-750"
                        onClick={() => setExpandedDriver(expandedDriver === driver.id ? null : driver.id)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium">{driver.nome} {driver.cognome}</div>
                            <div className="text-sm text-gray-400 flex items-center space-x-3">
                              <span className="flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {driver.telefono}
                              </span>
                              {driver.veicoli_assegnati && (
                                <span className="flex items-center text-green-400">
                                  <Truck className="w-3 h-3 mr-1" />
                                  {driver.veicoli_assegnati}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDriver(driver);
                            }}
                            className="p-2 hover:bg-gray-700 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Eliminare questo autista?')) {
                                deleteDriverMutation.mutate(driver.id);
                              }
                            }}
                            className="p-2 hover:bg-red-700 rounded text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expandedDriver === driver.id ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {expandedDriver === driver.id && (
                        <div className="border-t border-gray-700 p-4 bg-gray-850">
                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            {driver.email && (
                              <div>
                                <span className="text-gray-400">Email:</span>{' '}
                                <span>{driver.email}</span>
                              </div>
                            )}
                            {driver.codice_fiscale && (
                              <div>
                                <span className="text-gray-400">C.F.:</span>{' '}
                                <span>{driver.codice_fiscale}</span>
                              </div>
                            )}
                            {driver.patente_numero && (
                              <div>
                                <span className="text-gray-400">Patente:</span>{' '}
                                <span>{driver.patente_numero}</span>
                                {driver.patente_scadenza && (
                                  <span className="text-gray-500 text-xs ml-2">
                                    (scad. {new Date(driver.patente_scadenza).toLocaleDateString('it-IT')})
                                  </span>
                                )}
                              </div>
                            )}
                            {driver.cqc_scadenza && (
                              <div>
                                <span className="text-gray-400">CQC scad.:</span>{' '}
                                <span>{new Date(driver.cqc_scadenza).toLocaleDateString('it-IT')}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-400">WhatsApp:</span>{' '}
                              <span>{driver.telefono_whatsapp || driver.telefono}</span>
                            </div>
                          </div>

                          {/* Vehicle Assignment */}
                          <div className="border-t border-gray-700 pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium flex items-center">
                                <Truck className="w-4 h-4 mr-2" />
                                Veicolo Assegnato
                              </h4>
                              <button
                                onClick={() => setAssigningVehicle(driver.id)}
                                className="text-sm px-2 py-1 bg-green-600 hover:bg-green-500 rounded"
                              >
                                <Link className="w-3 h-3 inline mr-1" />
                                Assegna
                              </button>
                            </div>

                            {driver.veicoli_assegnati ? (
                              <div className="flex items-center justify-between bg-gray-700 rounded p-2">
                                <span>{driver.veicoli_assegnati}</span>
                                <button
                                  onClick={() => unassignVehicleMutation.mutate({ 
                                    driverId: driver.id, 
                                    plate: driver.veicoli_assegnati 
                                  })}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-sm">Nessun veicolo assegnato</div>
                            )}

                            {/* Vehicle Assignment Modal */}
                            {assigningVehicle === driver.id && (
                              <div className="mt-2">
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      assignVehicleMutation.mutate({
                                        driverId: driver.id,
                                        plate: e.target.value,
                                      });
                                    }
                                  }}
                                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
                                >
                                  <option value="">Seleziona veicolo...</option>
                                  {vehicles.map((v) => (
                                    <option key={v.id} value={v.targa_camion}>
                                      {v.nickname || v.targa_camion} - {v.targa_camion}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'responsables' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400">
              Responsabili da contattare in caso di escalation
            </span>
            <button
              onClick={() => setShowAddResponsable(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Responsabile
            </button>
          </div>

          {showAddResponsable && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-medium mb-3">Nuovo Responsabile</h3>
              <ResponsableForm
                onSave={(data) => createResponsableMutation.mutate(data)}
                onCancel={() => setShowAddResponsable(false)}
              />
            </div>
          )}

          {responsablesLoading ? (
            <div className="text-gray-400">Caricamento...</div>
          ) : responsables.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              Nessun responsabile configurato. Aggiungi almeno un responsabile per ricevere notifiche di escalation.
            </div>
          ) : (
            <div className="space-y-2">
              {responsables.map((resp) => (
                <div key={resp.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{resp.nome} {resp.cognome}</div>
                      <div className="text-sm text-gray-400">
                        {resp.ruolo || 'Responsabile'} - Priorità: {resp.priorita}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <div className="flex items-center text-gray-400">
                        <Phone className="w-3 h-3 mr-1" />
                        {resp.telefono}
                      </div>
                      {resp.email && (
                        <div className="flex items-center text-gray-400">
                          <Mail className="w-3 h-3 mr-1" />
                          {resp.email}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Eliminare questo responsabile?')) {
                          deleteResponsableMutation.mutate(resp.id);
                        }
                      }}
                      className="p-2 hover:bg-red-700 rounded text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'whatsapp' && (
        <WhatsAppConfig />
      )}
    </div>
  );
}

// Form per responsabile
function ResponsableForm({ responsable, onSave, onCancel }) {
  const [form, setForm] = useState({
    nome: responsable?.nome || '',
    cognome: responsable?.cognome || '',
    telefono: responsable?.telefono || '',
    telefono_whatsapp: responsable?.telefono_whatsapp || '',
    email: responsable?.email || '',
    ruolo: responsable?.ruolo || 'responsabile',
    priorita: responsable?.priorita || 1,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nome *</label>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Cognome *</label>
          <input
            type="text"
            value={form.cognome}
            onChange={(e) => setForm({ ...form, cognome: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Telefono *</label>
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            placeholder="+39..."
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Ruolo</label>
          <input
            type="text"
            value={form.ruolo}
            onChange={(e) => setForm({ ...form, ruolo: e.target.value })}
            placeholder="es. Direttore Operativo"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Priorità (1 = più alta)</label>
          <input
            type="number"
            min="1"
            value={form.priorita}
            onChange={(e) => setForm({ ...form, priorita: parseInt(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
        >
          Annulla
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded text-white"
        >
          Salva
        </button>
      </div>
    </form>
  );
}
