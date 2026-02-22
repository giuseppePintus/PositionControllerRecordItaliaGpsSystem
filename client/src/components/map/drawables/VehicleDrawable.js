/**
 * VehicleDrawable - Drawable class for vehicles on the map
 * 
 * Handles rendering of trucks, trailers, and coupled vehicles with
 * appropriate icons, colors, and status indicators.
 */
import { BaseDrawable } from './BaseDrawable';

// ============================================
// ICON CONFIGURATION - Centralized settings
// ============================================
export const ICON_CONFIG = {
  // Circle dimensions
  circleSize: 44,
  borderWidth: 3,
  selectedBorderWidth: 4,
  
  // Plate label settings
  plateFontSize: 11,
  plateFontWeight: 800,
  platePadding: 20,
  plateHeight: 22,
  plateMinWidth: 60,
  plateCharWidth: 9,
  plateBorderRadius: 5,
  
  // Direction arrow
  arrowSize: { width: 16, height: 22 },
  arrowColor: '#fde047',
  arrowStroke: '#000000',
  arrowStrokeWidth: 1.5,
  
  // Glow effect
  glowRadius: 6,
  glowOpacity: 0.5,
  glowBlur: 3,
  
  // Icon inside circle
  innerIconSize: 20,
  
  // Spacing
  totalHeightWithPlate: 60,
  totalHeightWithArrow: 80,
};

// Vehicle icon colors based on state - BRIGHT for visibility
export const VEHICLE_COLORS = {
  selected: { fill: '#2563eb', stroke: '#ffffff', glow: '#60a5fa' },    // Bright blue
  coupled: { fill: '#7c3aed', stroke: '#000000', glow: '#a78bfa' },      // Vivid purple
  moving: { fill: '#16a34a', stroke: '#000000', glow: '#4ade80' },       // Bright green
  frigoOn: { fill: '#ca8a04', stroke: '#000000', glow: '#fbbf24' },      // Amber
  stopped: { fill: '#dc2626', stroke: '#000000', glow: '#f87171' },      // Bright red
};

// Vehicle types
export const VEHICLE_TYPES = {
  TRUCK: 'truck',
  TRAILER: 'trailer',
  COUPLED: 'coupled',
};

/**
 * Determine vehicle type from vehicle data
 * @param {object} vehicle - Vehicle data object
 * @returns {string} Vehicle type
 */
export function determineVehicleType(vehicle) {
  const tipologia = (vehicle.tipologia?.tipologia || vehicle.tipologia || '').toLowerCase();
  const modello = (vehicle.modello || '').toLowerCase();
  const targa = (vehicle.targa || vehicle.targa_camion || '').toUpperCase();
  
  if (tipologia.includes('rimorchio') || 
      tipologia.includes('semirimorchio') || 
      tipologia.includes('trailer') ||
      tipologia.includes('cisterna') ||
      tipologia.includes('frigo') ||
      tipologia.includes('centinato') ||
      tipologia.includes('pianale')) {
    return VEHICLE_TYPES.TRAILER;
  }
  
  if (tipologia.includes('trattore') || 
      tipologia.includes('motrice') || 
      tipologia.includes('stradale') ||
      modello.includes('fh') ||
      modello.includes('actros') ||
      modello.includes('stralis') ||
      modello.includes('tgx') ||
      modello.includes('xf')) {
    return VEHICLE_TYPES.TRUCK;
  }
  
  if (targa.endsWith('*')) {
    return VEHICLE_TYPES.TRAILER;
  }
  
  return VEHICLE_TYPES.TRUCK;
}

export class VehicleDrawable extends BaseDrawable {
  constructor(options = {}) {
    super(options);
    
    // Vehicle-specific properties
    this.plate = options.plate || '';
    this.vehicleType = options.vehicleType || VEHICLE_TYPES.TRUCK;
    this.heading = options.heading || 0;
    this.speed = options.speed || 0;
    this.isMoving = options.isMoving !== undefined ? options.isMoving : (this.speed > 3);
    this.isSelected = options.isSelected || false;
    this.isCoupled = options.isCoupled || false;
    this.frigoOn = options.frigoOn || false;
    this.doorOpen = options.doorOpen || false;
    
    // Temperature data
    this.hasTemperature = options.hasTemperature || false;
    this.temperature1 = options.temperature1;
    this.temperature2 = options.temperature2;
    
    // Coupled vehicle data
    this.truckPlate = options.truckPlate || '';
    this.trailerPlate = options.trailerPlate || '';
    this.truckData = options.truckData || null;
    this.trailerData = options.trailerData || null;
    
    // Additional info
    this.nickname = options.nickname || '';
    this.brand = options.brand || '';
    this.modello = options.modello || '';
    this.kmTotali = options.kmTotali || 0;
    this.lastUpdate = options.lastUpdate || null;
    this.address = options.address || '';
  }

