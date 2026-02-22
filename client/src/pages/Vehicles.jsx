import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi, positionsApi } from '../api';
import { 
  Truck, Edit2, Save, X, RefreshCw, MapPin, Ruler, ArrowUpDown, Weight, 
  ChevronDown, ChevronRight, AlertTriangle, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Tipi veicolo
const TIPI_VEICOLO = [
  { value: 'trattore_semirimorchio', label: 'Trattore + Semirimorchio', defaultL: 16.5, defaultH: 4.0, defaultP: 44 },
  { value: 'autoarticolato', label: 'Autoarticolato', defaultL: 18.75, defaultH: 4.0, defaultP: 44 },
  { value: 'autocarro_rimorchio', label: 'Autocarro + Rimorchio', defaultL: 18.75, defaultH: 4.0, defaultP: 44 },
  { value: 'motrice', label: 'Motrice Sola', defaultL: 12.0, defaultH: 4.0, defaultP: 26 },
  { value: 'furgone', label: 'Furgone', defaultL: 7.0, defaultH: 3.0, defaultP: 3.5 },
];

export default function Vehicles() {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showDimensions, setShowDimensions] = useState({});
  const queryClient = useQueryClient();

  // Fetch vehicles from local DB
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.getAll,
  });

  // Fetch positions from local cache (updated by background sync)
  const { data: livePositions = [], refetch: refetchPositions } = useQuery({
    queryKey: ['positions'],
    queryFn: positionsApi.getAllPositions,
    refetchInterval: 30000, // Aggiorna dalla cache ogni 30 secondi
    staleTime: 25000, // Considera i dati freschi per 25 secondi
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => vehiclesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      toast.success('Veicolo aggiornato');
      setEditingId(null);
    },
    onError: () => toast.error('Errore aggiornamento'),
  });

  const startEditing = (vehicle) => {
    setEditingId(vehicle.id);
    setEditForm({
      nickname: vehicle.nickname || '',
      targa_camion: vehicle.targa_camion || '',
      targa_rimorchio: vehicle.targa_rimorchio || '',
      lunghezza: vehicle.lunghezza || 16.5,
      larghezza: vehicle.larghezza || 2.55,
      altezza: vehicle.altezza || 4.0,
      peso_totale: vehicle.peso_totale || 44.0,
      peso_per_asse: vehicle.peso_per_asse || 11.5,
      tipo_veicolo: vehicle.tipo_veicolo || 'trattore_semirimorchio',
      is_compatto: vehicle.is_compatto || 0,
      note_dimensioni: vehicle.note_dimensioni || '',
    });
  };

  const saveEdit = () => {
    updateMutation.mutate({ id: editingId, data: editForm });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleTipoVeicoloChange = (tipo) => {
    const tipoData = TIPI_VEICOLO.find(t => t.value === tipo);
    if (tipoData) {
      setEditForm({
        ...editForm,
        tipo_veicolo: tipo,
        lunghezza: tipoData.defaultL,
        altezza: tipoData.defaultH,
        peso_totale: tipoData.defaultP,
      });
    }
  };

  const toggleDimensions = (id) => {
    setShowDimensions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Merge local vehicles with live positions
  const mergedVehicles = vehicles.map(vehicle => {
    const liveData = livePositions.find(p => p.idServizio === vehicle.id_servizio);
    return {
      ...vehicle,
      live: liveData || null,
    };
  });

  // Also add any live positions not yet in local DB
  const unknownPositions = livePositions.filter(
    p => !vehicles.find(v => v.id_servizio === p.idServizio)
  );

  // Veicoli speciali (GT736ms motrice, XA330pl rimorchio)
  const isCompactVehicle = (vehicle) => {
    return vehicle.is_compatto === 1 || 
      ['GT736MS', 'GT736ms'].some(t => vehicle.targa_camion?.includes(t)) ||
      ['XA330PL', 'XA330pl'].some(t => vehicle.targa_rimorchio?.includes(t));
  };

  return (
    <div className="p-4 lg:p-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Veicoli</h1>
          <p className="text-gray-500">Gestisci veicoli e dimensioni per il calcolo percorsi</p>
        </div>
        <button
          onClick={() => refetchPositions()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw size={18} />
          <span className="hidden sm:inline">Aggiorna</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Registered vehicles */}
          {mergedVehicles.map((vehicle) => {
            const isEditing = editingId === vehicle.id;
            const isMoving = vehicle.live?.posizione?.speed > 3 || vehicle.live?.speed > 3;
            const isCompact = isCompactVehicle(vehicle);
            const showDims = showDimensions[vehicle.id];
            
            return (
              <div
                key={vehicle.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="text-gray-400" size={20} />
                    <span className={clsx(
                      "w-2 h-2 rounded-full",
                      vehicle.live ? (isMoving ? "bg-green-500" : "bg-red-500") : "bg-gray-300"
                    )}></span>
                    {isCompact && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Compatto
                      </span>
                    )}
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => startEditing(vehicle)}
                      className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={saveEdit}
                        className="p-1 text-green-600 hover:text-green-700"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-red-600 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Nickname</label>
                        <input
                          type="text"
                          value={editForm.nickname}
                          onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder="Nome identificativo"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 font-medium">Targa Camion</label>
                          <input
                            type="text"
                            value={editForm.targa_camion}
                            onChange={(e) => setEditForm({ ...editForm, targa_camion: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            placeholder="AA000AA"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-medium">Targa Rimorchio</label>
                          <input
                            type="text"
                            value={editForm.targa_rimorchio}
                            onChange={(e) => setEditForm({ ...editForm, targa_rimorchio: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            placeholder="BB000BB"
                          />
                        </div>
                      </div>
                      
                      {/* Dimensioni */}
                      <div className="pt-3 border-t border-gray-100">
                        <label className="text-xs text-gray-500 font-medium flex items-center gap-1 mb-2">
                          <Settings size={12} />
                          Tipo Veicolo e Dimensioni
                        </label>
                        <select
                          value={editForm.tipo_veicolo}
                          onChange={(e) => handleTipoVeicoloChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                        >
                          {TIPI_VEICOLO.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div>
                            <label className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Ruler size={10} /> Lunghezza (m)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={editForm.lunghezza}
                              onChange={(e) => setEditForm({ ...editForm, lunghezza: parseFloat(e.target.value) })}
                              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 flex items-center gap-1">
                              <ArrowUpDown size={10} /> Altezza (m)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={editForm.altezza}
                              onChange={(e) => setEditForm({ ...editForm, altezza: parseFloat(e.target.value) })}
                              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Weight size={10} /> Peso (t)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={editForm.peso_totale}
                              onChange={(e) => setEditForm({ ...editForm, peso_totale: parseFloat(e.target.value) })}
                              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-[10px] text-gray-400">Larghezza (m)</label>
                            <input
                              type="number"
                              step="0.05"
                              value={editForm.larghezza}
                              onChange={(e) => setEditForm({ ...editForm, larghezza: parseFloat(e.target.value) })}
                              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400">Peso/asse (t)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={editForm.peso_per_asse}
                              onChange={(e) => setEditForm({ ...editForm, peso_per_asse: parseFloat(e.target.value) })}
                              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>
                        
                        <label className="flex items-center gap-2 mt-3">
                          <input
                            type="checkbox"
                            checked={editForm.is_compatto === 1}
                            onChange={(e) => setEditForm({ ...editForm, is_compatto: e.target.checked ? 1 : 0 })}
                            className="rounded text-green-600"
                          />
                          <span className="text-xs text-gray-600">Veicolo compatto (meno restrizioni)</span>
                        </label>
                        
                        <div className="mt-2">
                          <label className="text-[10px] text-gray-400">Note dimensioni</label>
                          <input
                            type="text"
                            value={editForm.note_dimensioni}
                            onChange={(e) => setEditForm({ ...editForm, note_dimensioni: e.target.value })}
                            className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            placeholder="Es: sponda idraulica, frigo, ADR..."
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {vehicle.nickname || vehicle.targa_camion || `Veicolo ${vehicle.id_servizio}`}
                        </h3>
                        {vehicle.targa_camion && vehicle.nickname && (
                          <p className="text-sm text-gray-500">Targa: {vehicle.targa_camion}</p>
                        )}
                        {vehicle.targa_rimorchio && (
                          <p className="text-sm text-gray-500">Rimorchio: {vehicle.targa_rimorchio}</p>
                        )}
                      </div>

                      {/* Dimensioni collapsed */}
                      <button
                        onClick={() => toggleDimensions(vehicle.id)}
                        className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 py-1"
                      >
                        <span className="flex items-center gap-1">
                          <Ruler size={12} />
                          Dimensioni: {vehicle.lunghezza || 16.5}m × {vehicle.altezza || 4.0}m, {vehicle.peso_totale || 44}t
                        </span>
                        {showDims ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      
                      {showDims && (
                        <div className={clsx(
                          "p-2 rounded-lg text-xs",
                          isCompact ? "bg-green-50 border border-green-100" : "bg-amber-50 border border-amber-100"
                        )}>
                          <div className="grid grid-cols-2 gap-2">
                            <div>Lunghezza: {vehicle.lunghezza || 16.5}m</div>
                            <div>Larghezza: {vehicle.larghezza || 2.55}m</div>
                            <div>Altezza: {vehicle.altezza || 4.0}m</div>
                            <div>Peso totale: {vehicle.peso_totale || 44}t</div>
                          </div>
                          <div className="mt-1 text-gray-500">
                            Tipo: {TIPI_VEICOLO.find(t => t.value === vehicle.tipo_veicolo)?.label || 'Trattore + Semirimorchio'}
                          </div>
                          {!isCompact && (
                            <p className="mt-2 text-amber-600 flex items-center gap-1">
                              <AlertTriangle size={10} />
                              Verifica restrizioni: sottopassi, ponti, ZTL
                            </p>
                          )}
                          {vehicle.note_dimensioni && (
                            <p className="mt-1 text-gray-500">Note: {vehicle.note_dimensioni}</p>
                          )}
                        </div>
                      )}

                      {vehicle.live && (
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Velocità:</span>
                            <span className="font-medium">
                              {vehicle.live.posizione?.speed || vehicle.live.speed || 0} km/h
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-gray-500">Km totali:</span>
                            <span className="font-medium">
                              {(vehicle.live.km_totali || 0).toLocaleString()}
                            </span>
                          </div>
                          {vehicle.live.posizione?.message && (
                            <p className="text-xs text-gray-400 mt-2">
                              {vehicle.live.posizione.message}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {vehicle.modello && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {vehicle.modello}
                          </span>
                        )}
                        {vehicle.brand && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {vehicle.brand}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Unknown vehicles from live positions */}
          {unknownPositions.map((position) => {
            const isMoving = position.posizione?.speed > 3 || position.speed > 3;
            
            return (
              <div
                key={position.idServizio}
                className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 overflow-hidden"
              >
                <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2">
                  <Truck className="text-yellow-500" size={20} />
                  <span className="text-sm text-yellow-700">Nuovo veicolo</span>
                  <span className={clsx(
                    "w-2 h-2 rounded-full ml-auto",
                    isMoving ? "bg-green-500" : "bg-red-500"
                  )}></span>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-lg">
                    {position.nickname || position.targa || `ID: ${position.idServizio}`}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Questo veicolo verrà registrato automaticamente
                  </p>

                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Velocità:</span>
                      <span className="font-medium">
                        {position.posizione?.speed || position.speed || 0} km/h
                      </span>
                    </div>
                    {position.posizione && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <MapPin size={12} />
                        {position.posizione.latitude?.toFixed(4)}, {position.posizione.longitude?.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {mergedVehicles.length === 0 && unknownPositions.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Truck className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">Nessun veicolo trovato</p>
              <p className="text-sm text-gray-400">I veicoli appariranno automaticamente quando riceveremo dati GPS</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
