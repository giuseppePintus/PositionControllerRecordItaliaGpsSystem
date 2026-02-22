import * as geolib from 'geolib';

/**
 * Servizio per il geofencing - verifica se un punto è dentro una zona
 */
class GeofenceService {
  
  /**
   * Verifica se un punto è dentro un geofence (poligono o cerchio)
   * @param {Object} point - {latitude, longitude}
   * @param {Object} geofence - Oggetto geofence dal database
   * @returns {boolean}
   */
  isPointInGeofence(point, geofence) {
    const coordinates = JSON.parse(geofence.coordinate);
    
    if (geofence.tipo === 'circle') {
      // Geofence circolare
      const center = coordinates[0];
      const distance = geolib.getDistance(
        { latitude: point.latitude, longitude: point.longitude },
        { latitude: center.lat, longitude: center.lng }
      );
      return distance <= geofence.raggio_metri;
    } else {
      // Geofence poligonale
      const polygon = coordinates.map(coord => ({
        latitude: coord.lat,
        longitude: coord.lng
      }));
      return geolib.isPointInPolygon(
        { latitude: point.latitude, longitude: point.longitude },
        polygon
      );
    }
  }

  /**
   * Verifica tutti i geofence per un punto
   * @param {Object} point - {latitude, longitude}
   * @param {Array} geofences - Array di geofence
   * @returns {Array} Geofence in cui il punto si trova
   */
  checkAllGeofences(point, geofences) {
    const insideGeofences = [];
    
    for (const geofence of geofences) {
      if (geofence.attivo && this.isPointInGeofence(point, geofence)) {
        insideGeofences.push(geofence);
      }
    }
    
    return insideGeofences;
  }

  /**
   * Calcola la distanza tra due punti in metri
   * @param {Object} point1 - {latitude, longitude}
   * @param {Object} point2 - {latitude, longitude}
   * @returns {number} Distanza in metri
   */
  getDistance(point1, point2) {
    return geolib.getDistance(
      { latitude: point1.latitude, longitude: point1.longitude },
      { latitude: point2.latitude, longitude: point2.longitude }
    );
  }

  /**
   * Calcola il centro di un poligono
   * @param {Array} coordinates - Array di coordinate [{lat, lng}]
   * @returns {Object} Centro {latitude, longitude}
   */
  getPolygonCenter(coordinates) {
    const points = coordinates.map(coord => ({
      latitude: coord.lat,
      longitude: coord.lng
    }));
    return geolib.getCenter(points);
  }

  /**
   * Calcola l'area di un poligono in metri quadri
   * @param {Array} coordinates - Array di coordinate [{lat, lng}]
   * @returns {number} Area in metri quadri
   */
  getPolygonArea(coordinates) {
    const points = coordinates.map(coord => ({
      latitude: coord.lat,
      longitude: coord.lng
    }));
    return geolib.getAreaOfPolygon(points);
  }

  /**
   * Verifica se un veicolo è entrato o uscito da un geofence
   * @param {Object} previousStatus - Stato precedente {inside: boolean}
   * @param {boolean} currentlyInside - Se attualmente dentro
   * @returns {string|null} 'enter', 'exit' o null
   */
  detectTransition(previousStatus, currentlyInside) {
    if (!previousStatus) {
      return currentlyInside ? 'enter' : null;
    }
    
    if (!previousStatus.inside && currentlyInside) {
      return 'enter';
    }
    
    if (previousStatus.inside && !currentlyInside) {
      return 'exit';
    }
    
    return null;
  }

  /**
   * Crea un geofence circolare da un punto centrale
   * @param {number} lat - Latitudine centro
   * @param {number} lng - Longitudine centro
   * @param {number} radius - Raggio in metri
   * @returns {Object} Coordinate del cerchio (approssimato come poligono)
   */
  createCircleGeofence(lat, lng, radius) {
    const numPoints = 32;
    const coordinates = [];
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 360;
      const point = geolib.computeDestinationPoint(
        { latitude: lat, longitude: lng },
        radius,
        angle
      );
      coordinates.push({ lat: point.latitude, lng: point.longitude });
    }
    
    return coordinates;
  }

  /**
   * Calcola il bounding box di un geofence
   * @param {Array} coordinates - Array di coordinate [{lat, lng}]
   * @returns {Object} {minLat, maxLat, minLng, maxLng}
   */
  getBoundingBox(coordinates) {
    const points = coordinates.map(coord => ({
      latitude: coord.lat,
      longitude: coord.lng
    }));
    const bounds = geolib.getBounds(points);
    return {
      minLat: bounds.minLat,
      maxLat: bounds.maxLat,
      minLng: bounds.minLng,
      maxLng: bounds.maxLng
    };
  }

  /**
   * Verifica se il veicolo è in movimento
   * @param {number} speed - Velocità in km/h
   * @param {number} threshold - Soglia minima (default 3 km/h)
   * @returns {boolean}
   */
  isMoving(speed, threshold = 3) {
    return speed > threshold;
  }
}

export const geofenceService = new GeofenceService();
export default GeofenceService;