  getType() {
    return 'vehicle';
  }

  /**
   * Get the color configuration based on vehicle state
   * @returns {object} Color config { fill, stroke, glow }
   */
  getColorConfig() {
    if (this.isSelected) return VEHICLE_COLORS.selected;
    if (this.isCoupled) return VEHICLE_COLORS.coupled;
    if (this.isMoving) return VEHICLE_COLORS.moving;
    if (this.frigoOn) return VEHICLE_COLORS.frigoOn;
    return VEHICLE_COLORS.stopped;
  }

  /**
   * Get the circle fill color based on vehicle state
   * @returns {string} Hex color code
   */
  getCircleColor() {
    return this.getColorConfig().fill;
  }

  /**
   * Get the border color based on selection state
   * @returns {string} Hex color code
   */
  getBorderColor() {
    return this.getColorConfig().stroke;
  }
  
  /**
   * Get the glow color for the vehicle
   * @returns {string} Hex color code
   */
  getGlowColor() {
    return this.getColorConfig().glow;
  }

  /**
   * Generate SVG icon string for this vehicle (provider-independent)
   * @returns {object} { svg, width, height, anchorX, anchorY }
   */
  getSvg() {
    const colors = this.getColorConfig();
    const { circleSize, borderWidth, selectedBorderWidth } = ICON_CONFIG;
    const actualBorderWidth = this.isSelected ? selectedBorderWidth : borderWidth;
    
    // Calculate plate label dimensions using config
    const { platePadding, plateCharWidth, plateMinWidth, plateHeight, plateBorderRadius, plateFontSize, plateFontWeight } = ICON_CONFIG;
    const plateWidth = this.plate ? Math.max(this.plate.length * plateCharWidth + platePadding, plateMinWidth) : 0;
    const totalWidth = Math.max(circleSize + 24, plateWidth + 12);
    const totalHeight = circleSize + ICON_CONFIG.totalHeightWithPlate;

    // Unique ID for this icon's filter
    const filterId = `shadow-${this.id}-${Date.now()}`;
    const glowId = `glow-${this.id}-${Date.now()}`;

    // Plate label SVG - MORE VISIBLE
    const plateLabel = this.plate ? `
      <rect x="${(totalWidth - plateWidth) / 2}" y="0" 
        width="${plateWidth}" height="${plateHeight}" rx="${plateBorderRadius}" fill="#000000" stroke="#ffffff" stroke-width="1"/>
      <text x="${totalWidth / 2}" y="${plateHeight - 6}" text-anchor="middle" font-size="${plateFontSize}" font-weight="${plateFontWeight}" 
        font-family="Arial, sans-serif" fill="#ffffff" letter-spacing="0.5">${this.plate}</text>
    ` : '';

    // Direction arrow for moving vehicles - LARGER
    const roundedHeading = Math.round(this.heading / 15) * 15;
    const arrow = this.isMoving ? `
      <g transform="translate(${totalWidth / 2 - 10}, 24) rotate(${roundedHeading}, 10, 12)">
        <path d="M10 0L18 12H13V22H7V12H2L10 0Z" fill="${ICON_CONFIG.arrowColor}" stroke="${ICON_CONFIG.arrowStroke}" stroke-width="${ICON_CONFIG.arrowStrokeWidth}"/>
      </g>
    ` : '';

    const circleYOffset = this.isMoving ? 48 : (this.plate ? 26 : 8);
    const circleCenterX = totalWidth / 2;
    const circleCenterY = circleYOffset + circleSize / 2;

    const iconSize = ICON_CONFIG.innerIconSize;
    const iconX = circleCenterX - iconSize / 2;
    const iconY = circleCenterY - iconSize / 2;

    // Choose icon based on type
    const vehicleIcon = this.getVehicleIconSvg(iconX, iconY, iconSize);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
        <defs>
          <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.5"/>
          </filter>
          <filter id="${glowId}" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="${ICON_CONFIG.glowBlur}" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        ${plateLabel}
        ${arrow}
        <!-- Outer glow ring for visibility -->
        <circle cx="${circleCenterX}" cy="${circleCenterY}" r="${circleSize / 2 + ICON_CONFIG.glowRadius}" 
          fill="none" stroke="${colors.glow}" stroke-width="3" opacity="${ICON_CONFIG.glowOpacity}" filter="url(#${glowId})"/>
        <!-- Main circle -->
        <circle cx="${circleCenterX}" cy="${circleCenterY}" r="${circleSize / 2}" 
          fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="${actualBorderWidth}" filter="url(#${filterId})"/>
        ${vehicleIcon}
      </svg>
    `;

    return {
      svg,
      width: totalWidth,
      height: totalHeight,
      // Anchor at the center-bottom of the circle (where the vehicle actually is)
      anchorX: circleCenterX,
      anchorY: circleCenterY + circleSize / 2
    };
  }

  /**
   * Generate SVG icon for this vehicle
   * @param {object} mapProvider - Map provider for size calculations
   * @returns {object|null} Icon configuration
   */
  getIcon(mapProvider) {
    if (!mapProvider?.isReady()) return null;

    const { svg, width, height, anchorX, anchorY } = this.getSvg();
    return mapProvider.createIcon(svg, width, height, anchorX, anchorY);
  }

  /**
   * Get the vehicle-specific icon SVG path
   * @param {number} iconX - X position for icon
   * @param {number} iconY - Y position for icon
   * @param {number} iconSize - Size of the icon (default from config)
   * @returns {string} SVG string for the vehicle icon
   */
  getVehicleIconSvg(iconX, iconY, iconSize = ICON_CONFIG.innerIconSize) {
    const scale = iconSize / 24; // Base SVG is 24x24
    const cx = iconSize / 2;
    const cy = iconSize / 2;
    
    if (this.isCoupled || this.vehicleType === VEHICLE_TYPES.COUPLED) {
      // Coupled icon: link/chain SVG
      return `
        <g transform="translate(${iconX}, ${iconY})">
          <!-- Truck icon -->
          <rect x="2" y="${cy - 4}" width="${cx - 2}" height="8" rx="1" fill="white"/>
          <rect x="${cx - 2}" y="${cy - 2}" width="4" height="4" fill="white"/>
          <!-- Link chain -->
          <circle cx="${cx + 2}" cy="${cy}" r="2" fill="none" stroke="white" stroke-width="1.5"/>
          <circle cx="${cx + 6}" cy="${cy}" r="2" fill="none" stroke="white" stroke-width="1.5"/>
          <!-- Trailer icon -->
          <rect x="${cx + 8}" y="${cy - 3}" width="${cx - 6}" height="6" rx="1" fill="white"/>
          <circle cx="${cx + 10}" cy="${cy + 4}" r="1.5" fill="white"/>
        </g>
      `;
    } else if (this.vehicleType === VEHICLE_TYPES.TRAILER) {
      // Trailer icon - rectangular box with wheels
      return `
        <g transform="translate(${iconX}, ${iconY})">
          <rect x="2" y="4" width="${iconSize - 4}" height="${iconSize - 8}" rx="1" fill="white"/>
          <circle cx="${iconSize * 0.25}" cy="${iconSize - 4}" r="2" fill="white"/>
          <circle cx="${iconSize * 0.75}" cy="${iconSize - 4}" r="2" fill="white"/>
        </g>
      `;
    } else {
      // Default truck icon - scaled
      return `
        <g transform="translate(${iconX}, ${iconY})">
          <path d="M${17 * scale} ${6 * scale}h${-2.5 * scale}V${3.5 * scale}H${2.5 * scale}C${1.6 * scale} ${3.5 * scale} ${0.9 * scale} ${4.2 * scale} ${0.9 * scale} ${5.1 * scale}v${8.4 * scale}h${1.6 * scale}c0 ${1.5 * scale} ${1.2 * scale} ${2.7 * scale} ${2.7 * scale} ${2.7 * scale}s${2.7 * scale}-${1.2 * scale} ${2.7 * scale}-${2.7 * scale}h${5.4 * scale}c0 ${1.5 * scale} ${1.2 * scale} ${2.7 * scale} ${2.7 * scale} ${2.7 * scale}s${2.7 * scale}-${1.2 * scale} ${2.7 * scale}-${2.7 * scale}h${1.6 * scale}v-${4 * scale}L${17 * scale} ${6 * scale}zM${5.2 * scale} ${15 * scale}c-${0.8 * scale} 0-${1.4 * scale}-${0.6 * scale}-${1.4 * scale}-${1.4 * scale}s${0.6 * scale}-${1.4 * scale} ${1.4 * scale}-${1.4 * scale} ${1.4 * scale} ${0.6 * scale} ${1.4 * scale} ${1.4 * scale}-${0.6 * scale} ${1.4 * scale}-${1.4 * scale} ${1.4 * scale}zm${11.6 * scale}-${7.2 * scale}l${1.8 * scale} ${2.2 * scale}h-${3.6 * scale}v-${2.2 * scale}h${1.8 * scale}zm-${0.8 * scale} ${7.2 * scale}c-${0.8 * scale} 0-${1.4 * scale}-${0.6 * scale}-${1.4 * scale}-${1.4 * scale}s${0.6 * scale}-${1.4 * scale} ${1.4 * scale}-${1.4 * scale} ${1.4 * scale} ${0.6 * scale} ${1.4 * scale} ${1.4 * scale}-${0.6 * scale} ${1.4 * scale}-${1.4 * scale} ${1.4 * scale}z" fill="white"/>
        </g>
      `;
    }
  }

  getStyle() {
    return {
      ...super.getStyle(),
      zIndex: this.isSelected ? 1000 : (this.isMoving ? 100 : 1)
    };
  }

  getCssClasses() {
    const classes = ['vehicle-marker'];
    if (this.isSelected) classes.push('vehicle-selected');
    if (this.isMoving) classes.push('vehicle-moving');
    if (this.isCoupled) classes.push('vehicle-coupled');
    if (this.frigoOn) classes.push('vehicle-frigo-on');
    return classes.join(' ');
  }

  /**
   * Create a VehicleDrawable from raw vehicle data
   * @param {object} vehicleData - Raw vehicle data from API
   * @param {object} options - Additional options (isSelected, etc.)
   * @returns {VehicleDrawable}
   */
  static fromVehicleData(vehicleData, options = {}) {
    const position = {
      lat: vehicleData.posizione?.latitude || vehicleData.latitude || vehicleData.latitudine,
      lng: vehicleData.posizione?.longitude || vehicleData.longitude || vehicleData.longitudine
    };

    if (!position.lat || !position.lng) return null;

    const rawSpeed = vehicleData.posizione?.speed ?? vehicleData.speed ?? vehicleData.velocita ?? 0;
    const speed = typeof rawSpeed === 'number' ? rawSpeed : parseFloat(rawSpeed) || 0;
    const plate = (vehicleData._plate || vehicleData.targa || vehicleData.targa_camion || '').replace(/\*+$/, '');

    return new VehicleDrawable({
      id: vehicleData.idServizio || vehicleData.id || plate,
      position,
      plate,
      vehicleType: vehicleData._type || determineVehicleType(vehicleData),
      heading: vehicleData.posizione?.heading || vehicleData.heading || 0,
      speed,
      isMoving: speed > 3,
      isSelected: options.isSelected || false,
      isCoupled: vehicleData._coupled || false,
      frigoOn: vehicleData._frigoOn || false,
      doorOpen: vehicleData._doorOpen || false,
      hasTemperature: vehicleData._hasTemperature || false,
      temperature1: vehicleData._temperature1,
      temperature2: vehicleData._temperature2,
      truckPlate: vehicleData._truckPlate || '',
      trailerPlate: vehicleData._trailerPlate || '',
      truckData: vehicleData._truckData || null,
      trailerData: vehicleData._trailerData || null,
      nickname: vehicleData.nickname || '',
      brand: vehicleData.brand || '',
      modello: vehicleData.modello || '',
      kmTotali: vehicleData.km_totali || 0,
      lastUpdate: vehicleData.posizione?.fixGps || null,
      address: vehicleData.posizione?.address?.F || '',
      data: vehicleData,
      onClick: options.onClick,
      onHover: options.onHover
    });
  }

  toJSON() {
    return {
      ...super.toJSON(),
      plate: this.plate,
      vehicleType: this.vehicleType,
      heading: this.heading,
      speed: this.speed,
      isMoving: this.isMoving,
      isSelected: this.isSelected,
      isCoupled: this.isCoupled,
      frigoOn: this.frigoOn,
      hasTemperature: this.hasTemperature,
      temperature1: this.temperature1,
      temperature2: this.temperature2
    };
  }
}

export default VehicleDrawable;
