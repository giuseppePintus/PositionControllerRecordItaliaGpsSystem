import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi, vehiclesApi } from '../api';
import { History, Filter, MapPin, Clock, Truck, ArrowRightCircle, ArrowLeftCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const EVENT_TYPES = {
  enter: { label: 'Ingresso', icon: ArrowRightCircle, color: 'text-green-600', bg: 'bg-green-50' },
  exit: { label: 'Uscita', icon: ArrowLeftCircle, color: 'text-red-600', bg: 'bg-red-50' },
  late: { label: 'Ritardo', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
  not_arrived: { label: 'Mancato arrivo', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  not_departed: { label: 'Mancata partenza', icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  stopped: { label: 'Fermo', icon: MapPin, color: 'text-gray-600', bg: 'bg-gray-50' },
  moving: { label: 'In movimento', icon: Truck, color: 'text-primary-600', bg: 'bg-primary-50' },
};

export default function Events() {
  const [filters, setFilters] = useState({
    vehicle_id: '',
    tipo: '',
    limit: 100,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch events
  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsApi.getAll(filters),
  });

  // Fetch vehicles for filter
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.getAll,
  });

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: it });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 lg:p-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Eventi</h1>
          <p className="text-gray-500">Storico delle notifiche e degli eventi</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            showFilters 
              ? "bg-primary-100 text-primary-700" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          <Filter size={18} />
          <span className="hidden sm:inline">Filtri</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Veicolo</label>
              <select
                value={filters.vehicle_id}
                onChange={(e) => handleFilterChange('vehicle_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tutti i veicoli</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nickname || v.targa_camion || `ID: ${v.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Tipo evento</label>
              <select
                value={filters.tipo}
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tutti i tipi</option>
                {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Limite</label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="50">Ultimi 50</option>
                <option value="100">Ultimi 100</option>
                <option value="200">Ultimi 200</option>
                <option value="500">Ultimi 500</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <History className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">Nessun evento registrato</p>
          <p className="text-sm text-gray-400">Gli eventi appariranno quando i veicoli interagiranno con i geofence</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Evento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Veicolo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Zona
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Messaggio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Ora
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((event) => {
                  const eventType = EVENT_TYPES[event.tipo] || {
                    label: event.tipo,
                    icon: History,
                    color: 'text-gray-600',
                    bg: 'bg-gray-50'
                  };
                  const Icon = eventType.icon;

                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={clsx("flex items-center gap-2 px-2 py-1 rounded-lg w-fit", eventType.bg)}>
                          <Icon size={16} className={eventType.color} />
                          <span className={clsx("text-sm font-medium", eventType.color)}>
                            {eventType.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-gray-400" />
                          <span className="text-sm font-medium">
                            {event.vehicle_name || event.targa_camion || `ID: ${event.vehicle_id}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                        {event.geofence_nome ? (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin size={14} />
                            {event.geofence_nome}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-sm text-gray-600 max-w-xs truncate">
                          {event.messaggio || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock size={14} />
                          {formatDate(event.created_at)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination info */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Visualizzando {events.length} eventi
          </div>
        </div>
      )}
    </div>
  );
}
