import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { positionsApi, geofencesApi, eventsApi, monitoringApi } from '../api';
import { useMapStore, useMapPreferencesStore } from '../store';
import MapView from '../components/MapView';
import { useMapController } from '../hooks/useMapController';
// MapProviderSelector moved to Settings page
import { 
  Truck, 
  MapPin, 
  Bell, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Navigation,
  Link2,
  Layers,
  Settings,
  Search,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Map,
  Satellite,
  Mountain,
  MapPinned,
  Car,
  Globe,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Dashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const { setCenter, setZoom } = useMapStore();
  
  // Map provider preferences from store
  const { 
    provider: mapProvider, 
    mapTypes: storedMapTypes,
    enableClustering: storedClustering,
    showTraffic: storedTraffic,
    setProvider: setMapProvider,
    setMapType: setStoredMapType,
    setEnableClustering: setStoredClustering,
    setShowTraffic: setStoredTraffic
  } = useMapPreferencesStore();
  
  // Get current map type for active provider
  const mapType = storedMapTypes[mapProvider] || 'roadmap';
  

  
  // Sidebar collassata
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Filtri mappa
  const [enableCoupling, setEnableCoupling] = useState(false);
  const [showCouplingModal, setShowCouplingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Veicoli nascosti (salvati in localStorage)
  const [hiddenVehicles, setHiddenVehicles] = useState(() => {
    const saved = localStorage.getItem('hiddenVehicles');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Coppie trattore-rimorchio (salvate in localStorage)
  const [coupledPairs, setCoupledPairs] = useState(() => {
    const saved = localStorage.getItem('coupledPairs');
    return saved ? JSON.parse(saved) : [];
  });
  
  // ========== MAP CONTROLLER ==========
  // Use the MapController to manage all map state and drawables
  const { 
    controller: mapController,
    updateVehicles,
    updateGeofences,
    focusOnVehicle,
    setProvider: setControllerProvider,
    toggleClustering: controllerToggleClustering,
    toggleTraffic: controllerToggleTraffic,
    state: mapState
  } = useMapController({
    initialProvider: mapType,
    enableCoupling,
    coupledPairs,
    hiddenVehicles,
    onVehicleSelect: (id, drawable) => {
      if (drawable?.data) {
        setSelectedVehicle(drawable.data);
      }
    }
  });
  
  // Get display options from store (persisted)
  const enableClustering = storedClustering;
  const showTraffic = storedTraffic;
  
  // Sync controller with store preferences - use direct setClustering/setTraffic
  useEffect(() => {
    if (mapController) {
      mapController.setClustering(storedClustering);
    }
  }, [storedClustering, mapController]);
  
  useEffect(() => {
    if (mapController) {
      mapController.setTraffic(storedTraffic);
    }
  }, [storedTraffic, mapController]);
  
  // Sync provider with controller when store provider changes
  useEffect(() => {
    if (mapController && mapProvider) {
      setControllerProvider(mapProvider);
    }
  }, [mapProvider, mapController, setControllerProvider]);

  // Salva in localStorage
  useEffect(() => {
    localStorage.setItem('coupledPairs', JSON.stringify(coupledPairs));
  }, [coupledPairs]);
  
  useEffect(() => {
    localStorage.setItem('hiddenVehicles', JSON.stringify(hiddenVehicles));
  }, [hiddenVehicles]);

  // Fetch positions - aggiornamento ogni 30 secondi dalla cache locale
  const { data: positions = [], isLoading: positionsLoading, refetch: refetchPositions } = useQuery({
    queryKey: ['positions'],
    queryFn: positionsApi.getAllPositions,
    refetchInterval: 30000, // Aggiorna dalla cache ogni 30 secondi
    staleTime: 25000, // Considera i dati freschi per 25 secondi
  });

  // Fetch geofences
  const { data: geofences = [] } = useQuery({
    queryKey: ['geofences'],
    queryFn: geofencesApi.getAll,
  });

  // Fetch recent events
  const { data: events = [] } = useQuery({
    queryKey: ['events', { limit: 10 }],
    queryFn: () => eventsApi.getAll({ limit: 10 }),
    refetchInterval: 30000,
  });

  // Fetch monitoring status
  const { data: monitoringStatus } = useQuery({
    queryKey: ['monitoring-status'],
    queryFn: monitoringApi.getStatus,
    refetchInterval: 60000,
  });
  
  // ========== UPDATE CONTROLLER WITH DATA ==========
  // When positions change, update the controller
  useEffect(() => {
    if (positions && positions.length > 0) {
      updateVehicles(positions);
    }
  }, [positions, updateVehicles]);
  
  // When geofences change, update the controller
  useEffect(() => {
    if (geofences) {
      updateGeofences(geofences);
    }
  }, [geofences, updateGeofences]);

  const handleRefresh = async () => {
    try {
      await monitoringApi.forceCheck();
      await refetchPositions();
      toast.success('Posizioni aggiornate');
    } catch (error) {
      toast.error('Errore aggiornamento');
    }
  };

  const handleVehicleClick = (vehicle) => {
    setSelectedVehicle(vehicle);
    const lat = vehicle.posizione?.latitude || vehicle.latitude;
    const lng = vehicle.posizione?.longitude || vehicle.longitude;
    if (lat && lng) {
      // Use controller to focus on vehicle
      const vehicleId = vehicle.idServizio || vehicle.id;
      focusOnVehicle(vehicleId, 15);
    }
  };

  // Helper per normalizzare targhe
  const normalizePlate = (plate) => (plate || '').toUpperCase().replace(/\*+$/, '');
  
  // Toglie duplicati e filtra veicoli nascosti
  const processedPositions = useMemo(() => {
    const seenPlates = new Set();
    const result = [];
    
    positions.forEach(v => {
      const plate = normalizePlate(v.targa || v.targa_camion || '');
      if (!plate || seenPlates.has(plate)) return;
      seenPlates.add(plate);
      
      // Non nascondere in lista ma per mappa
      result.push({
        ...v,
        _plate: plate,
        _hidden: hiddenVehicles.includes(plate),
        _hasPosition: !!(v.posizione?.latitude || v.latitude)
      });
    });
    
    return result;
  }, [positions, hiddenVehicles]);
  
  // Veicoli visibili per la mappa (non nascosti, con posizione)
  const visibleForMap = useMemo(() => {
    // Se accoppiamento attivo, considera la logica coppia
    if (enableCoupling) {
      const visiblePlates = new Set(
        processedPositions.filter(v => !v._hidden && v._hasPosition).map(v => v._plate)
      );
      
      // Per ogni coppia, se uno è nascosto usa l'altro
      return processedPositions.filter(v => {
        if (!v._hasPosition) return false;
        
        const pair = coupledPairs.find(p => 
          normalizePlate(p.truckPlate) === v._plate || normalizePlate(p.trailerPlate) === v._plate
        );
        
        if (pair) {
          const truckPlate = normalizePlate(pair.truckPlate);
          const trailerPlate = normalizePlate(pair.trailerPlate);
          const isHiddenTruck = hiddenVehicles.includes(truckPlate);
          const isHiddenTrailer = hiddenVehicles.includes(trailerPlate);
          
          // Se entrambi nascosti, non mostrare
          if (isHiddenTruck && isHiddenTrailer) return false;
          // Se questo è nascosto ma l'altro no, non duplicare
          if (v._hidden) return false;
        }
        
        return !v._hidden;
      });
    }
    
    return processedPositions.filter(v => !v._hidden && v._hasPosition);
  }, [processedPositions, enableCoupling, coupledPairs, hiddenVehicles]);
  
  // Filtra lista per ricerca
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return processedPositions;
    return processedPositions.filter(v => 
      v._plate.toLowerCase().includes(q) ||
      (v.nickname || '').toLowerCase().includes(q)
    );
  }, [processedPositions, searchQuery]);
  
  // Toggle visibilità veicolo
  const toggleVehicleVisibility = (plate) => {
    setHiddenVehicles(prev => 
      prev.includes(plate) 
        ? prev.filter(p => p !== plate)
        : [...prev, plate]
    );
  };

  // Statistiche corrette
  const stats = useMemo(() => {
    const uniqueVehicles = processedPositions;
    const withPosition = uniqueVehicles.filter(v => v._hasPosition);
    const withoutPosition = uniqueVehicles.filter(v => !v._hasPosition);
    const moving = withPosition.filter(v => (v.posizione?.speed || v.speed || 0) > 3);
    const stopped = withPosition.filter(v => (v.posizione?.speed || v.speed || 0) <= 3);
    
    // Per mappa: considera coppie come 1
    let mapCount = visibleForMap.length;
    if (enableCoupling) {
      const coupledCount = coupledPairs.filter(pair => {
        const truck = visibleForMap.find(v => v._plate === normalizePlate(pair.truckPlate));
        const trailer = visibleForMap.find(v => v._plate === normalizePlate(pair.trailerPlate));
        return truck && trailer;
      }).length;
      mapCount = visibleForMap.length - coupledCount;
    }
    
    return {
      total: uniqueVehicles.length,
      mapVisible: mapCount,
      moving: moving.length,
      stopped: stopped.length,
      noPosition: withoutPosition.length,
      hidden: hiddenVehicles.length
    };
  }, [processedPositions, visibleForMap, enableCoupling, coupledPairs, hiddenVehicles]);

  return (
    <div className="h-screen flex flex-col lg:flex-row pb-16 lg:pb-0">
      {/* Sidebar */}
      <div className={clsx(
        "bg-white border-b lg:border-r lg:border-b-0 border-gray-200 flex-shrink-0 flex flex-col transition-all duration-300 relative",
        sidebarCollapsed ? "lg:w-0 lg:overflow-hidden" : "w-full lg:w-80"
      )}>
        {/* Toggle button - visibile solo su desktop */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-white border border-gray-300 rounded-r-lg items-center justify-center shadow-md hover:bg-gray-50"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        
        {/* Stats */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Dashboard</h2>
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Aggiorna posizioni"
            >
              <RefreshCw size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-primary-50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-primary-600">
                <Truck size={14} />
                <span className="text-xs">Totale</span>
              </div>
              <p className="text-xl font-bold text-primary-700">{stats.total}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-green-600">
                <Navigation size={14} />
                <span className="text-xs">In moto</span>
              </div>
              <p className="text-xl font-bold text-green-700">{stats.moving}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-red-600">
                <AlertTriangle size={14} />
                <span className="text-xs">Fermi</span>
              </div>
              <p className="text-xl font-bold text-red-700">{stats.stopped}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-purple-600">
                <MapPin size={14} />
                <span className="text-xs">Mappa</span>
              </div>
              <p className="text-xl font-bold text-purple-700">{stats.mapVisible}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-orange-600">
                <AlertTriangle size={14} />
                <span className="text-xs">No GPS</span>
              </div>
              <p className="text-xl font-bold text-orange-700">{stats.noPosition}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-gray-600">
                <EyeOff size={14} />
                <span className="text-xs">Nascosti</span>
              </div>
              <p className="text-xl font-bold text-gray-700">{stats.hidden}</p>
            </div>
          </div>

          {/* Monitoring Status */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity size={16} className={monitoringStatus?.running ? 'text-green-500' : 'text-red-500'} />
              <span className="text-sm text-gray-600">
                Monitoraggio: {monitoringStatus?.running ? 'Attivo' : 'Fermo'}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header e Ricerca - FISSI */}
          <div className="p-4 pb-2 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Veicoli</h3>
              <span className="text-xs text-gray-400">{filteredList.length} trovati</span>
            </div>
            
            {/* Barra di ricerca FISSA */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca targa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          {/* Lista veicoli SCORREVOLE */}
          <div className="flex-1 overflow-y-auto p-4 pt-2">
            {positionsLoading ? (
              <div className="flex justify-center py-8">
                <div className="spinner"></div>
              </div>
            ) : filteredList.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {searchQuery ? 'Nessun veicolo corrisponde alla ricerca' : 'Nessun veicolo trovato'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredList.map((vehicle) => {
                  const speed = vehicle.posizione?.speed || vehicle.speed || 0;
                  const isMoving = speed > 3;
                  const isSelected = selectedVehicle?.idServizio === vehicle.idServizio;
                  const hasPosition = vehicle._hasPosition;
                  const isHidden = vehicle._hidden;
                  
                  return (
                    <div
                      key={vehicle.idServizio}
                      className={clsx(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        isSelected 
                          ? "border-primary-500 bg-primary-50" 
                          : isHidden
                          ? "border-gray-200 bg-gray-100 opacity-60"
                          : !hasPosition
                          ? "border-orange-300 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => hasPosition && handleVehicleClick(vehicle)}
                          disabled={!hasPosition}
                          className="flex-1 text-left flex items-center gap-2"
                        >
                          <span className={clsx(
                            "w-2 h-2 rounded-full",
                            !hasPosition ? "bg-orange-500" : isMoving ? "bg-green-500" : "bg-red-500"
                          )}></span>
                          <span className={clsx("font-medium truncate", isHidden && "line-through")}>
                            {vehicle._plate || vehicle.nickname || `ID: ${vehicle.idServizio}`}
                          </span>
                        </button>
                        <div className="flex items-center gap-2">
                          {hasPosition && (
                            <span className="text-sm text-gray-500">{speed} km/h</span>
                          )}
                          <button
                            onClick={() => toggleVehicleVisibility(vehicle._plate)}
                            className={clsx(
                              "p-1 rounded transition-colors",
                              isHidden ? "text-gray-400 hover:text-gray-600" : "text-green-500 hover:text-red-500"
                            )}
                            title={isHidden ? "Mostra sulla mappa" : "Nascondi dalla mappa"}
                          >
                            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      {!hasPosition ? (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ Nessuna posizione GPS disponibile
                        </p>
                      ) : vehicle.posizione?.message ? (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {vehicle.posizione.message}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="border-t border-gray-200 p-4 max-h-48 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            <Bell size={14} className="inline mr-1" />
            Eventi Recenti
          </h3>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">Nessun evento</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 5).map((event) => (
                <div 
                  key={event.id}
                  className={clsx(
                    "text-sm p-2 rounded",
                    event.tipo === 'enter' && "geofence-enter",
                    event.tipo === 'exit' && "geofence-exit",
                    !['enter', 'exit'].includes(event.tipo) && "bg-gray-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{event.vehicle_name || `Veicolo ${event.vehicle_id}`}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{event.messaggio}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 flex flex-col">
        {/* Map Toolbar Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-wrap">
          {/* Coupling & Clustering Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEnableCoupling(!enableCoupling)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                enableCoupling 
                  ? "bg-purple-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
              title="Mostra coppie trattore-rimorchio come icona unica"
            >
              <Link2 size={16} />
              <span className="hidden sm:inline">Accoppia</span>
            </button>
            
            <button
              onClick={() => setStoredClustering(!enableClustering)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                enableClustering 
                  ? "bg-primary-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
              title="Raggruppa mezzi sovrapposti"
            >
              <Layers size={16} />
              <span className="hidden sm:inline">Raggruppa</span>
            </button>
            
            <button
              onClick={() => setShowCouplingModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              title="Configura coppie trattore-rimorchio"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Config</span>
              {coupledPairs.length > 0 && (
                <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {coupledPairs.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-gray-300" />
          
          {/* Map Type Selector - Only show for Google Maps */}
          {mapProvider === 'google' && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setStoredMapType('google', 'roadmap')}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
                  mapType === 'roadmap' 
                    ? "bg-white text-primary-600 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                )}
                title="Mappa stradale"
              >
                <Map size={14} />
                <span className="hidden md:inline">Mappa</span>
              </button>
              <button
                onClick={() => setStoredMapType('google', 'satellite')}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
                  mapType === 'satellite' 
                    ? "bg-white text-primary-600 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                )}
                title="Satellite"
              >
                <Satellite size={14} />
                <span className="hidden md:inline">Satellite</span>
              </button>
              <button
                onClick={() => setStoredMapType('google', 'hybrid')}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
                  mapType === 'hybrid' 
                    ? "bg-white text-primary-600 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                )}
                title="Ibrido"
              >
                <MapPinned size={14} />
                <span className="hidden md:inline">Ibrido</span>
              </button>
              <button
                onClick={() => setStoredMapType('google', 'terrain')}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
                  mapType === 'terrain' 
                    ? "bg-white text-primary-600 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                )}
                title="Terreno"
              >
                <Mountain size={14} />
                <span className="hidden md:inline">Terreno</span>
              </button>
            </div>
          )}
          
          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-gray-300" />
          
          {/* Traffic Toggle - Only for Google Maps */}
          {mapProvider === 'google' && (
            <button
              onClick={() => setStoredTraffic(!showTraffic)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                showTraffic 
                  ? "bg-orange-500 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
              title="Mostra traffico stradale"
            >
              <Car size={16} />
              <span className="hidden sm:inline">Traffico</span>
            </button>
          )}
          
          {/* Vehicle Count Badge */}
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Truck size={14} className="text-primary-600" />
              <span className="font-medium">{stats.mapVisible}</span>
              <span className="hidden sm:inline">veicoli visibili</span>
            </span>
          </div>
        </div>
        
        {/* Map Container */}
        <div className="flex-1 relative">
          <MapView
            controller={mapController}
            provider={mapProvider}
            mapType={mapType}
            height="100%"
          />
        </div>
      </div>
      

      
      {/* Modal configurazione coppie */}
      {showCouplingModal && (
        <CouplingConfigModal
          pairs={coupledPairs}
          setPairs={setCoupledPairs}
          vehicles={positions}
          onClose={() => setShowCouplingModal(false)}
        />
      )}
    </div>
  );
}

// Funzione per determinare il tipo di veicolo (stessa logica di Map.jsx)
function getVehicleType(vehicle) {
  const tipologia = (vehicle.tipologia?.tipologia || '').toLowerCase();
  const modello = (vehicle.modello || '').toLowerCase();
  const targa = (vehicle.targa || vehicle.targa_camion || '').toUpperCase();
  
  if (tipologia.includes('rimorchio') || 
      tipologia.includes('semirimorchio') || 
      tipologia.includes('trailer') ||
      tipologia.includes('cisterna') ||
      tipologia.includes('frigo') ||
      tipologia.includes('centinato') ||
      tipologia.includes('pianale')) {
    return 'trailer';
  }
  
  if (tipologia.includes('trattore') || 
      tipologia.includes('motrice') || 
      tipologia.includes('stradale') ||
      modello.includes('fh') ||
      modello.includes('actros') ||
      modello.includes('stralis') ||
      modello.includes('tgx') ||
      modello.includes('xf')) {
    return 'truck';
  }
  
  if (targa.endsWith('*')) {
    return 'trailer';
  }
  
  return 'truck';
}

// Modal per configurare le coppie trattore-rimorchio
function CouplingConfigModal({ pairs, setPairs, vehicles, onClose }) {
  const [newTruck, setNewTruck] = useState('');
  const [newTrailer, setNewTrailer] = useState('');

  // Funzione per normalizzare targa (rimuove asterischi)
  const normalizePlate = (plate) => (plate || '').toUpperCase().replace(/\*+$/, '');
  
  // Separa trattori e rimorchi - rimuovi duplicati per targa normalizzata
  const seenPlates = new Set();
  const trucksRaw = vehicles.filter(v => getVehicleType(v) === 'truck').map(v => ({
    plate: normalizePlate(v.targa || v.targa_camion || ''),
    name: normalizePlate(v.nickname || v.targa || v.targa_camion || ''),
    model: v.modello || ''
  })).filter(v => {
    if (!v.plate || seenPlates.has(v.plate)) return false;
    seenPlates.add(v.plate);
    return true;
  });
  
  const seenPlates2 = new Set();
  const trailersRaw = vehicles.filter(v => getVehicleType(v) === 'trailer').map(v => ({
    plate: normalizePlate(v.targa || v.targa_camion || ''),
    name: normalizePlate(v.nickname || v.targa || v.targa_camion || ''),
    model: v.tipologia?.tipologia || ''
  })).filter(v => {
    if (!v.plate || seenPlates2.has(v.plate)) return false;
    seenPlates2.add(v.plate);
    return true;
  });
  
  const trucks = trucksRaw;
  const trailers = trailersRaw;

  // Targhe già usate nelle coppie (normalizzate)
  const usedTruckPlates = new Set(pairs.map(p => normalizePlate(p.truckPlate)));
  const usedTrailerPlates = new Set(pairs.map(p => normalizePlate(p.trailerPlate)));
  
  const addPair = () => {
    if (newTruck && newTrailer && newTruck !== newTrailer) {
      setPairs([...pairs, { truckPlate: normalizePlate(newTruck), trailerPlate: normalizePlate(newTrailer) }]);
      setNewTruck('');
      setNewTrailer('');
      toast.success('Coppia aggiunta');
    } else {
      toast.error('Seleziona targhe valide');
    }
  };

  const removePair = (index) => {
    const newPairs = [...pairs];
    newPairs.splice(index, 1);
    setPairs(newPairs);
    toast.success('Coppia rimossa');
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold">⚙️ Configura Coppie Trattore-Rimorchio</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-2xl p-1 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* Statistiche */}
          <div className="flex gap-4 text-sm">
            <div className="flex-1 bg-primary-50 rounded-lg p-2 text-center">
              <div className="text-primary-600 font-bold text-lg">{trucks.length}</div>
              <div className="text-primary-500 text-xs">🚛 Trattori</div>
            </div>
            <div className="flex-1 bg-secondary-50 rounded-lg p-2 text-center">
              <div className="text-secondary-600 font-bold text-lg">{trailers.length}</div>
              <div className="text-secondary-500 text-xs">📦 Rimorchi</div>
            </div>
          </div>
          
          {/* Form nuova coppia */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-3">
            <p className="text-sm font-medium text-gray-700">Aggiungi nuova coppia:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 font-medium">🚛 Trattore</label>
                <select
                  value={newTruck}
                  onChange={(e) => setNewTruck(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="">Seleziona trattore...</option>
                  {trucks
                    .filter(t => !usedTruckPlates.has(t.plate))
                    .map(t => (
                      <option key={t.plate} value={t.plate}>
                        {t.plate} {t.model ? `(${t.model})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">📦 Rimorchio</label>
                <select
                  value={newTrailer}
                  onChange={(e) => setNewTrailer(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="">Seleziona rimorchio...</option>
                  {trailers
                    .filter(t => !usedTrailerPlates.has(t.plate))
                    .map(t => (
                      <option key={t.plate} value={t.plate}>
                        {t.plate} {t.model ? `(${t.model})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <button
              onClick={addPair}
              disabled={!newTruck || !newTrailer}
              className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Aggiungi Coppia
            </button>
          </div>
          
          {/* Lista coppie esistenti */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Coppie configurate ({pairs.length}):
            </p>
            {pairs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Nessuna coppia configurata.<br/>
                Le coppie permettono di visualizzare trattore e rimorchio come un'unica icona quando agganciati.
              </p>
            ) : (
              <div className="space-y-2">
                {pairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">🚛 {pair.truckPlate}</span>
                      <span className="text-gray-400">↔</span>
                      <span className="font-medium">📦 {pair.trailerPlate}</span>
                    </div>
                    <button
                      onClick={() => removePair(idx)}
                      className="text-red-500 hover:text-red-700 text-sm px-2"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">
            💡 Quando attivi "Accoppia", le coppie configurate verranno mostrate come un'unica icona
            se i due mezzi sono a meno di 150 metri di distanza (agganciati).
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
