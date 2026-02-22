import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alarmsApi, geofencesApi, vehiclesApi, routesApi } from '../api';
import { Bell, Plus, Trash2, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const ALARM_TYPES = [
  { value: 'geofence_enter', label: 'Ingresso in zona', description: 'Notifica quando un veicolo entra in una zona' },
  { value: 'geofence_exit', label: 'Uscita da zona', description: 'Notifica quando un veicolo esce da una zona' },
  { value: 'late_arrival', label: 'Ritardo arrivo', description: 'Notifica quando un veicolo non arriva in tempo' },
  { value: 'missed_departure', label: 'Mancata partenza', description: 'Notifica quando un veicolo non parte in tempo' },
  { value: 'speed', label: 'Velocità', description: 'Notifica per variazioni di velocità' },
];

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
  { value: 7, label: 'Dom' },
];

export default function Alarms() {
  const [showForm, setShowForm] = useState(false);
  const [newAlarm, setNewAlarm] = useState({
    nome: '',
    tipo: 'geofence_enter',
    vehicle_id: null,
    geofence_id: null,
    route_id: null,
    ora_inizio: '',
    ora_fine: '',
    giorni_settimana: '1,2,3,4,5,6,7',
    notifica_telegram: true,
    notifica_push: true,
    priorita: 1,
  });

  const queryClient = useQueryClient();

  // Fetch data
  const { data: alarms = [], isLoading } = useQuery({
    queryKey: ['alarms'],
    queryFn: alarmsApi.getAll,
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ['geofences'],
    queryFn: geofencesApi.getAll,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.getAll,
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: routesApi.getAll,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: alarmsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['alarms']);
      toast.success('Allarme creato');
      setShowForm(false);
      resetForm();
    },
    onError: () => toast.error('Errore creazione'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => alarmsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['alarms']);
      toast.success('Allarme aggiornato');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: alarmsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['alarms']);
      toast.success('Allarme eliminato');
    },
  });

  const resetForm = () => {
    setNewAlarm({
      nome: '',
      tipo: 'geofence_enter',
      vehicle_id: null,
      geofence_id: null,
      route_id: null,
      ora_inizio: '',
      ora_fine: '',
      giorni_settimana: '1,2,3,4,5,6,7',
      notifica_telegram: true,
      notifica_push: true,
      priorita: 1,
    });
  };

  const toggleAlarm = (alarm) => {
    updateMutation.mutate({
      id: alarm.id,
      data: { attivo: alarm.attivo ? 0 : 1 }
    });
  };

  const toggleDay = (day) => {
    const days = newAlarm.giorni_settimana.split(',').map(Number).filter(Boolean);
    const newDays = days.includes(day) 
      ? days.filter(d => d !== day)
      : [...days, day].sort();
    setNewAlarm({ ...newAlarm, giorni_settimana: newDays.join(',') });
  };

  return (
    <div className="p-4 lg:p-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Allarmi</h1>
          <p className="text-gray-500">Configura le notifiche automatiche</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            showForm 
              ? "bg-red-100 text-red-600" 
              : "bg-primary-600 text-white hover:bg-primary-700"
          )}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span className="hidden sm:inline">{showForm ? 'Annulla' : 'Nuovo Allarme'}</span>
        </button>
      </div>

      {/* New Alarm Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold mb-4">Nuovo Allarme</h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2 lg:col-span-1">
              <label className="text-sm text-gray-600 block mb-1">Nome *</label>
              <input
                type="text"
                value={newAlarm.nome}
                onChange={(e) => setNewAlarm({ ...newAlarm, nome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Es: Allarme magazzino"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Tipo *</label>
              <select
                value={newAlarm.tipo}
                onChange={(e) => setNewAlarm({ ...newAlarm, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {ALARM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Veicolo</label>
              <select
                value={newAlarm.vehicle_id || ''}
                onChange={(e) => setNewAlarm({ ...newAlarm, vehicle_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tutti i veicoli</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nickname || v.targa_camion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Geofence</label>
              <select
                value={newAlarm.geofence_id || ''}
                onChange={(e) => setNewAlarm({ ...newAlarm, geofence_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tutte le zone</option>
                {geofences.map((g) => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Ora inizio</label>
              <input
                type="time"
                value={newAlarm.ora_inizio}
                onChange={(e) => setNewAlarm({ ...newAlarm, ora_inizio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Ora fine</label>
              <input
                type="time"
                value={newAlarm.ora_fine}
                onChange={(e) => setNewAlarm({ ...newAlarm, ora_fine: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Days */}
          <div className="mt-4">
            <label className="text-sm text-gray-600 block mb-2">Giorni attivi</label>
            <div className="flex gap-2">
              {DAYS.map((day) => {
                const isActive = newAlarm.giorni_settimana.split(',').map(Number).includes(day.value);
                return (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={clsx(
                      "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary-600 text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notification options */}
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newAlarm.notifica_telegram}
                onChange={(e) => setNewAlarm({ ...newAlarm, notifica_telegram: e.target.checked })}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">📱 Telegram</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newAlarm.notifica_push}
                onChange={(e) => setNewAlarm({ ...newAlarm, notifica_push: e.target.checked })}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">🔔 Push Browser</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annulla
            </button>
            <button
              onClick={() => createMutation.mutate(newAlarm)}
              disabled={!newAlarm.nome || createMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              Salva
            </button>
          </div>
        </div>
      )}

      {/* Alarms List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : alarms.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Bell className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">Nessun allarme configurato</p>
          <p className="text-sm text-gray-400">Crea un allarme per ricevere notifiche automatiche</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {alarms.map((alarm) => (
            <div
              key={alarm.id}
              className={clsx(
                "bg-white rounded-lg shadow-sm border overflow-hidden transition-colors",
                alarm.attivo ? "border-gray-200" : "border-gray-100 opacity-60"
              )}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{alarm.nome}</h3>
                    <p className="text-sm text-gray-500">
                      {ALARM_TYPES.find(t => t.value === alarm.tipo)?.label || alarm.tipo}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleAlarm(alarm)}
                    className={clsx(
                      "transition-colors",
                      alarm.attivo ? "text-green-500" : "text-gray-300"
                    )}
                  >
                    {alarm.attivo ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  {alarm.vehicle_name && (
                    <p className="text-gray-600">🚛 {alarm.vehicle_name}</p>
                  )}
                  {alarm.geofence_nome && (
                    <p className="text-gray-600">📍 {alarm.geofence_nome}</p>
                  )}
                  {(alarm.ora_inizio || alarm.ora_fine) && (
                    <p className="text-gray-600">
                      🕐 {alarm.ora_inizio?.slice(0, 5) || '00:00'} - {alarm.ora_fine?.slice(0, 5) || '23:59'}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-2">
                    {alarm.notifica_telegram && (
                      <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded">📱 TG</span>
                    )}
                    {alarm.notifica_push && (
                      <span className="text-xs px-2 py-1 bg-secondary-100 text-secondary-700 rounded">🔔 Push</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Eliminare questo allarme?')) {
                        deleteMutation.mutate(alarm.id);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
