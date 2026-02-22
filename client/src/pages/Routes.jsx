import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesApi, tripsApi } from '../api';
import MapView from '../components/MapView';
import { useMapController } from '../hooks/useMapController';
import { useMapPreferencesStore } from '../store';

// Giorni della settimana
const GIORNI_SETTIMANA = [
  { id: 0, nome: 'Domenica', short: 'Dom' },
  { id: 1, nome: 'Lunedì', short: 'Lun' },
  { id: 2, nome: 'Martedì', short: 'Mar' },
  { id: 3, nome: 'Mercoledì', short: 'Mer' },
  { id: 4, nome: 'Giovedì', short: 'Gio' },
  { id: 5, nome: 'Venerdì', short: 'Ven' },
  { id: 6, nome: 'Sabato', short: 'Sab' }
];

// Colori disponibili per i template
const COLORI_TEMPLATE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export default function Routes() {
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'viaggi'
  const queryClient = useQueryClient();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestione Tratte</h1>
        
        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Template Tratte
          </button>
          <button
            onClick={() => setActiveTab('viaggi')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'viaggi'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📅 Viaggi
          </button>
        </div>
      </div>

      {activeTab === 'templates' ? (
        <TemplatesSection />
      ) : (
        <ViaggiSection />
      )}
    </div>
  );
}

// ============================================================================
// SEZIONE TEMPLATES
// ============================================================================

