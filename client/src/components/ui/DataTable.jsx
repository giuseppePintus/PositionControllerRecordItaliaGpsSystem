import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Search, X, Plus, Edit2, Trash2, Save, ChevronUp, ChevronDown,
  Settings2, Eye, EyeOff, GripVertical, Filter, Download, RefreshCw,
  RotateCcw
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// COLORI TEMA - Usa CSS Variables
// ============================================================================
// I colori sono definiti in index.css come CSS variables
// Le classi primary-* cambiano automaticamente in base a data-theme

// Classi utility per i colori del tema corrente
export const themeClasses = {
  bg50: 'bg-primary-50',
  bg100: 'bg-primary-100',
  bg500: 'bg-primary-500',
  bg600: 'bg-primary-600',
  bg700: 'bg-primary-700',
  text: 'text-primary-600',
  textHover: 'hover:text-primary-600',
  bgHover: 'hover:bg-primary-50',
  ring: 'focus:ring-primary-500',
  border: 'focus:border-primary-500',
  checkbox: 'text-primary-600',
};

// Mantieni ThemeColors per retrocompatibilità (deprecato)
export const ThemeColors = {
  blue: themeClasses,
  emerald: themeClasses,
  orange: themeClasses,
  purple: themeClasses,
};

// ============================================================================
// TIPI DI CAMPO SUPPORTATI
// ============================================================================
export const FieldTypes = {
  STRING: 'string',
  TEXT: 'text',
  NUMBER: 'number',
  FLOAT: 'float',
  INTEGER: 'integer',
  CURRENCY: 'currency',
  DATE: 'date',
  DATETIME: 'datetime',
  BOOLEAN: 'boolean',
  SELECT: 'select',
  EMAIL: 'email',
  PHONE: 'phone',
  URL: 'url',
  BADGE: 'badge',
};

// ============================================================================
// FORMATTATORI PER TIPO
// ============================================================================
const formatters = {
  [FieldTypes.STRING]: (value) => value || '-',
  [FieldTypes.TEXT]: (value) => value || '-',
  [FieldTypes.NUMBER]: (value) => value?.toLocaleString('it-IT') ?? '-',
  [FieldTypes.FLOAT]: (value, options) => 
    value != null ? value.toLocaleString('it-IT', { minimumFractionDigits: options?.decimals || 2, maximumFractionDigits: options?.decimals || 2 }) : '-',
  [FieldTypes.INTEGER]: (value) => value != null ? Math.round(value).toLocaleString('it-IT') : '-',
  [FieldTypes.CURRENCY]: (value, options) => 
    value != null ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: options?.currency || 'EUR' }).format(value) : '-',
  [FieldTypes.DATE]: (value) => value ? new Date(value).toLocaleDateString('it-IT') : '-',
  [FieldTypes.DATETIME]: (value) => value ? new Date(value).toLocaleString('it-IT') : '-',
  [FieldTypes.BOOLEAN]: (value, options) => value ? (options?.trueLabel || 'Sì') : (options?.falseLabel || 'No'),
  [FieldTypes.SELECT]: (value, options) => options?.options?.find(o => o.value === value)?.label || value || '-',
  [FieldTypes.EMAIL]: (value) => value || '-',
  [FieldTypes.PHONE]: (value) => value || '-',
  [FieldTypes.URL]: (value) => value || '-',
  [FieldTypes.BADGE]: (value, options) => value || '-',
};

// ============================================================================
// COMPONENTE CELLA TABELLA
// ============================================================================
function TableCell({ value, column }) {
  const formatter = formatters[column.type] || formatters[FieldTypes.STRING];
  const formattedValue = formatter(value, column);

  // Rendering speciale per BADGE
  if (column.type === FieldTypes.BADGE) {
    const badgeConfig = column.badgeConfig?.[value] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', badgeConfig.bg, badgeConfig.text)}>
        {column.badgeLabels?.[value] || value}
      </span>
    );
  }

  // Rendering speciale per BOOLEAN
  if (column.type === FieldTypes.BOOLEAN) {
    const badgeClass = value 
      ? 'bg-green-100 text-green-700' 
      : 'bg-red-100 text-red-700';
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', badgeClass)}>
        {formattedValue}
      </span>
    );
  }

  // Rendering speciale per EMAIL
  if (column.type === FieldTypes.EMAIL && value) {
    return <a href={`mailto:${value}`} className="text-primary-600 hover:underline">{value}</a>;
  }

  // Rendering speciale per PHONE
  if (column.type === FieldTypes.PHONE && value) {
    return <a href={`tel:${value}`} className="text-primary-600 hover:underline">{value}</a>;
  }

  // Rendering speciale per URL
  if (column.type === FieldTypes.URL && value) {
    return <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{value}</a>;
  }

  return <span>{formattedValue}</span>;
}

