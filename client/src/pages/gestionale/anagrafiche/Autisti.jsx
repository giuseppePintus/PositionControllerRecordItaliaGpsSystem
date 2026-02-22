import React, { useState, useEffect, useCallback } from 'react';
import { Users } from 'lucide-react';
import { DataTable, FieldTypes } from '../../../components/ui';
import api from '../../../api';

const columns = [
  { 
    key: 'cognome', 
    label: 'Cognome', 
    type: FieldTypes.STRING, 
    sortable: true,
    alwaysVisible: true,
    required: true,
    placeholder: 'Rossi',
  },
  { 
    key: 'nome', 
    label: 'Nome', 
    type: FieldTypes.STRING, 
    sortable: true,
    required: true,
    placeholder: 'Mario',
  },
  { 
    key: 'codiceFiscale', 
    label: 'Codice Fiscale', 
    type: FieldTypes.STRING,
    placeholder: 'RSSMRA80A01H501Z',
    maxLength: 16,
  },
  { 
    key: 'telefono', 
    label: 'Telefono', 
    type: FieldTypes.PHONE, 
    required: true,
    placeholder: '333 1234567',
  },
  { 
    key: 'telefonoWhatsapp', 
    label: 'WhatsApp', 
    type: FieldTypes.PHONE,
    hidden: true,
    placeholder: '333 1234567',
  },
  { 
    key: 'email', 
    label: 'Email', 
    type: FieldTypes.EMAIL,
    hidden: true,
    placeholder: 'autista@email.it',
  },
  { 
    key: 'patenteNumero', 
    label: 'N° Patente', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'AB1234567',
  },
  { 
    key: 'patenteScadenza', 
    label: 'Scad. Patente', 
    type: FieldTypes.DATE,
    sortable: true,
  },
  { 
    key: 'cqcScadenza', 
    label: 'Scad. CQC', 
    type: FieldTypes.DATE,
    sortable: true,
  },
  { 
    key: 'cartaQualificazione', 
    label: 'N° CQC', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'IT123456789',
  },
  { 
    key: 'dataAssunzione', 
    label: 'Data Assunzione', 
    type: FieldTypes.DATE,
    hidden: true,
  },
  { 
    key: 'tipoContratto', 
    label: 'Contratto', 
    type: FieldTypes.SELECT,
    hidden: true,
    options: [
      { value: 'indeterminato', label: 'Indeterminato' },
      { value: 'determinato', label: 'Determinato' },
      { value: 'collaboratore', label: 'Collaboratore' },
    ],
    allowEmpty: true,
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
    checkboxLabel: 'Autista attivo',
  },
  { 
    key: 'actions', 
    label: 'Azioni', 
    align: 'right',
    alwaysVisible: true,
  },
];

const emptyRecord = {
  cognome: '',
  nome: '',
  codiceFiscale: '',
  telefono: '',
  telefonoWhatsapp: '',
  email: '',
  patenteNumero: '',
  patenteScadenza: '',
  cqcScadenza: '',
  cartaQualificazione: '',
  dataAssunzione: '',
  tipoContratto: '',
  note: '',
  attivo: true,
};

export default function Autisti() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const filteredData = showOnlyActive ? data.filter(c => c.attivo) : data;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/gestionale/autisti');
      setData(response.data || []);
    } catch (err) {
      console.error('Errore caricamento autisti:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (record) => {
    try {
      const response = await api.post('/gestionale/autisti', record);
      setData(prev => [...prev, response.data]);
    } catch (err) {
      console.error('Errore creazione:', err);
    }
  };

  const handleEdit = async (id, record) => {
    try {
      await api.put(`/gestionale/autisti/${id}`, record);
      setData(prev => prev.map(c => c.id === id ? { ...record, id } : c));
    } catch (err) {
      console.error('Errore aggiornamento:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gestionale/autisti/${id}`);
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
        title="Autisti"
        subtitle="Gestione anagrafica autisti"
        icon={Users}
        accentColor="blue"
        emptyRecord={emptyRecord}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadData}
        searchable={true}
        searchPlaceholder="Cerca per nome, cognome o telefono..."
        searchFields={['nome', 'cognome', 'telefono']}
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
        storageKey="autisti"
        emptyMessage="Nessun autista trovato."
      />
    </div>
  );
}
