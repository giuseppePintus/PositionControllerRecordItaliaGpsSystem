import React, { useState, useEffect, useCallback } from 'react';
import { Truck } from 'lucide-react';
import { DataTable, FieldTypes } from '../../../components/ui';
import api from '../../../api';

// Configurazione colonne per Vettori
const columns = [
  { 
    key: 'ragioneSociale', 
    label: 'Ragione Sociale', 
    type: FieldTypes.STRING, 
    sortable: true,
    alwaysVisible: true,
    required: true,
    placeholder: 'Inserisci ragione sociale',
    fullWidth: true,
  },
  { 
    key: 'partitaIva', 
    label: 'P.IVA', 
    type: FieldTypes.STRING, 
    sortable: true,
    required: true,
    placeholder: '01234567890',
    maxLength: 11,
  },
  { 
    key: 'codiceFiscale', 
    label: 'Codice Fiscale', 
    type: FieldTypes.STRING,
    placeholder: 'Codice fiscale',
    maxLength: 16,
  },
  { 
    key: 'tipoVettore', 
    label: 'Tipo', 
    type: FieldTypes.BADGE,
    sortable: true,
    options: [
      { value: 'Nazionale', label: 'Nazionale' },
      { value: 'Internazionale', label: 'Internazionale' },
      { value: 'Regionale', label: 'Regionale' },
      { value: 'Locale', label: 'Locale' },
    ],
    badgeConfig: {
      'Internazionale': { bg: 'bg-purple-100', text: 'text-purple-700' },
      'Nazionale': { bg: 'bg-primary-100', text: 'text-primary-700' },
      'Regionale': { bg: 'bg-green-100', text: 'text-green-700' },
      'Locale': { bg: 'bg-gray-100', text: 'text-gray-700' },
    },
  },
  { 
    key: 'indirizzo', 
    label: 'Indirizzo', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'Via/Corso/Piazza',
  },
  { 
    key: 'citta', 
    label: 'Città', 
    type: FieldTypes.STRING, 
    sortable: true,
    placeholder: 'Città',
  },
  { 
    key: 'cap', 
    label: 'CAP', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: '00000',
    maxLength: 5,
  },
  { 
    key: 'provincia', 
    label: 'Prov.', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'MI',
    maxLength: 2,
  },
  { 
    key: 'telefono', 
    label: 'Telefono', 
    type: FieldTypes.PHONE, 
    placeholder: '02 1234567',
  },
  { 
    key: 'email', 
    label: 'Email', 
    type: FieldTypes.EMAIL,
    placeholder: 'info@esempio.it',
  },
  { 
    key: 'pec', 
    label: 'PEC', 
    type: FieldTypes.EMAIL,
    hidden: true,
    placeholder: 'azienda@pec.it',
  },
  { 
    key: 'codiceDestinatario', 
    label: 'Cod. Dest.', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'ABC1234',
    maxLength: 7,
  },
  { 
    key: 'note', 
    label: 'Note', 
    type: FieldTypes.TEXT,
    hideInForm: false,
    hidden: true,
    fullWidth: true,
    rows: 3,
    placeholder: 'Note aggiuntive...',
  },
  { 
    key: 'attivo', 
    label: 'Stato', 
    type: FieldTypes.BOOLEAN,
    sortable: true,
    checkboxLabel: 'Vettore attivo',
  },
  { 
    key: 'actions', 
    label: 'Azioni', 
    align: 'right',
    alwaysVisible: true,
  },
];

// Record vuoto per nuovo vettore
const emptyVettore = {
  ragioneSociale: '',
  partitaIva: '',
  codiceFiscale: '',
  tipoVettore: 'Nazionale',
  indirizzo: '',
  citta: '',
  cap: '',
  provincia: '',
  telefono: '',
  email: '',
  pec: '',
  codiceDestinatario: '',
  note: '',
  attivo: true,
};

export default function Vettori() {
  const [vettori, setVettori] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const filteredData = showOnlyActive 
    ? vettori.filter(v => v.attivo) 
    : vettori;

  // Carica dati da API
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/gestionale/vettori');
      setVettori(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Errore caricamento vettori:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers CRUD
  const handleAdd = async (data) => {
    try {
      const response = await api.post('/gestionale/vettori', data);
      setVettori(prev => [...prev, response.data]);
    } catch (err) {
      console.error('Errore creazione vettore:', err);
    }
  };

  const handleEdit = async (id, data) => {
    try {
      await api.put(`/gestionale/vettori/${id}`, data);
      setVettori(prev => prev.map(v => v.id === id ? { ...data, id } : v));
    } catch (err) {
      console.error('Errore aggiornamento vettore:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gestionale/vettori/${id}`);
      setVettori(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Errore eliminazione vettore:', err);
    }
  };

  return (
    <div className="p-6">
      <DataTable
        // Dati
        data={filteredData}
        columns={columns}
        
        // Configurazione
        title="Vettori"
        subtitle="Gestione anagrafica vettori e corrieri"
        icon={Truck}
        accentColor="blue"  // Tema Gestionale
        
        // Record vuoto
        emptyRecord={emptyVettore}
        
        // CRUD callbacks
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadData}
        
        // Ricerca
        searchable={true}
        searchPlaceholder="Cerca per ragione sociale, P.IVA o città..."
        searchFields={['ragioneSociale', 'partitaIva', 'citta']}
        
        // Filtri custom
        filters={
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Solo attivi</span>
          </label>
        }
        
        // Features
        loading={loading}
        exportable={true}
        paginated={true}
        
        // Persistenza preferenze
        storageKey="vettori"
        
        // Messaggi
        emptyMessage="Nessun vettore trovato. Clicca su 'Nuovo' per aggiungerne uno."
      />
    </div>
  );
}
