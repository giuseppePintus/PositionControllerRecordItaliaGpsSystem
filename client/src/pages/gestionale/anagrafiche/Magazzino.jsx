import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse } from 'lucide-react';
import { DataTable, FieldTypes } from '../../../components/ui';
import api from '../../../api';

const columns = [
  { 
    key: 'codice', 
    label: 'Codice', 
    type: FieldTypes.STRING, 
    sortable: true,
    alwaysVisible: true,
    required: true,
    placeholder: 'ART001',
    maxLength: 20,
  },
  { 
    key: 'descrizione', 
    label: 'Descrizione', 
    type: FieldTypes.STRING, 
    sortable: true,
    required: true,
    placeholder: 'Descrizione articolo',
    fullWidth: true,
  },
  { 
    key: 'categoria', 
    label: 'Categoria', 
    type: FieldTypes.SELECT, 
    sortable: true,
    options: [
      { value: 'ricambi', label: 'Ricambi' },
      { value: 'consumabili', label: 'Consumabili' },
      { value: 'attrezzature', label: 'Attrezzature' },
      { value: 'altro', label: 'Altro' },
    ],
    allowEmpty: true,
  },
  { 
    key: 'unitaMisura', 
    label: 'U.M.', 
    type: FieldTypes.SELECT,
    options: [
      { value: 'pz', label: 'PZ' },
      { value: 'kg', label: 'KG' },
      { value: 'lt', label: 'LT' },
      { value: 'mt', label: 'MT' },
      { value: 'conf', label: 'CONF' },
    ],
  },
  { 
    key: 'giacenza', 
    label: 'Giacenza', 
    type: FieldTypes.INTEGER, 
    sortable: true,
  },
  { 
    key: 'scorataMinima', 
    label: 'Scorta Min.', 
    type: FieldTypes.INTEGER,
    hidden: true,
  },
  { 
    key: 'prezzoAcquisto', 
    label: 'Prezzo Acq.', 
    type: FieldTypes.CURRENCY,
    hidden: true,
  },
  { 
    key: 'fornitore', 
    label: 'Fornitore', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'Nome fornitore',
  },
  { 
    key: 'ubicazione', 
    label: 'Ubicazione', 
    type: FieldTypes.STRING,
    hidden: true,
    placeholder: 'Scaffale/Ripiano',
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
    checkboxLabel: 'Articolo attivo',
  },
  { 
    key: 'actions', 
    label: 'Azioni', 
    align: 'right',
    alwaysVisible: true,
  },
];

const emptyRecord = {
  codice: '',
  descrizione: '',
  categoria: '',
  unitaMisura: 'pz',
  giacenza: 0,
  scorataMinima: 0,
  prezzoAcquisto: 0,
  fornitore: '',
  ubicazione: '',
  note: '',
  attivo: true,
};

export default function Magazzino() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const filteredData = showOnlyActive ? data.filter(c => c.attivo) : data;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/gestionale/magazzino');
      setData(response.data || []);
    } catch (err) {
      console.error('Errore caricamento magazzino:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (record) => {
    try {
      const response = await api.post('/gestionale/magazzino', record);
      setData(prev => [...prev, response.data]);
    } catch (err) {
      console.error('Errore creazione:', err);
    }
  };

  const handleEdit = async (id, record) => {
    try {
      await api.put(`/gestionale/magazzino/${id}`, record);
      setData(prev => prev.map(c => c.id === id ? { ...record, id } : c));
    } catch (err) {
      console.error('Errore aggiornamento:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gestionale/magazzino/${id}`);
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
        title="Magazzino"
        subtitle="Gestione articoli e giacenze"
        icon={Warehouse}
        accentColor="blue"
        emptyRecord={emptyRecord}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadData}
        searchable={true}
        searchPlaceholder="Cerca per codice o descrizione..."
        searchFields={['codice', 'descrizione', 'categoria']}
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
        pageSize={20}
        storageKey="magazzino"
        emptyMessage="Nessun articolo in magazzino."
      />
    </div>
  );
}
