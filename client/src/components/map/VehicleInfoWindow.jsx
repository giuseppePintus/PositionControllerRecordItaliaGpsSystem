/**
 * VehicleInfoWindow - Component for displaying vehicle information
 * 
 * Shows detailed vehicle information in a popup overlay.
 */
import React from 'react';
import { determineVehicleType, VEHICLE_TYPES } from './drawables/VehicleDrawable';

export function VehicleInfoWindow({ vehicle, onClose }) {
  if (!vehicle) return null;

  const lat = vehicle.posizione?.latitude || vehicle.latitude;
  const lng = vehicle.posizione?.longitude || vehicle.longitude;
  
  if (!lat || !lng) return null;

  const rawSpeed = vehicle.posizione?.speed ?? vehicle.speed ?? 0;
  const speed = typeof rawSpeed === 'number' ? rawSpeed : parseFloat(rawSpeed) || 0;
  const isMoving = speed > 3;
  const isCoupled = vehicle._coupled;
  const vehicleType = vehicle._type || determineVehicleType(vehicle);
  const plate = (vehicle._plate || vehicle.targa || vehicle.targa_camion || '').replace(/\*+$/, '');

  if (!plate && !vehicle.nickname && !vehicle.idServizio) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 max-w-sm">
      <div className="bg-white rounded-lg shadow-xl p-4 min-w-[280px] max-w-[360px] relative border border-gray-200">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute -top-2 -right-2 w-7 h-7 bg-gray-800 hover:bg-gray-700 text-white rounded-full flex items-center justify-center text-sm font-bold z-10 shadow-md transition-colors"
        >
          ✕
        </button>
        
        {/* Header */}
        {isCoupled ? (
          <>
            <h3 className="font-semibold text-lg text-purple-700">🔗 Coppia Agganciata</h3>
            <div className="flex gap-4 mt-1">
              <p className="text-sm font-medium">🚛 {vehicle._truckPlate}</p>
              <p className="text-sm font-medium">📦 {vehicle._trailerPlate}</p>
            </div>
          </>
        ) : (
          <h3 className="font-semibold text-lg">
            {vehicleType === VEHICLE_TYPES.TRAILER ? '📦' : '🚛'} {vehicle.nickname || plate || `Veicolo ${vehicle.idServizio}`}
          </h3>
        )}
        
        {/* Temperature */}
        {vehicle._hasTemperature && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-blue-700">🌡️ Temperature</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                vehicle._frigoOn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {vehicle._frigoOn ? '❄️ Frigo ON' : '⚠️ Frigo OFF'}
              </span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="font-bold text-blue-800">
                S1: {vehicle._temperature1?.toFixed(1) ?? '--'}°C
              </span>
              <span className="font-bold text-blue-800">
                S2: {vehicle._temperature2?.toFixed(1) ?? '--'}°C
              </span>
            </div>
          </div>
        )}
        
        {/* Door sensor */}
        {vehicle._hasDoorSensor && (
          <div className={`mt-2 p-2 rounded-lg ${
            vehicle._doorOpen ? 'bg-orange-50' : 'bg-green-50'
          }`}>
            <span className={`text-sm font-medium ${
              vehicle._doorOpen ? 'text-orange-700' : 'text-green-700'
            }`}>
              {vehicle._doorOpen ? '🚪 Porte APERTE ⚠️' : '🔒 Porte Chiuse ✓'}
            </span>
          </div>
        )}
        
        {/* Status info */}
        <div className="mt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isMoving ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isMoving ? 'In movimento' : 'Fermo'} - {speed} km/h
          </p>
          
          {vehicle.posizione?.heading > 0 && (
            <p className="text-gray-600">🧭 Direzione: {vehicle.posizione.heading}°</p>
          )}
          
          {vehicle.km_totali > 0 && (
            <p>📏 Km: {Math.round(vehicle.km_totali).toLocaleString()}</p>
          )}
          
          {vehicle.modello && <p>🚗 Modello: {vehicle.modello}</p>}
          {vehicle.brand && <p>🏭 Marca: {vehicle.brand}</p>}
          
          {vehicle.posizione?.address?.F && (
            <p className="text-xs text-gray-500 mt-2">
              📍 {vehicle.posizione.address.F}
            </p>
          )}
          
          {vehicle.posizione?.fixGps && (
            <p className="text-xs text-gray-400">
              🕐 Aggiornato: {new Date(vehicle.posizione.fixGps).toLocaleString('it-IT')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VehicleInfoWindow;