// ============================================================================
// COMPONENTE INPUT FORM
// ============================================================================
function FormField({ column, value, onChange, accentColor = 'blue' }) {
  // Usa classi CSS variables - cambiano automaticamente con il tema
  const focusRingClass = 'focus:ring-primary-500 focus:border-primary-500';
  const checkboxClass = 'text-primary-600 focus:ring-primary-500';

  const baseClass = `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${focusRingClass}`;

  switch (column.type) {
    case FieldTypes.TEXT:
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          rows={column.rows || 3}
          placeholder={column.placeholder}
          disabled={column.disabled}
        />
      );

    case FieldTypes.NUMBER:
    case FieldTypes.FLOAT:
    case FieldTypes.INTEGER:
    case FieldTypes.CURRENCY:
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(column.type === FieldTypes.INTEGER ? parseInt(e.target.value) || '' : parseFloat(e.target.value) || '')}
          className={baseClass}
          step={column.type === FieldTypes.INTEGER ? 1 : column.step || 0.01}
          min={column.min}
          max={column.max}
          placeholder={column.placeholder}
          disabled={column.disabled}
        />
      );

    case FieldTypes.DATE:
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          disabled={column.disabled}
        />
      );

    case FieldTypes.DATETIME:
      return (
        <input
          type="datetime-local"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          disabled={column.disabled}
        />
      );

    case FieldTypes.BOOLEAN:
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            className={clsx('w-4 h-4 rounded', checkboxClass)}
            disabled={column.disabled}
          />
          <span className="text-sm text-gray-700">{column.checkboxLabel || column.label}</span>
        </label>
      );

    case FieldTypes.SELECT:
    case FieldTypes.BADGE:
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          disabled={column.disabled}
        >
          {column.allowEmpty && <option value="">-- Seleziona --</option>}
          {column.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case FieldTypes.EMAIL:
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          placeholder={column.placeholder || 'email@esempio.it'}
          disabled={column.disabled}
        />
      );

    case FieldTypes.PHONE:
      return (
        <input
          type="tel"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          placeholder={column.placeholder || '+39 000 0000000'}
          disabled={column.disabled}
        />
      );

    case FieldTypes.URL:
      return (
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          placeholder={column.placeholder || 'https://'}
          disabled={column.disabled}
        />
      );

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          placeholder={column.placeholder}
          maxLength={column.maxLength}
          disabled={column.disabled}
        />
      );
  }
}

