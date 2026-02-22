import React, { useState, useEffect, useCallback } from 'react';
import { UserCircle } from 'lucide-react';
import { DataTable, FieldTypes } from '../../../components/ui';
import api from '../../../api';

// Configurazione colonne per Clienti
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
    hidden: true,
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
    label: 'Cod. SDI', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'ABC1234',
    maxLength: 7,
  },
  { 
    key: 'note', 
    label: 'Note', 
    type: FieldTypes.TEXT,
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
    checkboxLabel: 'Cliente attivo',
  },
  { 
    key: 'actions', 
    label: 'Azioni', 
    align: 'right',
    alwaysVisible: true,
  },
];

// Record vuoto per nuovo cliente
const emptyCliente = {
  ragioneSociale: '',
  partitaIva: '',
  codiceFiscale: '',
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

export default function Clienti() {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const filteredData = showOnlyActive 
    ? clienti.filter(c => c.attivo) 
    : clienti;

  // Carica dati da API
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/gestionale/clienti');
      setClienti(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Errore caricamento clienti:', err);
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
      const response = await api.post('/gestionale/clienti', data);
      setClienti(prev => [...prev, response.data]);
    } catch (err) {
      console.error('Errore creazione cliente:', err);
    }
  };

  const handleEdit = async (id, data) => {
    try {
      await api.put(`/gestionale/clienti/${id}`, data);
      setClienti(prev => prev.map(c => c.id === id ? { ...data, id } : c));
    } catch (err) {
      console.error('Errore aggiornamento cliente:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gestionale/clienti/${id}`);
      setClienti(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Errore eliminazione cliente:', err);
    }
  };

  return (
    <div className="p-6">
      <DataTable
        data={filteredData}
        columns={columns}
        title="Clienti"
        subtitle="Gestione anagrafica clienti"
        icon={UserCircle}
        accentColor="blue"
        emptyRecord={emptyCliente}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadData}
        searchable={true}
        searchPlaceholder="Cerca per ragione sociale, P.IVA o città..."
        searchFields={['ragioneSociale', 'partitaIva', 'citta']}
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
        loading={loading}
        exportable={true}
        paginated={true}
        storageKey="clienti"
        emptyMessage="Nessun cliente trovato. Clicca su 'Nuovo' per aggiungerne uno."
      />
    </div>
  );
}
