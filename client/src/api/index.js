import axios from 'axios';
import { useAuthStore } from '../store';

const API_BASE_URL = '/api';
const API_V2_BASE_URL = '/api/v2';
const AUTH_BASE_URL = '/auth';

// Axios instance con interceptor per auth
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// V2 API instance
const apiV2 = axios.create({
  baseURL: API_V2_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiV2.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

apiV2.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (username, password) => {
    const response = await axios.post(`${AUTH_BASE_URL}/login`, { username, password });
    return response.data;
  },
  
  register: async (userData) => {
    const response = await api.post(`${AUTH_BASE_URL}/register`, userData);
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get(`${AUTH_BASE_URL}/me`);
    return response.data;
  },

  getVapidKey: async () => {
    const response = await axios.get(`${AUTH_BASE_URL}/push/vapid-public-key`);
    return response.data.key;
  },

  subscribePush: async (subscription) => {
    const response = await axios.post(`${AUTH_BASE_URL}/push/subscribe`, { subscription });
    return response.data;
  },

  testPush: async () => {
    const response = await api.post(`${AUTH_BASE_URL}/push/test`);
    return response.data;
  },

  testTelegram: async (chatId) => {
    const response = await api.post(`${AUTH_BASE_URL}/telegram/test`, { chat_id: chatId });
    return response.data;
  },
};

// Flotte e Posizioni
export const positionsApi = {
  getFleets: async () => {
    const response = await api.get('/fleets');
    return response.data;
  },

  // Ottiene posizioni dalla cache locale (database)
  getAllPositions: async () => {
    const response = await api.get('/positions');
    return response.data;
  },

  // Forza aggiornamento live dall'API Record Italia
  getLivePositions: async () => {
    const response = await api.get('/positions/live');
    return response.data;
  },

  // Stato sincronizzazione
  getSyncStatus: async () => {
    const response = await api.get('/positions/sync-status');
    return response.data;
  },

  getFleetPositions: async (idFlotta) => {
    const response = await api.get(`/positions/fleet/${idFlotta}`);
    return response.data;
  },

  getServicePosition: async (idServizio) => {
    const response = await api.get(`/positions/service/${idServizio}`);
    return response.data;
  },

  getHistory: async (idServizio, from, to) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const response = await api.get(`/history/${idServizio}?${params}`);
    return response.data;
  },
};

// Veicoli
export const vehiclesApi = {
  getAll: async () => {
    const response = await api.get('/vehicles');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/vehicles/${id}`, data);
    return response.data;
  },

  getPositions: async (id, limit = 100) => {
    const response = await api.get(`/vehicles/${id}/positions?limit=${limit}`);
    return response.data;
  },
};

// Geofence
export const geofencesApi = {
  getAll: async () => {
    const response = await api.get('/geofences');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/geofences', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/geofences/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/geofences/${id}`);
    return response.data;
  },
};

// Allarmi
export const alarmsApi = {
  getAll: async () => {
    const response = await api.get('/alarms');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/alarms', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/alarms/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/alarms/${id}`);
    return response.data;
  },
};

// Eventi
export const eventsApi = {
  getAll: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.vehicle_id) searchParams.append('vehicle_id', params.vehicle_id);
    if (params.tipo) searchParams.append('tipo', params.tipo);
    const response = await api.get(`/events?${searchParams}`);
    return response.data;
  },
};

// Monitoraggio
export const monitoringApi = {
  getStatus: async () => {
    const response = await api.get('/monitoring/status');
    return response.data;
  },

  forceCheck: async () => {
    const response = await api.post('/monitoring/check');
    return response.data;
  },

  start: async () => {
    const response = await api.post('/monitoring/start');
    return response.data;
  },

  stop: async () => {
    const response = await api.post('/monitoring/stop');
    return response.data;
  },
};

