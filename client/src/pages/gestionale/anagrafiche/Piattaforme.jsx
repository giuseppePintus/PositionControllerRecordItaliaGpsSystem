import React, { useState, useEffect, useCallback } from 'react';
import { Building2 } from 'lucide-react';
import { DataTable, FieldTypes } from '../../../components/ui';
import api from '../../../api';

const columns = [
  { 
    key: 'nome', 
    label: 'Nome Piattaforma', 
    type: FieldTypes.STRING, 
    sortable: true,
    alwaysVisible: true,
    required: true,
    placeholder: 'Nome piattaforma logistica',
    fullWidth: true,
  },
  { 
    key: 'codice', 
    label: 'Codice', 
    type: FieldTypes.STRING, 
    sortable: true,
    placeholder: 'PL001',
    maxLength: 10,
  },
  { 
    key: 'indirizzo', 
    label: 'Indirizzo', 
    type: FieldTypes.STRING,
    placeholder: 'Via/Piazza',
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
    placeholder: 'logistica@esempio.it',
  },
  { 
    key: 'responsabile', 
    label: 'Responsabile', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'Nome referente',
  },
  { 
    key: 'orariApertura', 
    label: 'Orari', 
    type: FieldTypes.STRING,
    placeholder: '06:00-22:00',
  },
  { 
    key: 'costoAccesso', 
    label: 'Costo Accesso', 
    type: FieldTypes.CURRENCY,
    hidden: true,
    placeholder: '0.00',
  },
  { 
    key: 'note', 
    label: 'Note', 
    type: FieldTypes.TEXT,
    hidden: true,
    fullWidth: true,
    rows: 3,
    placeholder: 'Note sulla piattaforma...',
  },
  { 
    key: 'attivo', 
    label: 'Stato', 
    type: FieldTypes.BOOLEAN,
    sortable: true,
    checkboxLabel: 'Piattaforma attiva',
  },
  { 
    key: 'actions', 
    label: 'Azioni', 
    align: 'right',
    alwaysVisible: true,
  },
];

const emptyRecord = {
  nome: '',
  codice: '',
  indirizzo: '',
  citta: '',
  cap: '',
  provincia: '',
  telefono: '',
  email: '',
  responsabile: '',
  orariApertura: '',
  costoAccesso: 0,
  note: '',
  attivo: true,
};

export default function Piattaforme() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const filteredData = showOnlyActive ? data.filter(c => c.attivo) : data;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/gestionale/piattaforme');
      setData(response.data || []);
    } catch (err) {
      console.error('Errore caricamento piattaforme:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (record) => {
    try {
      const response = await api.post('/gestionale/piattaforme', record);
      setData(prev => [...prev, response.data]);
    } catch (err) {
      console.error('Errore creazione:', err);
    }
  };

  const handleEdit = async (id, record) => {
    try {
      await api.put(`/gestionale/piattaforme/${id}`, record);
      setData(prev => prev.map(c => c.id === id ? { ...record, id } : c));
    } catch (err) {
      console.error('Errore aggiornamento:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gestionale/piattaforme/${id}`);
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
        title="Piattaforme Logistiche"
        subtitle="Centri di distribuzione e piattaforme"
        icon={Building2}
        accentColor="blue"
        emptyRecord={emptyRecord}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadData}
        searchable={true}
        searchPlaceholder="Cerca per nome o città..."
        searchFields={['nome', 'citta', 'codice']}
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
        storageKey="piattaforme"
        emptyMessage="Nessuna piattaforma trovata."
      />
    </div>
  );
}
