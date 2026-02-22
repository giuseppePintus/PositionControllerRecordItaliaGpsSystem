import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },

      getAuthHeaders: () => {
        const { token } = get();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

/**
 * Map Preferences Store
 * 
 * Persists user's map provider and style preferences to localStorage
 */
export const useMapPreferencesStore = create(
  persist(
    (set, get) => ({
      // Provider: 'google' | 'osm' | 'mapbox'
      provider: 'google',
      
      // Map type/style per provider
      mapTypes: {
        google: 'roadmap',    // roadmap, satellite, hybrid, terrain
        osm: 'standard',      // standard, hot, topo, cartoLight, cartoDark
        mapbox: 'streets'     // streets, satellite, satelliteStreets, outdoors, light, dark, navigation
      },
      
      // Display options
      enableClustering: false,
      showTraffic: false,
      
      // Actions
      setProvider: (provider) => set({ provider }),
      
      setMapType: (provider, mapType) => set((state) => ({
        mapTypes: {
          ...state.mapTypes,
          [provider]: mapType
        }
      })),
      
      // Get current map type for active provider
      getCurrentMapType: () => {
        const { provider, mapTypes } = get();
        return mapTypes[provider] || 'roadmap';
      },
      
      setEnableClustering: (enabled) => set({ enableClustering: enabled }),
      toggleClustering: () => set((state) => ({ enableClustering: !state.enableClustering })),
      
      setShowTraffic: (enabled) => set({ showTraffic: enabled }),
      toggleTraffic: () => set((state) => ({ showTraffic: !state.showTraffic })),
    }),
    {
      name: 'map-preferences-storage',
    }
  )
);

export const useMapStore = create((set) => ({
  center: [44.0627, 12.5664], // Rimini default
  zoom: 10,
  selectedVehicle: null,
  showGeofences: true,
  showVehicles: true,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  toggleGeofences: () => set((state) => ({ showGeofences: !state.showGeofences })),
  toggleVehicles: () => set((state) => ({ showVehicles: !state.showVehicles })),
}));

export const useNotificationStore = create((set) => ({
  pushEnabled: false,
  subscription: null,

  setPushEnabled: (enabled) => set({ pushEnabled: enabled }),
  setSubscription: (subscription) => set({ subscription }),
}));