// ============================================================================
// MODAL IMPOSTAZIONI COLONNE CON DRAG & DROP
// ============================================================================
function ColumnSettingsModal({ 
  columns, 
  visibleColumns, 
  columnOrder,
  onVisibilityChange, 
  onOrderChange,
  onReset,
  onClose, 
  accentColor 
}) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [orderedColumns, setOrderedColumns] = useState(() => {
    // Ordina le colonne secondo columnOrder
    const orderMap = {};
    columnOrder.forEach((key, index) => orderMap[key] = index);
    return [...columns]
      .filter(col => !col.alwaysVisible && col.key !== 'actions')
      .sort((a, b) => (orderMap[a.key] ?? 999) - (orderMap[b.key] ?? 999));
  });

  const theme = ThemeColors[accentColor] || ThemeColors.blue;

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) return;

    const newOrder = [...orderedColumns];
    const [removed] = newOrder.splice(draggedItem, 1);
    newOrder.splice(dropIndex, 0, removed);
    setOrderedColumns(newOrder);
    
    // Notifica il cambio di ordine
    const newColumnOrder = newOrder.map(col => col.key);
    onOrderChange(newColumnOrder);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings2 size={20} />
            Personalizza Colonne
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">Trascina per riordinare le colonne</p>
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
          >
            <RotateCcw size={12} />
            Ripristina
          </button>
        </div>

        <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
          {orderedColumns.map((column, index) => (
            <div
              key={column.key}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={clsx(
                "flex items-center gap-3 p-2 rounded-lg cursor-move select-none transition-colors",
                draggedItem === index ? 'bg-gray-200' : 'hover:bg-gray-50',
                "border border-transparent",
                draggedItem !== null && draggedItem !== index && "border-dashed border-gray-300"
              )}
            >
              <GripVertical size={16} className="text-gray-400 shrink-0" />
              <label className="flex items-center gap-3 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column.key)}
                  onChange={(e) => onVisibilityChange(column.key, e.target.checked)}
                  className={clsx('w-4 h-4 rounded', theme.checkbox, theme.ring)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm text-gray-700">{column.label}</span>
              </label>
              {!visibleColumns.includes(column.key) && (
                <EyeOff size={14} className="text-gray-400" />
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className={clsx('px-4 py-2 text-white rounded-lg transition-colors', theme[600], `hover:${theme[700]}`)}
            style={{ backgroundColor: `var(--${accentColor}-600, #2563eb)` }}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE DATATABLE PRINCIPALE
// ============================================================================
export default function DataTable({
  // Dati
  data = [],
  columns = [],
  
  // Configurazione
  title,
  subtitle,
  icon: Icon,
  accentColor = 'blue',
  
  // Identificatore
  idField = 'id',
  
  // Stato vuoto per nuovo record
  emptyRecord = {},
  
  // Callbacks CRUD
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  
  // Personalizzazione
  searchable = true,
  searchPlaceholder = 'Cerca...',
  searchFields = [],
  
  // Filtri aggiuntivi
  filters,
  
  // Paginazione
  paginated = false,
  pageSize: initialPageSize = 15,
  pageSizeOptions = [10, 15, 20, 25, 50, 100],
  
  // Export
  exportable = false,
  
  // Loading state
  loading = false,
  
  // Storage key per preferenze utente
  storageKey,
  
  // Custom actions
  customActions,
  
  // Row click
  onRowClick,
  
  // Messaggio tabella vuota
  emptyMessage = 'Nessun dato trovato',

  // Form modal custom
  renderForm,
  formClassName,
}) {
  // State per ricerca e ordinamento
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  
  // State per pageSize (con persistenza)
  const [pageSize, setPageSize] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`${storageKey}_pageSize`);
      return saved ? parseInt(saved) : initialPageSize;
    }
    // Prova a prendere dal localStorage globale delle impostazioni utente
    const userSettings = localStorage.getItem('userSettings');
    if (userSettings) {
      try {
        const parsed = JSON.parse(userSettings);
        return parsed.defaultPageSize || initialPageSize;
      } catch (e) {}
    }
    return initialPageSize;
  });
  
  // State per modal
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState(emptyRecord);
  
  // State per impostazioni colonne
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  // Tema colori
  const theme = ThemeColors[accentColor] || ThemeColors.blue;
  
  // Gestione preferenze utente (persistenza localStorage)
  const defaultVisibleColumns = columns.filter(c => !c.hidden).map(c => c.key);
  const defaultColumnOrder = columns.map(c => c.key);
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`${storageKey}_visible`);
      return saved ? JSON.parse(saved) : defaultVisibleColumns;
    }
    return defaultVisibleColumns;
  });

  const [columnOrder, setColumnOrder] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`${storageKey}_order`);
      return saved ? JSON.parse(saved) : defaultColumnOrder;
    }
    return defaultColumnOrder;
  });

  // Salva preferenze colonne visibili
  const handleColumnVisibilityChange = useCallback((columnKey, visible) => {
    setVisibleColumns(prev => {
      const newVisible = visible 
        ? [...prev, columnKey]
        : prev.filter(k => k !== columnKey);
      if (storageKey) {
        localStorage.setItem(`${storageKey}_visible`, JSON.stringify(newVisible));
      }
      return newVisible;
    });
  }, [storageKey]);

  // Salva ordine colonne
  const handleColumnOrderChange = useCallback((newOrder) => {
    setColumnOrder(newOrder);
    if (storageKey) {
      localStorage.setItem(`${storageKey}_order`, JSON.stringify(newOrder));
    }
  }, [storageKey]);

  // Reset preferenze
  const handleResetPreferences = useCallback(() => {
    setVisibleColumns(defaultVisibleColumns);
    setColumnOrder(defaultColumnOrder);
    setPageSize(initialPageSize);
    if (storageKey) {
      localStorage.removeItem(`${storageKey}_visible`);
      localStorage.removeItem(`${storageKey}_order`);
      localStorage.removeItem(`${storageKey}_pageSize`);
    }
  }, [storageKey, defaultVisibleColumns, defaultColumnOrder, initialPageSize]);

  // Cambia pageSize
  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset alla prima pagina
    if (storageKey) {
      localStorage.setItem(`${storageKey}_pageSize`, newSize.toString());
    }
  }, [storageKey]);

  // Filtra e cerca
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Applica ricerca
    if (searchTerm && searchFields.length > 0) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(term);
        })
      );
    }
    
    // Applica ordinamento
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        let comparison = 0;
        if (typeof aVal === 'string') {
          comparison = aVal.localeCompare(bVal, 'it');
        } else {
          comparison = aVal - bVal;
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [data, searchTerm, searchFields, sortConfig]);

  // Paginazione
  const paginatedData = useMemo(() => {
    if (!paginated) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, paginated, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Colonne visibili e ordinate
  const displayColumns = useMemo(() => {
    const visibleCols = columns.filter(col => 
      col.alwaysVisible || visibleColumns.includes(col.key) || col.key === 'actions'
    );
    
    // Ordina secondo columnOrder
    const orderMap = {};
    columnOrder.forEach((key, index) => orderMap[key] = index);
    
    return visibleCols.sort((a, b) => {
      // Le colonne alwaysVisible vanno sempre all'inizio
      if (a.alwaysVisible && !b.alwaysVisible) return -1;
      if (!a.alwaysVisible && b.alwaysVisible) return 1;
      // Le azioni vanno sempre alla fine
      if (a.key === 'actions') return 1;
      if (b.key === 'actions') return -1;
      // Altrimenti ordina secondo columnOrder
      return (orderMap[a.key] ?? 999) - (orderMap[b.key] ?? 999);
    });
  }, [columns, visibleColumns, columnOrder]);

  // Colonne per form (esclude quelle non editabili)
  const formColumns = useMemo(() => {
    return columns.filter(col => col.key !== 'actions' && !col.hideInForm);
  }, [columns]);

  // Gestione ordinamento
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Gestione modal
  const handleOpenModal = useCallback((record = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData(record);
    } else {
      setEditingRecord(null);
      setFormData(emptyRecord);
    }
    setShowModal(true);
  }, [emptyRecord]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingRecord(null);
    setFormData(emptyRecord);
  }, [emptyRecord]);

  const handleSave = useCallback(() => {
    if (editingRecord) {
      onEdit?.(editingRecord[idField], formData);
    } else {
      onAdd?.(formData);
    }
    handleCloseModal();
  }, [editingRecord, formData, idField, onEdit, onAdd, handleCloseModal]);

  const handleDelete = useCallback((record) => {
    if (window.confirm('Sei sicuro di voler eliminare questo elemento?')) {
      onDelete?.(record[idField]);
    }
  }, [idField, onDelete]);

  // Aggiorna campo form
  const updateFormField = useCallback((key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // Export CSV
  const handleExport = useCallback(() => {
    const exportColumns = columns.filter(c => c.key !== 'actions' && visibleColumns.includes(c.key));
    const headers = exportColumns.map(c => c.label).join(';');
    const rows = filteredData.map(row => 
      exportColumns.map(col => {
        const value = row[col.key];
        return typeof value === 'string' && value.includes(';') ? `"${value}"` : value;
      }).join(';')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${storageKey || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [columns, visibleColumns, filteredData, storageKey]);

  // Classi dinamiche - Usa CSS variables (cambiano automaticamente con il tema)
  const buttonBgClass = 'bg-primary-600 hover:bg-primary-700';
  const iconColorClass = 'text-primary-600';
  const focusRingClass = 'focus:ring-primary-500 focus:border-primary-500';
  const hoverBgClass = 'hover:text-primary-600 hover:bg-primary-50';
  const checkboxClass = 'text-primary-600 focus:ring-primary-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      {(title || onAdd) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {title && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {Icon && <Icon className={iconColorClass} size={28} />}
                {title}
              </h1>
              {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
            </div>
          )}
          <div className="flex items-center gap-2">
            {customActions}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Aggiorna"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
            {exportable && (
              <button
                onClick={handleExport}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Esporta CSV"
              >
                <Download size={20} />
              </button>
            )}
            <button
              onClick={() => setShowColumnSettings(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Personalizza colonne"
            >
              <Settings2 size={20} />
            </button>
            {onAdd && (
              <button
                onClick={() => handleOpenModal()}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors',
                  buttonBgClass
                )}
              >
                <Plus size={20} />
                Nuovo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      {(searchable || filters) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {searchable && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={clsx(
                    'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2',
                    focusRingClass
                  )}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            {filters}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {displayColumns.map((column) => (
                  <th
                    key={column.key}
                    className={clsx(
                      'px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider',
                      column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left',
                      column.sortable && 'cursor-pointer hover:bg-gray-100 select-none'
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className={clsx('flex items-center gap-1', column.align === 'right' && 'justify-end')}>
                      {column.label}
                      {column.sortable && sortConfig.key === column.key && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={displayColumns.length} className="px-4 py-8 text-center">
                    <RefreshCw className="animate-spin mx-auto text-gray-400" size={24} />
                    <p className="mt-2 text-gray-500">Caricamento...</p>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length} className="px-4 py-8 text-center text-gray-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr 
                    key={row[idField]} 
                    className={clsx('hover:bg-gray-50', onRowClick && 'cursor-pointer')}
                    onClick={() => onRowClick?.(row)}
                  >
                    {displayColumns.map((column) => (
                      <td
                        key={column.key}
                        className={clsx(
                          'px-4 py-3',
                          column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left',
                          column.className
                        )}
                      >
                        {column.key === 'actions' ? (
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {column.customRender?.(row)}
                            {onEdit && (
                              <button
                                onClick={() => handleOpenModal(row)}
                                className={clsx('p-1.5 text-gray-500 rounded-lg transition-colors', hoverBgClass)}
                                title="Modifica"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => handleDelete(row)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Elimina"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ) : column.render ? (
                          column.render(row[column.key], row)
                        ) : (
                          <TableCell value={row[column.key]} column={column} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {paginated && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                {filteredData.length} risultati
                {totalPages > 1 && ` - Pagina ${currentPage} di ${totalPages}`}
              </p>
              
              {/* Selettore record per pagina */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Righe:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                  className={clsx(
                    'px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2',
                    focusRingClass
                  )}
                >
                  {pageSizeOptions.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  title="Prima pagina"
                >
                  ««
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Precedente
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Successiva
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  title="Ultima pagina"
                >
                  »»
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={clsx('bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto', formClassName || 'max-w-2xl')}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRecord ? 'Modifica' : 'Nuovo'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {renderForm ? (
                renderForm({ formData, setFormData, updateFormField, editingRecord, columns: formColumns, accentColor })
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formColumns.map((column) => (
                    <div key={column.key} className={column.fullWidth ? 'md:col-span-2' : ''}>
                      {column.type !== FieldTypes.BOOLEAN && (
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {column.label}
                          {column.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                      )}
                      <FormField
                        column={column}
                        value={formData[column.key]}
                        onChange={(value) => updateFormField(column.key, value)}
                        accentColor={accentColor}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors',
                  buttonBgClass
                )}
              >
                <Save size={18} />
                {editingRecord ? 'Salva Modifiche' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Impostazioni Colonne */}
      {showColumnSettings && (
        <ColumnSettingsModal
          columns={columns}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          onVisibilityChange={handleColumnVisibilityChange}
          onOrderChange={handleColumnOrderChange}
          onReset={handleResetPreferences}
          onClose={() => setShowColumnSettings(false)}
          accentColor={accentColor}
        />
      )}
    </div>
  );
}
