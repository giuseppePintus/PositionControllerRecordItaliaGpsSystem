/**
 * ClusterDrawable - Configuration for marker clustering
 * 
 * Contains all cluster-related styling and options.
 * This keeps cluster configuration out of the view layer.
 */
import { BaseDrawable } from './BaseDrawable';

// Cluster size thresholds
export const CLUSTER_SIZES = {
  SMALL: { min: 2, max: 10 },
  MEDIUM: { min: 11, max: 50 },
  LARGE: { min: 51, max: Infinity }
};

// Cluster colors by size
export const CLUSTER_COLORS = {
  small: {
    fill: '#3b82f6',      // Blue
    stroke: '#1e40af',
    inner: '#60a5fa'
  },
  medium: {
    fill: '#8b5cf6',      // Purple
    stroke: '#5b21b6',
    inner: '#a78bfa'
  },
  large: {
    fill: '#ec4899',      // Pink
    stroke: '#9d174d',
    inner: '#f472b6'
  }
};

// Cluster configuration
export const CLUSTER_CONFIG = {
  maxZoom: 14,           // Don't cluster beyond this zoom level
  gridSize: 60,          // Pixel grid size for clustering
  minimumClusterSize: 2, // Minimum markers to form a cluster
  
  // Sizes for different cluster magnitudes
  sizes: {
    small: { width: 50, height: 50 },
    medium: { width: 60, height: 60 },
    large: { width: 70, height: 70 }
  },
  
  // Text styling
  text: {
    color: '#ffffff',
    sizes: { small: 14, medium: 15, large: 16 },
    fontWeight: 'bold'
  }
};

/**
 * Generate SVG for a cluster icon
 * @param {string} size - 'small', 'medium', or 'large'
 * @returns {string} SVG string
 */
export function generateClusterSvg(size = 'small') {
  const colors = CLUSTER_COLORS[size] || CLUSTER_COLORS.small;
  const dimensions = CLUSTER_CONFIG.sizes[size] || CLUSTER_CONFIG.sizes.small;
  const { width, height } = dimensions;
  const center = width / 2;
  const outerRadius = center - 2;
  const innerRadius = outerRadius * 0.6;
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <circle cx="${center}" cy="${center}" r="${outerRadius}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="3"/>
      <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="${colors.inner}" opacity="0.6"/>
    </svg>
  `.trim();
}

/**
 * Get cluster styles for MarkerClusterer
 * @returns {Array} Array of cluster style objects
 */
export function getClusterStyles() {
  return [
    {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateClusterSvg('small'))}`,
      height: CLUSTER_CONFIG.sizes.small.height,
      width: CLUSTER_CONFIG.sizes.small.width,
      textColor: CLUSTER_CONFIG.text.color,
      textSize: CLUSTER_CONFIG.text.sizes.small,
      fontWeight: CLUSTER_CONFIG.text.fontWeight
    },
    {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateClusterSvg('medium'))}`,
      height: CLUSTER_CONFIG.sizes.medium.height,
      width: CLUSTER_CONFIG.sizes.medium.width,
      textColor: CLUSTER_CONFIG.text.color,
      textSize: CLUSTER_CONFIG.text.sizes.medium,
      fontWeight: CLUSTER_CONFIG.text.fontWeight
    },
    {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateClusterSvg('large'))}`,
      height: CLUSTER_CONFIG.sizes.large.height,
      width: CLUSTER_CONFIG.sizes.large.width,
      textColor: CLUSTER_CONFIG.text.color,
      textSize: CLUSTER_CONFIG.text.sizes.large,
      fontWeight: CLUSTER_CONFIG.text.fontWeight
    }
  ];
}

/**
 * Get cluster options for MarkerClusterer
 * @param {object} overrides - Optional overrides for default options
 * @returns {object} Cluster options
 */
export function getClusterOptions(overrides = {}) {
  return {
    maxZoom: CLUSTER_CONFIG.maxZoom,
    gridSize: CLUSTER_CONFIG.gridSize,
    minimumClusterSize: CLUSTER_CONFIG.minimumClusterSize,
    styles: getClusterStyles(),
    ...overrides
  };
}

/**
 * ClusterDrawable class for future extensibility
 */
export class ClusterDrawable extends BaseDrawable {
  constructor(options = {}) {
    super({
      id: options.id || 'cluster',
      type: 'cluster',
      ...options
    });
    
    this.count = options.count || 0;
    this.markers = options.markers || [];
  }
  
  getType() {
    return 'cluster';
  }
  
  /**
   * Get the size category based on marker count
   * @returns {string} 'small', 'medium', or 'large'
   */
  getSizeCategory() {
    if (this.count <= CLUSTER_SIZES.SMALL.max) return 'small';
    if (this.count <= CLUSTER_SIZES.MEDIUM.max) return 'medium';
    return 'large';
  }
  
  /**
   * Get icon for this cluster
   * @param {object} mapProvider - Map provider instance
   * @returns {object|null} Icon configuration
   */
  getIcon(mapProvider) {
    if (!mapProvider?.isReady()) return null;
    
    const size = this.getSizeCategory();
    const svg = generateClusterSvg(size);
    const dimensions = CLUSTER_CONFIG.sizes[size];
    
    return mapProvider.createIcon(
      svg,
      dimensions.width,
      dimensions.height,
      dimensions.width / 2,
      dimensions.height / 2
    );
  }
  
  getStyle() {
    const size = this.getSizeCategory();
    return {
      ...super.getStyle(),
      textColor: CLUSTER_CONFIG.text.color,
      textSize: CLUSTER_CONFIG.text.sizes[size]
    };
  }
}

export default ClusterDrawable;
