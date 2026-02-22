import React, { useState, useEffect, useCallback } from 'react';
import { Wrench } from 'lucide-react';
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
    placeholder: 'Nome officina',
    fullWidth: true,
  },
  { 
    key: 'tipo', 
    label: 'Tipo', 
    type: FieldTypes.BADGE, 
    sortable: true,
    options: [
      { value: 'meccanica', label: 'Meccanica' },
      { value: 'gommista', label: 'Gommista' },
      { value: 'elettrauto', label: 'Elettrauto' },
      { value: 'carrozzeria', label: 'Carrozzeria' },
      { value: 'multimarca', label: 'Multimarca' },
    ],
    badgeConfig: {
      meccanica: { bg: 'bg-primary-100', text: 'text-primary-700' },
      gommista: { bg: 'bg-gray-100', text: 'text-gray-700' },
      elettrauto: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      carrozzeria: { bg: 'bg-red-100', text: 'text-red-700' },
      multimarca: { bg: 'bg-green-100', text: 'text-green-700' },
    },
    badgeLabels: {
      meccanica: 'Meccanica',
      gommista: 'Gommista',
      elettrauto: 'Elettrauto',
      carrozzeria: 'Carrozzeria',
      multimarca: 'Multimarca',
    },
  },
  { 
    key: 'indirizzo', 
    label: 'Indirizzo', 
    type: FieldTypes.STRING,
    placeholder: 'Via/Piazza',
  },
  { 
    key: 'citta', 
    label: 'Città', 
    type: FieldTypes.STRING, 
    sortable: true,
    placeholder: 'Città',
  },
  { 
    key: 'provincia', 
    label: 'Prov.', 
    type: FieldTypes.STRING,
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
    key: 'telefonoEmergenza', 
    label: 'Tel. Emergenza', 
    type: FieldTypes.PHONE,
    hidden: true,
    placeholder: '333 1234567',
  },
  { 
    key: 'email', 
    label: 'Email', 
    type: FieldTypes.EMAIL,
    hidden: true,
    placeholder: 'officina@email.it',
  },
  { 
    key: 'orariApertura', 
    label: 'Orari', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'Lun-Ven 08:00-18:00',
  },
  { 
    key: 'servizi', 
    label: 'Servizi', 
    type: FieldTypes.TEXT,
    hidden: true,
    fullWidth: true,
    rows: 2,
    placeholder: 'Servizi offerti...',
  },
  { 
    key: 'convenzionato', 
    label: 'Convenzionato', 
    type: FieldTypes.BOOLEAN,
    checkboxLabel: 'Officina convenzionata',
  },
  { 
    key: 'note', 
    label: 'Note', 
    type: FieldTypes.TEXT,
    hidden: true,
    fullWidth: true,
    rows: 2,
  },
  { 
    key: 'attivo', 
    label: 'Stato', 
    type: FieldTypes.BOOLEAN,
    sortable: true,
    checkboxLabel: 'Officina attiva',
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
  tipo: 'meccanica',
  indirizzo: '',
  citta: '',
  provincia: '',
  telefono: '',
  telefonoEmergenza: '',
  email: '',
  orariApertura: '',
  servizi: '',
  convenzionato: false,
  note: '',
  attivo: true,
};

export default function Officine() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const filteredData = showOnlyActive ? data.filter(c => c.attivo) : data;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/gestionale/officine');
      setData(response.data || []);
    } catch (err) {
      console.error('Errore caricamento officine:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (record) => {
    try {
      const response = await api.post('/gestionale/officine', record);
      setData(prev => [...prev, response.data]);
    } catch (err) {
      console.error('Errore creazione:', err);
    }
  };

  const handleEdit = async (id, record) => {
    try {
      await api.put(`/gestionale/officine/${id}`, record);
      setData(prev => prev.map(c => c.id === id ? { ...record, id } : c));
    } catch (err) {
      console.error('Errore aggiornamento:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gestionale/officine/${id}`);
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
        title="Officine"
        subtitle="Rete officine e assistenza"
        icon={Wrench}
        accentColor="blue"
        emptyRecord={emptyRecord}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadData}
        searchable={true}
        searchPlaceholder="Cerca per nome o città..."
        searchFields={['ragioneSociale', 'citta', 'tipo']}
        filters={
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Solo attive</span>
          </label>
        }
        loading={loading}
        exportable={true}
        paginated={true}
        pageSize={15}
        storageKey="officine"
        emptyMessage="Nessuna officina trovata."
      />
    </div>
  );
}
