# Database & Controller Refactoring Architecture

This document describes the new controller-based architecture for the GPS Tracking System.

## Overview

The refactoring introduces three main components:

1. **DatabaseService** - Singleton class for all database operations
2. **VehicleController** - Server-side controller for vehicle data management
3. **MapController** - Client-side controller for map state management

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT SIDE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌─────────────────┐     ┌───────────────────┐       │
│   │  Dashboard   │────▶│  useMapController│────▶│   MapController   │       │
│   │  Component   │     │     (hook)       │     │   (class)         │       │
│   └──────────────┘     └─────────────────┘     └───────────────────┘       │
│          │                                              │                   │
│          │                                              │                   │
│          ▼                                              ▼                   │
│   ┌──────────────┐                              ┌───────────────────┐       │
│   │  API Client  │                              │   MapDrawer       │       │
│   │  (v2 APIs)   │                              │   Component       │       │
│   └──────────────┘                              └───────────────────┘       │
│          │                                              │                   │
└──────────│──────────────────────────────────────────────│───────────────────┘
           │                                              │
           ▼                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER SIDE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌─────────────────┐     ┌───────────────────┐       │
│   │  Express     │────▶│ VehicleController│────▶│  DatabaseService  │       │
│   │  Routes      │     │   API Routes     │     │   (singleton)     │       │
│   └──────────────┘     └─────────────────┘     └───────────────────┘       │
│                                                         │                   │
│                                                         ▼                   │
│                                                 ┌───────────────────┐       │
│                                                 │   SQLite DB       │       │
│                                                 │   (better-sqlite3)│       │
│                                                 └───────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Server-Side Components

### 1. DatabaseService (`/server/database/DatabaseService.js`)

A singleton class that encapsulates all database operations.

**Key Features:**
- Singleton pattern ensures single database connection
- WAL mode for better concurrency
- Generic query methods (`query()`, `queryOne()`, `execute()`, `transaction()`)
- Domain-specific methods for each entity type

**Methods:**

```javascript
// Connection
connect()
close()
getDb()

// Generic queries
query(sql, params)
queryOne(sql, params)
execute(sql, params)
transaction(callback)

// Vehicle Positions
getAllPositions()
getMovingVehicles(speedThreshold)
getStoppedVehicles(speedThreshold)
getPositionByPlate(plate)
getPositionByIdServizio(idServizio)
getPositionsByPlates(plates)
savePosition(positionData)
saveMultiplePositions(positions)
getSyncStatus()

// Geofences
getGeofences(activeOnly)
getGeofenceById(id)
createGeofence(data)
updateGeofence(id, data)
deleteGeofence(id)

// Vehicles
getVehicles(activeOnly)
getVehicleById(id)
updateVehicle(id, data)

// Coupled Pairs
getCoupledPairs()
saveCoupledPair(truckPlate, trailerPlate)
removeCoupledPair(truckPlate, trailerPlate)
saveCoupledPairs(pairs)

// Hidden Vehicles
getHiddenVehicles()
toggleVehicleVisibility(plate)
setHiddenVehicles(plates)

// Drivers, Events, Alarms, Routes
getDrivers(activeOnly)
getDriverById(id)
getEvents(options)
createEvent(data)
getAlarms(activeOnly)
getRouteTemplates(activeOnly)
getTrips(fromDate, toDate)

// Utility
static formatPositionForFrontend(pos)
getAllPositionsFormatted()
getPositionsByFilter(filterType)
```

### 2. VehicleController (`/server/database/VehicleController.js`)

A controller class for vehicle data management with business logic.

**Key Features:**
- Internal caching for performance
- Coupled pair management
- Hidden vehicle management
- Position filtering and processing

**Methods:**

```javascript
// Position Management
getAllPositions(refresh)
getFilteredPositions(options)
getPositionsForMap(filterOptions)
getAllPlates()
getVehicleByPlate(plate)
getStatistics()

// Coupling Management
getCoupledPairs()
addCoupledPair(truckPlate, trailerPlate)
removeCoupledPair(truckPlate, trailerPlate)
updateCoupledPairs(pairs)

// Visibility Management
getHiddenVehicles()
toggleVehicleVisibility(plate)
setHiddenVehicles(plates)
showAllVehicles()
isVehicleHidden(plate)

// Geofence Management
getGeofences()
createGeofence(data)
updateGeofence(id, data)
deleteGeofence(id)

// Utility
clearCache()
refresh()
```

### 3. API Routes (`/server/routes/vehicleControllerApi.js`)

New v2 API endpoints that use VehicleController.

**Endpoints:**

```
# Positions
GET  /api/v2/positions              - Get filtered positions
GET  /api/v2/positions/map          - Get positions for map display
GET  /api/v2/positions/statistics   - Get vehicle statistics
GET  /api/v2/positions/plates       - Get all plate numbers
GET  /api/v2/positions/:plate       - Get position by plate

# Coupled Pairs
GET    /api/v2/coupled-pairs        - Get all coupled pairs
POST   /api/v2/coupled-pairs        - Add a coupled pair
PUT    /api/v2/coupled-pairs        - Replace all coupled pairs
DELETE /api/v2/coupled-pairs        - Remove a coupled pair

# Hidden Vehicles
GET    /api/v2/hidden-vehicles        - Get hidden vehicle plates
POST   /api/v2/hidden-vehicles/toggle - Toggle vehicle visibility
PUT    /api/v2/hidden-vehicles        - Set all hidden vehicles
DELETE /api/v2/hidden-vehicles        - Show all vehicles

# Geofences
GET    /api/v2/geofences            - Get all geofences
POST   /api/v2/geofences            - Create geofence
PUT    /api/v2/geofences/:id        - Update geofence
DELETE /api/v2/geofences/:id        - Delete geofence

# Refresh
POST   /api/v2/refresh              - Refresh controller data
```

