/**
 * MapSelector - UI component for selecting map provider and type
 * 
 * Allows users to switch between different map providers (Google, OSM)
 * and map types (roadmap, satellite, terrain, etc.)
 */
import React, { useState, useRef, useEffect } from 'react';
import { MAP_PROVIDER_TYPES, getAvailableProviders } from './providers';

export function MapSelector({
  currentProvider = MAP_PROVIDER_TYPES.GOOGLE,
  currentMapType = 'roadmap',
  availableMapTypes = [],
  onProviderChange,
  onMapTypeChange,
  showMapTypeSelector = true,
  position = 'top-left',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProviders, setShowProviders] = useState(false);
  const menuRef = useRef(null);

  const providers = getAvailableProviders();
  const currentProviderInfo = providers.find(p => p.id === currentProvider);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowProviders(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div 
      ref={menuRef}
      className={`absolute ${positionClasses[position]} z-10 ${className}`}
    >
      {/* Main toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white shadow-lg rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors border border-gray-200"
        title="Opzioni mappa"
      >
        <span className="text-lg">{currentProviderInfo?.icon || '🗺️'}</span>
        <span className="text-sm font-medium text-gray-700">
          {currentProviderInfo?.name || 'Mappa'}
        </span>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] overflow-hidden">
          {/* Provider selector */}
          <div className="border-b border-gray-100">
            <button
              onClick={() => setShowProviders(!showProviders)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Provider Mappa</span>
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${showProviders ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showProviders && (
              <div className="bg-gray-50 py-1">
                {providers.map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => {
                      if (onProviderChange) onProviderChange(provider.id);
                      setShowProviders(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 transition-colors ${
                      provider.id === currentProvider ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-lg">{provider.icon}</span>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${
                        provider.id === currentProvider ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {provider.name}
                      </p>
                      <p className="text-xs text-gray-500">{provider.description}</p>
                    </div>
                    {provider.id === currentProvider && (
                      <svg className="w-4 h-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map type selector */}
          {showMapTypeSelector && availableMapTypes.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tipo Mappa
              </p>
              <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                {availableMapTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => {
                      if (onMapTypeChange) onMapTypeChange(type.id);
                    }}
                    className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                      type.id === currentMapType 
                        ? 'bg-blue-100 text-blue-700 font-medium' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{type.icon || '🗺️'}</span>
                    <span>{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MapSelector;