function TemplatesSection() {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.getAll
  });

  const deleteMutation = useMutation({
    mutationFn: templatesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      if (selectedTemplate) setSelectedTemplate(null);
    }
  });

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo template?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Lista Templates */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Template Tratte</h2>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            + Nuovo Template
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nessun template creato</p>
            <p className="text-sm">Crea il primo template per iniziare</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: template.colore || '#3B82F6' }}
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{template.nome}</h3>
                      {template.descrizione && (
                        <p className="text-sm text-gray-500">{template.descrizione}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(template); }}
                      className="p-1 text-gray-400 hover:text-primary-600"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Giorni attivi */}
                <div className="mt-2 flex gap-1">
                  {GIORNI_SETTIMANA.map((giorno) => {
                    const giorni = template.giorni_settimana ? JSON.parse(template.giorni_settimana) : [];
                    const isActive = giorni.includes(giorno.id);
                    return (
                      <span
                        key={giorno.id}
                        className={`text-xs px-2 py-1 rounded ${
                          isActive
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {giorno.short}
                      </span>
                    );
                  })}
                </div>

                {/* Numero tappe */}
                <div className="mt-2 text-sm text-gray-500">
                  {template.stops?.length || 0} tappe
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Template */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {selectedTemplate ? (
          <TemplateEditor
            template={selectedTemplate}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ['templates'] })}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Seleziona un template per modificarlo</p>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <TemplateFormModal
          template={editingTemplate}
          onClose={handleCloseForm}
          onSuccess={() => {
            handleCloseForm();
            queryClient.invalidateQueries({ queryKey: ['templates'] });
          }}
        />
      )}
    </div>
  );
}

// Form modale per creare/modificare template
function TemplateFormModal({ template, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nome: template?.nome || '',
    descrizione: template?.descrizione || '',
    giorni_settimana: template?.giorni_settimana ? JSON.parse(template.giorni_settimana) : [],
    colore: template?.colore || COLORI_TEMPLATE[0]
  });

  const mutation = useMutation({
    mutationFn: (data) => template
      ? templatesApi.update(template.id, data)
      : templatesApi.create(data),
    onSuccess
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      giorni_settimana: JSON.stringify(formData.giorni_settimana)
    });
  };

  const toggleGiorno = (giornoId) => {
    setFormData(prev => ({
      ...prev,
      giorni_settimana: prev.giorni_settimana.includes(giornoId)
        ? prev.giorni_settimana.filter(g => g !== giornoId)
        : [...prev.giorni_settimana, giornoId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          {template ? 'Modifica Template' : 'Nuovo Template'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione
            </label>
            <textarea
              value={formData.descrizione}
              onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giorni della settimana
            </label>
            <div className="flex flex-wrap gap-2">
              {GIORNI_SETTIMANA.map((giorno) => (
                <button
                  key={giorno.id}
                  type="button"
                  onClick={() => toggleGiorno(giorno.id)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    formData.giorni_settimana.includes(giorno.id)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {giorno.nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Colore
            </label>
            <div className="flex gap-2">
              {COLORI_TEMPLATE.map((colore) => (
                <button
                  key={colore}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, colore }))}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    formData.colore === colore ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: colore }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Editor per le tappe del template
function TemplateEditor({ template, onUpdate }) {
  const [stops, setStops] = useState(template.stops || []);
  const [editingStop, setEditingStop] = useState(null);
  const [showStopForm, setShowStopForm] = useState(false);
  
  // Get map preferences from store
  const { provider: mapProvider, mapTypes } = useMapPreferencesStore();
  const mapType = mapTypes[mapProvider] || 'roadmap';

  // Use MapController for the map
  const { controller } = useMapController({
    center: { lat: 41.9028, lng: 12.4964 },
    zoom: 6
  });

  const addStopMutation = useMutation({
    mutationFn: (stopData) => templatesApi.addStop(template.id, stopData),
    onSuccess: (newStop) => {
      setStops(prev => [...prev, newStop]);
      setShowStopForm(false);
      onUpdate();
    }
  });

  const updateStopMutation = useMutation({
    mutationFn: ({ stopId, data }) => templatesApi.updateStop(template.id, stopId, data),
    onSuccess: () => {
      onUpdate();
    }
  });

  const deleteStopMutation = useMutation({
    mutationFn: (stopId) => templatesApi.deleteStop(template.id, stopId),
    onSuccess: (_, stopId) => {
      setStops(prev => prev.filter(s => s.id !== stopId));
      onUpdate();
    }
  });

  // Aggiorna stops quando cambia il template
  useEffect(() => {
    setStops(template.stops || []);
  }, [template]);

  // Update controller with route and markers when stops change
  useEffect(() => {
    if (!controller) return;

    // Clear previous data
    controller.clearRoutes();
    controller.clearMarkers();

    // Add route if we have 2+ stops
    const validStops = stops.filter(s => s.lat && s.lng).sort((a, b) => a.ordine - b.ordine);
    
    if (validStops.length >= 2) {
      const path = validStops.map(s => ({ lat: s.lat, lng: s.lng }));
      controller.addRoute(`template-${template.id}`, path, {
        color: template.colore || '#3B82F6',
        name: template.nome
      });
    }

    // Add markers for each stop
    validStops.forEach((stop, index) => {
      controller.addMarker(`stop-${stop.id || index}`, { lat: stop.lat, lng: stop.lng }, {
        title: stop.nome,
        label: String(index + 1)
      });
    });

    // Add editing marker if present
    if (editingStop?.lat && editingStop?.lng) {
      controller.addMarker('editing-stop', { lat: editingStop.lat, lng: editingStop.lng }, {
        title: editingStop.nome || 'Nuova tappa',
        label: '📍'
      });
    }

    // Fit map to show all stops
    if (validStops.length > 0) {
      const avgLat = validStops.reduce((sum, s) => sum + s.lat, 0) / validStops.length;
      const avgLng = validStops.reduce((sum, s) => sum + s.lng, 0) / validStops.length;
      controller.setCenter({ lat: avgLat, lng: avgLng });
      controller.setZoom(validStops.length > 1 ? 10 : 12);
    }
  }, [controller, stops, editingStop, template]);

  const handleAddStop = () => {
    const state = controller?.getState() || {};
    const center = state.center || { lat: 41.9028, lng: 12.4964 };
    
    setEditingStop({
      nome: '',
      indirizzo: '',
      lat: center.lat,
      lng: center.lng,
      tempo_sosta: 5,
      ordine: stops.length + 1
    });
    setShowStopForm(true);
  };

  const handleSaveStop = () => {
    if (!editingStop.nome) {
      alert('Inserisci un nome per la tappa');
      return;
    }
    
    addStopMutation.mutate(editingStop);
    setEditingStop(null);
  };

  const handleDeleteStop = (stopId) => {
    if (confirm('Eliminare questa tappa?')) {
      deleteStopMutation.mutate(stopId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: template.colore || '#3B82F6' }}
          />
          <h3 className="text-lg font-semibold">{template.nome}</h3>
        </div>
        <button
          onClick={handleAddStop}
          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
        >
          + Aggiungi Tappa
        </button>
      </div>

      {/* Mappa */}
      <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
        <MapView
          controller={controller}
          provider={mapProvider}
          mapType={mapType}
          height="100%"
          hideMapTypeControl={true}
        />
      </div>

      {/* Form nuova tappa */}
      {showStopForm && editingStop && (
        <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
          <h4 className="font-medium mb-3">Nuova Tappa</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                type="text"
                placeholder="Nome tappa"
                value={editingStop.nome}
                onChange={(e) => setEditingStop(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="col-span-2">
              <AddressAutocomplete
                value={editingStop.indirizzo}
                onChange={(indirizzo, lat, lng) => {
                  setEditingStop(prev => ({ ...prev, indirizzo, lat, lng }));
                  if (lat && lng && controller) {
                    controller.setCenter({ lat, lng });
                  }
                }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Latitudine</label>
              <input
                type="number"
                step="any"
                value={editingStop.lat || ''}
                onChange={(e) => setEditingStop(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Longitudine</label>
              <input
                type="number"
                step="any"
                value={editingStop.lng || ''}
                onChange={(e) => setEditingStop(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Tempo sosta (min)</label>
              <input
                type="number"
                value={editingStop.tempo_sosta}
                onChange={(e) => setEditingStop(prev => ({ ...prev, tempo_sosta: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setShowStopForm(false); setEditingStop(null); }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              Annulla
            </button>
            <button
              onClick={handleSaveStop}
              disabled={addStopMutation.isPending}
              className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {addStopMutation.isPending ? 'Salvataggio...' : 'Salva Tappa'}
            </button>
          </div>
        </div>
      )}

      {/* Lista tappe */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-gray-700">Tappe ({stops.length})</h4>
        {stops.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Nessuna tappa. Clicca "Aggiungi Tappa" per iniziare.</p>
        ) : (
          <div className="space-y-2">
            {stops.sort((a, b) => a.ordine - b.ordine).map((stop, index) => (
              <div
                key={stop.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="w-6 h-6 flex items-center justify-center bg-primary-600 text-white rounded-full text-xs font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{stop.nome}</p>
                  <p className="text-xs text-gray-500">{stop.indirizzo || 'Nessun indirizzo'}</p>
                  {stop.tempo_sosta > 0 && (
                    <p className="text-xs text-gray-400">⏱️ {stop.tempo_sosta} min</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteStop(stop.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente autocomplete per indirizzi
function AddressAutocomplete({ value, onChange }) {
  const [input, setInput] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const searchAddress = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/google/autocomplete?input=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data.predictions || []);
    } catch (err) {
      console.error('Autocomplete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 300);
  };

  const handleSelect = async (prediction) => {
    setInput(prediction.description);
    setSuggestions([]);
    
    // Geocode per ottenere le coordinate
    try {
      const res = await fetch(`/api/google/geocode?address=${encodeURIComponent(prediction.description)}`);
      const data = await res.json();
      if (data.results?.[0]?.geometry?.location) {
        const { lat, lng } = data.results[0].geometry.location;
        onChange(prediction.description, lat, lng);
      } else {
        onChange(prediction.description, null, null);
      }
    } catch (err) {
      console.error('Geocode error:', err);
      onChange(prediction.description, null, null);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Cerca indirizzo..."
        value={input}
        onChange={handleInputChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
      />
      {loading && (
        <div className="absolute right-3 top-2.5 text-gray-400">⏳</div>
      )}
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {suggestions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleSelect(prediction)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-100 last:border-0"
            >
              {prediction.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SEZIONE VIAGGI (CALENDARIO)
// ============================================================================

function ViaggiSection() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTripForm, setShowTripForm] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const queryClient = useQueryClient();

  // Calcola date del mese
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Aggiungi giorni vuoti per allineare al giorno della settimana
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Aggiungi i giorni del mese
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date) => {
    const today = new Date();
    return date && 
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    return date && 
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  // Query per i viaggi del mese
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const { data: monthTrips = [] } = useQuery({
    queryKey: ['trips', 'month', formatDate(startOfMonth), formatDate(endOfMonth)],
    queryFn: () => tripsApi.getAll({ 
      startDate: formatDate(startOfMonth), 
      endDate: formatDate(endOfMonth) 
    })
  });

  // Query per i viaggi del giorno selezionato
  const { data: dayTrips = [], isLoading: loadingDayTrips } = useQuery({
    queryKey: ['trips', 'day', formatDate(selectedDate)],
    queryFn: () => tripsApi.getByDate(formatDate(selectedDate))
  });

  // Conta viaggi per data
  const tripCountByDate = monthTrips.reduce((acc, trip) => {
    acc[trip.data] = (acc[trip.data] || 0) + 1;
    return acc;
  }, {});

  const days = getDaysInMonth();
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendario */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ◀️
          </button>
          <h2 className="text-lg font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ▶️
          </button>
        </div>

        {/* Intestazione giorni */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {GIORNI_SETTIMANA.map((giorno) => (
            <div key={giorno.id} className="text-center text-xs font-medium text-gray-500 py-2">
              {giorno.short}
            </div>
          ))}
        </div>

        {/* Griglia giorni */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-20" />;
            }

            const dateStr = formatDate(date);
            const tripCount = tripCountByDate[dateStr] || 0;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(date)}
                className={`h-20 p-2 rounded-lg text-left transition-colors relative ${
                  isSelected(date)
                    ? 'bg-primary-600 text-white'
                    : isToday(date)
                    ? 'bg-primary-100 text-primary-900'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-sm font-medium">{date.getDate()}</span>
                {tripCount > 0 && (
                  <div className={`absolute bottom-2 left-2 right-2 text-xs rounded px-1 ${
                    isSelected(date) ? 'bg-primary-500' : 'bg-green-100 text-green-700'
                  }`}>
                    {tripCount} viaggi
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista viaggi del giorno */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            Viaggi del {selectedDate.getDate()}/{selectedDate.getMonth() + 1}
          </h3>
          <button
            onClick={() => setShowTripForm(true)}
            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            + Nuovo
          </button>
        </div>

        {loadingDayTrips ? (
          <div className="text-center py-4 text-gray-500">Caricamento...</div>
        ) : dayTrips.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nessun viaggio programmato</p>
            <p className="text-sm">Clicca "Nuovo" per aggiungerne uno</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['trips'] })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal nuovo viaggio */}
      {showTripForm && (
        <TripFormModal
          date={selectedDate}
          onClose={() => setShowTripForm(false)}
          onSuccess={() => {
            setShowTripForm(false);
            queryClient.invalidateQueries({ queryKey: ['trips'] });
          }}
        />
      )}
    </div>
  );
}

// Card per singolo viaggio
function TripCard({ trip, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => tripsApi.delete(trip.id),
    onSuccess: onUpdate
  });

  const updateStatusMutation = useMutation({
    mutationFn: (stato) => tripsApi.update(trip.id, { stato }),
    onSuccess: onUpdate
  });

  const getStatusColor = (stato) => {
    switch (stato) {
      case 'programmato': return 'bg-yellow-100 text-yellow-700';
      case 'in_corso': return 'bg-primary-100 text-primary-700';
      case 'completato': return 'bg-green-100 text-green-700';
      case 'annullato': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (stato) => {
    switch (stato) {
      case 'programmato': return 'Programmato';
      case 'in_corso': return 'In corso';
      case 'completato': return 'Completato';
      case 'annullato': return 'Annullato';
      default: return stato;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-3 cursor-pointer hover:bg-gray-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: trip.template_colore || '#3B82F6' }}
            />
            <span className="font-medium text-sm">{trip.template_nome || 'Viaggio'}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(trip.stato)}`}>
            {getStatusLabel(trip.stato)}
          </span>
        </div>
        {trip.vehicle_plate && (
          <div className="mt-1 text-xs text-gray-500">
            🚛 {trip.vehicle_plate}
          </div>
        )}
        {trip.ora_partenza && (
          <div className="mt-1 text-xs text-gray-500">
            ⏰ {trip.ora_partenza}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex gap-2 mb-3">
            <select
              value={trip.stato}
              onChange={(e) => updateStatusMutation.mutate(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            >
              <option value="programmato">Programmato</option>
              <option value="in_corso">In corso</option>
              <option value="completato">Completato</option>
              <option value="annullato">Annullato</option>
            </select>
            <button
              onClick={() => {
                if (confirm('Eliminare questo viaggio?')) {
                  deleteMutation.mutate();
                }
              }}
              className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              Elimina
            </button>
          </div>

          {trip.stops && trip.stops.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">Tappe:</p>
              {trip.stops.map((stop, index) => (
                <div key={stop.id} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 flex items-center justify-center bg-gray-200 rounded-full text-xs">
                    {index + 1}
                  </span>
                  <span>{stop.nome}</span>
                  {stop.completato && <span className="text-green-600">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Modal per creare un nuovo viaggio
function TripFormModal({ date, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    template_id: '',
    vehicle_plate: '',
    ora_partenza: '',
    note: ''
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.getAll
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => tripsApi.create(data),
    onSuccess
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    createMutation.mutate({
      ...formData,
      data: date.toISOString().split('T')[0],
      template_id: formData.template_id ? parseInt(formData.template_id) : null
    });
  };

  const formatDate = (d) => {
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          Nuovo Viaggio - {formatDate(date)}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Tratta
            </label>
            <select
              value={formData.template_id}
              onChange={(e) => setFormData(prev => ({ ...prev, template_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Seleziona template --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Veicolo
            </label>
            <select
              value={formData.vehicle_plate}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicle_plate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Seleziona veicolo --</option>
              {vehicles.map((v) => (
                <option key={v.plate} value={v.plate}>
                  {v.plate} - {v.name || v.type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ora Partenza
            </label>
            <input
              type="time"
              value={formData.ora_partenza}
              onChange={(e) => setFormData(prev => ({ ...prev, ora_partenza: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creazione...' : 'Crea Viaggio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