## Client-Side Components

### 1. MapController (`/client/src/controllers/MapController.js`)

A client-side controller for map state management.

**Key Features:**
- Manages map provider state (Google, OSM, satellite, etc.)
- Manages drawable collections (vehicles, geofences, markers, routes)
- Filter management
- View state (center, zoom, selection, follow mode)
- Event callbacks

**Methods:**

```javascript
// Provider Management
getProvider()
setProvider(provider)
cycleProvider()
setMapInstance(map)

// Vehicle Drawable Management
updateVehicles(positions)
getVehicles()
getFilteredVehicles()
getVehicleById(id)
getVehicleByPlate(plate)

// Geofence Drawable Management
updateGeofences(geofences)
getGeofences()
toggleGeofences()
setGeofencesVisible(visible)

// View Management
setCenter(center)
getCenter()
setZoom(zoom)
getZoom()
zoomIn()
zoomOut()
focusOnVehicle(vehicleId, zoom)
focusOnPlate(plate, zoom)
fitAllVehicles()

// Selection & Follow Mode
selectVehicle(vehicleId)
clearSelection()
getSelectedVehicle()
followVehicle(vehicleId)
stopFollowing()
isFollowing()

// Filter Management
setFilters(filters)
getFilters()
toggleShowMoving()
toggleShowStopped()
toggleShowTemperature()
setSearchTerm(term)
clearFilters()

// Route/Polyline Management
addRoute(id, path, options)
removeRoute(id)
getRoutes()
clearRoutes()
toggleRoutes()

// Marker Management
addMarker(id, position, options)
removeMarker(id)
getMarkers()
clearMarkers()

// Event Callbacks
onUpdate(callback)
onVehicleSelect(callback)
onProviderChange(callback)

// State Management
getState()
restoreState(state)
reset()
getAllDrawables()
```

### 2. useMapController Hook (`/client/src/hooks/useMapController.js`)

A React hook for integrating MapController with React components.

**Features:**
- Manages controller instance lifecycle
- Provides reactive state updates
- Wraps controller methods with useCallback

**Usage:**

```javascript
import { useMapController } from '../hooks/useMapController';

function MyComponent() {
  const {
    controller,
    state,
    updateVehicles,
    getVehicles,
    focusOnVehicle,
    selectVehicle,
    setProvider,
    toggleGeofences,
    toggleShowMoving,
    getAllDrawables,
    // ... more methods
  } = useMapController({
    initialProvider: 'roadmap',
    onVehicleSelect: (id, vehicle) => console.log('Selected:', id)
  });

  // Use state and methods...
}
```

### 3. DashboardRefactored (`/client/src/pages/DashboardRefactored.jsx`)

A refactored Dashboard component using the new architecture.

**Features:**
- Uses useMapController hook
- Map buttons call controller methods directly
- Clean separation of concerns
- Stats panel, vehicle list, map controls

### 4. Client API v2 (`/client/src/api/index.js`)

New v2 API client functions.

**APIs:**
- `positionsApiV2` - Get filtered positions
- `coupledPairsApi` - Manage coupled pairs
- `hiddenVehiclesApi` - Manage hidden vehicles
- `geofencesApiV2` - Manage geofences
- `refreshApi` - Refresh controller data

## Database Tables

New tables created for coupling and visibility:

```sql
-- Coupled pairs table
CREATE TABLE IF NOT EXISTS coupled_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  truck_plate TEXT NOT NULL,
  trailer_plate TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(truck_plate, trailer_plate)
);

-- Hidden vehicles table
CREATE TABLE IF NOT EXISTS hidden_vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Guide

### Using the New Architecture

1. **Import the new components:**

```javascript
// Server-side
import databaseService from './database/DatabaseService.js';
import { vehicleController } from './database/VehicleController.js';

// Client-side
import { useMapController } from './hooks/useMapController';
import { positionsApiV2, coupledPairsApi, hiddenVehiclesApi } from './api';
```

2. **Replace direct DB calls with DatabaseService:**

```javascript
// Before
import db from './database/db.js';
const vehicles = db.prepare('SELECT * FROM vehicles').all();

// After
import databaseService from './database/DatabaseService.js';
const vehicles = databaseService.getVehicles();
```

3. **Use VehicleController for business logic:**

```javascript
// Before
// Complex filtering logic in route handlers

// After
const positions = vehicleController.getFilteredPositions({
  showMovingOnly: true,
  excludeHidden: true,
  applyCoupling: true
});
```

4. **Use MapController in React components:**

```javascript
// Before
const [mapType, setMapType] = useState('roadmap');
const [selectedVehicle, setSelectedVehicle] = useState(null);
// ... lots of state management

// After
const { state, setProvider, selectVehicle, getVehicles } = useMapController();
// State is managed by the controller
```

## Benefits

1. **Separation of Concerns**
   - Database operations isolated in DatabaseService
   - Business logic in VehicleController
   - Map state management in MapController

2. **Single Source of Truth**
   - All database operations go through DatabaseService
   - Coupled pairs and hidden vehicles stored in database

3. **Testability**
   - Each component can be tested independently
   - Mock dependencies easily

4. **Maintainability**
   - Clear interfaces between components
   - Changes isolated to specific layers

5. **Performance**
   - Controller-level caching
   - Efficient database queries

6. **Reusability**
   - MapController can be used in any component
   - VehicleController methods shared across API routes
