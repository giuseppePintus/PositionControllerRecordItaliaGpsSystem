import React, { useState, useEffect, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { DataTable, FieldTypes } from '../../../components/ui';
import api from '../../../api';

const columns = [
  { 
    key: 'ragioneSociale', 
    label: 'Ragione Sociale', 
    type: FieldTypes.STRING, 
    sortable: true,
    alwaysVisible: true,
    required: true,
    placeholder: 'Nome azienda o persona',
    fullWidth: true,
  },
  { 
    key: 'tipo', 
    label: 'Tipo', 
    type: FieldTypes.BADGE, 
    sortable: true,
    required: true,
    options: [
      { value: 'mittente', label: 'Mittente' },
      { value: 'destinatario', label: 'Destinatario' },
      { value: 'entrambi', label: 'Mittente/Destinatario' },
    ],
    badgeConfig: {
      mittente: { bg: 'bg-primary-100', text: 'text-primary-700' },
      destinatario: { bg: 'bg-green-100', text: 'text-green-700' },
      entrambi: { bg: 'bg-purple-100', text: 'text-purple-700' },
    },
    badgeLabels: {
      mittente: 'Mittente',
      destinatario: 'Destinatario',
      entrambi: 'Mitt./Dest.',
    },
  },
  { 
    key: 'indirizzo', 
    label: 'Indirizzo', 
    type: FieldTypes.STRING,
    placeholder: 'Via/Piazza/Corso',
    fullWidth: true,
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
    placeholder: 'MI',
    maxLength: 2,
  },
  { 
    key: 'nazione', 
    label: 'Nazione', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'IT',
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
    hidden: true,
    placeholder: 'info@esempio.it',
  },
  { 
    key: 'riferimento', 
    label: 'Riferimento', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'Nome referente',
  },
  { 
    key: 'orariApertura', 
    label: 'Orari Apertura', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: '08:00-18:00',
  },
  { 
    key: 'note', 
    label: 'Note', 
    type: FieldTypes.TEXT,
    hidden: true,
    fullWidth: true,
    rows: 3,
    placeholder: 'Note di consegna/ritiro...',
  },
  { 
    key: 'attivo', 
    label: 'Stato', 
    type: FieldTypes.BOOLEAN,
    sortable: true,
    checkboxLabel: 'Attivo',
  },
  { 
    key: 'actions', 
    label: 'Azioni', 
    align: 'right',
    alwaysVisible: true,
  },
];

const emptyRecord = {
  ragioneSociale: '',
  tipo: 'destinatario',
  indirizzo: '',
  citta: '',
  cap: '',
  provincia: '',
  nazione: 'IT',
  telefono: '',
  email: '',
  riferimento: '',
  orariApertura: '',
  note: '',
  attivo: true,
};

export default function MittentiDestinatari() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const filteredData = showOnlyActive ? data.filter(c => c.attivo) : data;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/gestionale/mittenti-destinatari');
      setData(response.data || []);
    } catch (err) {
      console.error('Errore caricamento mittenti/destinatari:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (record) => {
    try {
      const response = await api.post('/gestionale/mittenti-destinatari', record);
      setData(prev => [...prev, response.data]);
    } catch (err) {
      console.error('Errore creazione:', err);
    }
  };

  const handleEdit = async (id, record) => {
    try {
      await api.put(`/gestionale/mittenti-destinatari/${id}`, record);
      setData(prev => prev.map(c => c.id === id ? { ...record, id } : c));
    } catch (err) {
      console.error('Errore aggiornamento:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gestionale/mittenti-destinatari/${id}`);
      setData(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Errore eliminazione:', err);
    }
  };

  return (
    <div className="p-6">
      <DataTable
        data={filteredData}
        columns={columns}
        title="Mittenti / Destinatari"
        subtitle="Punti di carico e scarico merce"
        icon={MapPin}
        accentColor="blue"
        emptyRecord={emptyRecord}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadData}
        searchable={true}
        searchPlaceholder="Cerca per nome, città o indirizzo..."
        searchFields={['ragioneSociale', 'citta', 'indirizzo']}
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
        pageSize={15}
        storageKey="mittenti_destinatari"
        emptyMessage="Nessun mittente/destinatario trovato."
      />
    </div>
  );
}
