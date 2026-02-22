import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geofencesApi } from '../api';
import MapView from '../components/MapView';
import { useMapController } from '../hooks/useMapController';
import { MapPin, Plus, Edit2, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', 
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'
];

export default function Geofences() {
  const [showForm, setShowForm] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [newGeofence, setNewGeofence] = useState({
    nome: '',
    descrizione: '',
    colore: '#3b82f6',
    coordinate: [],
    tipo: 'polygon',
    raggio_metri: 100,
  });
  const [drawingMode, setDrawingMode] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch geofences
  const { data: geofences = [], isLoading } = useQuery({
    queryKey: ['geofences'],
    queryFn: geofencesApi.getAll,
  });
  
  // Use MapController for geofence display
  const { 
    controller: mapController,
    updateGeofences: updateMapGeofences
  } = useMapController({
    initialProvider: 'roadmap'
  });
  
  // Update controller when geofences change
  useEffect(() => {
    if (geofences) {
      updateMapGeofences(geofences);
    }
  }, [geofences, updateMapGeofences]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: geofencesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['geofences']);
      toast.success('Geofence creato');
      resetForm();
    },
    onError: () => toast.error('Errore creazione'),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => geofencesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['geofences']);
      toast.success('Geofence aggiornato');
      setEditingGeofence(null);
    },
    onError: () => toast.error('Errore aggiornamento'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: geofencesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['geofences']);
      toast.success('Geofence eliminato');
    },
    onError: () => toast.error('Errore eliminazione'),
  });

  const resetForm = () => {
    setNewGeofence({
      nome: '',
      descrizione: '',
      colore: '#3b82f6',
      coordinate: [],
      tipo: 'polygon',
      raggio_metri: 100,
    });
    setShowForm(false);
    setDrawingMode(false);
  };

  const handleGeofenceCreated = ({ coordinates, tipo, raggio }) => {
    setNewGeofence({
      ...newGeofence,
      coordinate: coordinates,
      tipo: tipo,
      raggio_metri: raggio || 100,
    });
    setDrawingMode(false);
  };

  const handleSave = () => {
    if (!newGeofence.nome) {
      toast.error('Inserisci un nome');
      return;
    }
    if (newGeofence.coordinate.length === 0) {
      toast.error('Disegna l\'area sulla mappa');
      return;
    }
    createMutation.mutate(newGeofence);
  };

  const handleDelete = (id) => {
    if (window.confirm('Eliminare questo geofence?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleActive = (geofence) => {
    updateMutation.mutate({
      id: geofence.id,
      data: { attivo: geofence.attivo ? 0 : 1 }
    });
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row pb-16 lg:pb-0">
      {/* Sidebar */}
      <div className="w-full lg:w-96 bg-white border-b lg:border-r lg:border-b-0 border-gray-200 flex-shrink-0 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Geofence</h1>
              <p className="text-sm text-gray-500">Zone di monitoraggio</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                showForm ? "bg-red-100 text-red-600" : "bg-primary-100 text-primary-600"
              )}
            >
              {showForm ? <X size={20} /> : <Plus size={20} />}
            </button>
          </div>

          {/* New Geofence Form */}
          {showForm && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={newGeofence.nome}
                onChange={(e) => setNewGeofence({ ...newGeofence, nome: e.target.value })}
                placeholder="Nome zona"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <textarea
                value={newGeofence.descrizione}
                onChange={(e) => setNewGeofence({ ...newGeofence, descrizione: e.target.value })}
                placeholder="Descrizione (opzionale)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              
              <div>
                <label className="text-xs text-gray-500 block mb-1">Colore</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewGeofence({ ...newGeofence, colore: color })}
                      className={clsx(
                        "w-6 h-6 rounded-full border-2 transition-transform",
                        newGeofence.colore === color ? "border-gray-800 scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {newGeofence.coordinate.length > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">
                    ✓ Area disegnata ({newGeofence.tipo === 'circle' ? 'cerchio' : 'poligono'})
                  </span>
                  <button
                    onClick={() => {
                      setNewGeofence({ ...newGeofence, coordinate: [] });
                      setDrawingMode(true);
                    }}
                    className="text-primary-600 hover:underline"
                  >
                    Ridisegna
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDrawingMode(true)}
                  className={clsx(
                    "w-full py-2 rounded-lg transition-colors text-sm",
                    drawingMode 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )}
                >
                  {drawingMode ? '🖊️ Disegna sulla mappa...' : 'Disegna area sulla mappa'}
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={createMutation.isPending}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Salva
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Geofences List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="spinner"></div>
            </div>
          ) : geofences.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="mx-auto text-gray-300 mb-2" size={40} />
              <p className="text-gray-500">Nessun geofence</p>
              <p className="text-sm text-gray-400">Clicca + per crearne uno</p>
            </div>
          ) : (
            <div className="space-y-3">
              {geofences.map((geofence) => (
                <div
                  key={geofence.id}
                  className={clsx(
                    "p-3 rounded-lg border transition-colors",
                    geofence.attivo 
                      ? "border-gray-200 bg-white" 
                      : "border-gray-100 bg-gray-50 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: geofence.colore }}
                      />
                      <h3 className="font-medium">{geofence.nome}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(geofence)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={geofence.attivo ? 'Disattiva' : 'Attiva'}
                      >
                        {geofence.attivo ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(geofence.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Elimina"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {geofence.descrizione && (
                    <p className="text-sm text-gray-500 mt-1">{geofence.descrizione}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {geofence.tipo === 'circle' ? 'Cerchio' : 'Poligono'}
                    </span>
                    {geofence.tipo === 'circle' && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {geofence.raggio_metri}m
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          controller={mapController}
          height="100%"
        />
        
        {drawingMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg shadow-lg z-[1000]">
            📍 Clicca sulla mappa per disegnare l'area (funzione in sviluppo)
          </div>
        )}
      </div>
    </div>
  );
}