// Tratte
export const routesApi = {
  getAll: async () => {
    const response = await api.get('/routes');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/routes/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/routes', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/routes/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/routes/${id}`);
    return response.data;
  },

  checkArrival: async (id, latitude, longitude) => {
    const response = await api.post(`/routes/${id}/check-arrival`, { latitude, longitude });
    return response.data;
  },

  reset: async (id) => {
    const response = await api.post(`/routes/${id}/reset`);
    return response.data;
  },

  geocode: async (query) => {
    const response = await api.get(`/geocode?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};

// Template percorsi (percorsi tipo riutilizzabili)
export const templatesApi = {
  getAll: async () => {
    const response = await api.get('/templates');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/templates', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  },

  // Gestione tappe del template
  addStop: async (templateId, stopData) => {
    const response = await api.post(`/templates/${templateId}/stops`, stopData);
    return response.data;
  },

  updateStop: async (templateId, stopId, data) => {
    const response = await api.put(`/templates/${templateId}/stops/${stopId}`, data);
    return response.data;
  },

  deleteStop: async (templateId, stopId) => {
    const response = await api.delete(`/templates/${templateId}/stops/${stopId}`);
    return response.data;
  },
};

// Viaggi (istanze concrete su calendario)
export const tripsApi = {
  getAll: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.data) searchParams.append('data', params.data);
    if (params.from) searchParams.append('from', params.from);
    if (params.to) searchParams.append('to', params.to);
    if (params.startDate) searchParams.append('from', params.startDate);
    if (params.endDate) searchParams.append('to', params.endDate);
    if (params.stato) searchParams.append('stato', params.stato);
    const response = await api.get(`/trips?${searchParams}`);
    return response.data;
  },

  getByDate: async (date) => {
    const response = await api.get(`/trips?data=${date}`);
    return response.data;
  },

  getCalendar: async (year, month) => {
    const response = await api.get(`/trips/calendar?year=${year}&month=${month}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/trips/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/trips', data);
    return response.data;
  },

  createFromTemplate: async (templateId, dates, options = {}) => {
    const response = await api.post('/trips/from-template', {
      template_id: templateId,
      dates,
      ...options
    });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/trips/${id}`, data);
    return response.data;
  },

  updateStop: async (tripId, stopId, data) => {
    const response = await api.put(`/trips/${tripId}/stops/${stopId}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/trips/${id}`);
    return response.data;
  },
};

// Google Maps API (tutte le chiamate passano dal server per sicurezza)
export const googleApi = {
  // Ottiene la API key per Google Maps JS SDK (con controllo dominio lato server)
  getMapsKey: async () => {
    const response = await api.get('/google/maps-key');
    return response.data.key;
  },

  autocomplete: async (input) => {
    const response = await api.get(`/google/autocomplete?input=${encodeURIComponent(input)}`);
    return response.data;
  },

  getPlaceDetails: async (placeId) => {
    const response = await api.get(`/google/place-details?place_id=${placeId}`);
    return response.data;
  },

  getDirections: async (origin, destination, waypoints = [], vehicle = null) => {
    const response = await api.post('/google/directions', {
      origin,
      destination,
      waypoints,
      vehicle
    });
    return response.data;
  },
};

// Tappe Predefinite (Custom Stops)
export const customStopsApi = {
  getAll: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.categoria) searchParams.append('categoria', params.categoria);
    if (params.search) searchParams.append('search', params.search);
    const response = await api.get(`/custom-stops?${searchParams}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/custom-stops', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/custom-stops/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/custom-stops/${id}`);
    return response.data;
  },
};

// Test connessione
export const testConnection = async () => {
  const response = await api.get('/test-connection');
  return response.data;
};

// ==================== V2 API (Controller-based) ====================

/**
 * V2 Positions API - Uses VehicleController for filtered data
 */
export const positionsApiV2 = {
  /**
   * Get all positions with optional filtering
   * @param {object} options - Filter options
   */
  getAll: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.showMovingOnly) params.append('showMovingOnly', 'true');
    if (options.showStoppedOnly) params.append('showStoppedOnly', 'true');
    if (options.showWithTemperature) params.append('showWithTemperature', 'true');
    if (options.excludeHidden === false) params.append('excludeHidden', 'false');
    if (options.applyCoupling === false) params.append('applyCoupling', 'false');
    if (options.searchTerm) params.append('searchTerm', options.searchTerm);
    
    const response = await apiV2.get(`/positions?${params}`);
    return response.data;
  },

  /**
   * Get positions ready for map display
   */
  getForMap: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.showMovingOnly) params.append('showMovingOnly', 'true');
    if (options.showStoppedOnly) params.append('showStoppedOnly', 'true');
    if (options.showWithTemperature) params.append('showWithTemperature', 'true');
    if (options.searchTerm) params.append('searchTerm', options.searchTerm);
    
    const response = await apiV2.get(`/positions/map?${params}`);
    return response.data;
  },

  /**
   * Get vehicle statistics
   */
  getStatistics: async () => {
    const response = await apiV2.get('/positions/statistics');
    return response.data;
  },

  /**
   * Get list of all plates
   */
  getPlates: async () => {
    const response = await apiV2.get('/positions/plates');
    return response.data;
  },

  /**
   * Get position by plate
   */
  getByPlate: async (plate) => {
    const response = await apiV2.get(`/positions/${encodeURIComponent(plate)}`);
    return response.data;
  },
};

/**
 * Coupled Pairs API
 */
export const coupledPairsApi = {
  /**
   * Get all coupled pairs
   */
  getAll: async () => {
    const response = await apiV2.get('/coupled-pairs');
    return response.data;
  },

  /**
   * Add a coupled pair
   */
  add: async (truckPlate, trailerPlate) => {
    const response = await apiV2.post('/coupled-pairs', { truckPlate, trailerPlate });
    return response.data;
  },

  /**
   * Replace all coupled pairs
   */
  setAll: async (pairs) => {
    const response = await apiV2.put('/coupled-pairs', pairs);
    return response.data;
  },

  /**
   * Remove a coupled pair
   */
  remove: async (truckPlate, trailerPlate) => {
    const response = await apiV2.delete('/coupled-pairs', { data: { truckPlate, trailerPlate } });
    return response.data;
  },
};

/**
 * Hidden Vehicles API
 */
export const hiddenVehiclesApi = {
  /**
   * Get list of hidden vehicle plates
   */
  getAll: async () => {
    const response = await apiV2.get('/hidden-vehicles');
    return response.data;
  },

  /**
   * Toggle vehicle visibility
   */
  toggle: async (plate) => {
    const response = await apiV2.post('/hidden-vehicles/toggle', { plate });
    return response.data;
  },

  /**
   * Set all hidden vehicles
   */
  setAll: async (plates) => {
    const response = await apiV2.put('/hidden-vehicles', plates);
    return response.data;
  },

  /**
   * Show all vehicles (clear hidden list)
   */
  showAll: async () => {
    const response = await apiV2.delete('/hidden-vehicles');
    return response.data;
  },
};

/**
 * V2 Geofences API
 */
export const geofencesApiV2 = {
  getAll: async (activeOnly = true) => {
    const response = await apiV2.get(`/geofences?activeOnly=${activeOnly}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiV2.post('/geofences', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiV2.put(`/geofences/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiV2.delete(`/geofences/${id}`);
    return response.data;
  },
};

/**
 * Refresh controller data
 */
export const refreshApi = {
  refresh: async () => {
    const response = await apiV2.post('/refresh');
    return response.data;
  },
};

export default api;
