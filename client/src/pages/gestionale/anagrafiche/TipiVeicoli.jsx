import React, { useState, useEffect, useCallback } from 'react';
import { Truck } from 'lucide-react';
import { DataTable, FieldTypes } from '../../../components/ui';
import api from '../../../api';

const columns = [
  { 
    key: 'nome', 
    label: 'Tipo Veicolo', 
    type: FieldTypes.STRING, 
    sortable: true,
    alwaysVisible: true,
    required: true,
    placeholder: 'Es: Trattore + Semirimorchio',
    fullWidth: true,
  },
  { 
    key: 'codice', 
    label: 'Codice', 
    type: FieldTypes.STRING, 
    sortable: true,
    placeholder: 'TIR',
    maxLength: 10,
  },
  { 
    key: 'categoria', 
    label: 'Categoria', 
    type: FieldTypes.BADGE, 
    sortable: true,
    options: [
      { value: 'autoarticolato', label: 'Autoarticolato' },
      { value: 'autocarro', label: 'Autocarro' },
      { value: 'furgone', label: 'Furgone' },
      { value: 'rimorchio', label: 'Rimorchio' },
    ],
    badgeConfig: {
      autoarticolato: { bg: 'bg-primary-100', text: 'text-primary-700' },
      autocarro: { bg: 'bg-green-100', text: 'text-green-700' },
      furgone: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      rimorchio: { bg: 'bg-gray-100', text: 'text-gray-700' },
    },
    badgeLabels: {
      autoarticolato: 'Autoarticolato',
      autocarro: 'Autocarro',
      furgone: 'Furgone',
      rimorchio: 'Rimorchio',
    },
  },
  { 
    key: 'lunghezza', 
    label: 'Lunghezza (m)', 
    type: FieldTypes.FLOAT, 
    decimals: 2,
    placeholder: '16.50',
  },
  { 
    key: 'larghezza', 
    label: 'Larghezza (m)', 
    type: FieldTypes.FLOAT,
    hidden: true,
    decimals: 2,
    placeholder: '2.55',
  },
  { 
    key: 'altezza', 
    label: 'Altezza (m)', 
    type: FieldTypes.FLOAT,
    hidden: true,
    decimals: 2,
    placeholder: '4.00',
  },
  { 
    key: 'pesoMax', 
    label: 'Peso Max (t)', 
    type: FieldTypes.FLOAT, 
    decimals: 1,
    placeholder: '44.0',
  },
  { 
    key: 'portataUtile', 
    label: 'Portata (t)', 
    type: FieldTypes.FLOAT,
    hidden: true,
    decimals: 1,
    placeholder: '26.0',
  },
  { 
    key: 'volumeUtile', 
    label: 'Volume (m³)', 
    type: FieldTypes.FLOAT,
    hidden: true,
    decimals: 1,
    placeholder: '90.0',
  },
  { 
    key: 'numAssi', 
    label: 'N° Assi', 
    type: FieldTypes.INTEGER,
    hidden: true,
    placeholder: '5',
  },
  { 
    key: 'euroClasse', 
    label: 'Classe Euro', 
    type: FieldTypes.SELECT,
    hidden: true,
    options: [
      { value: 'euro3', label: 'Euro 3' },
      { value: 'euro4', label: 'Euro 4' },
      { value: 'euro5', label: 'Euro 5' },
      { value: 'euro6', label: 'Euro 6' },
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
    checkboxLabel: 'Tipo attivo',
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
  categoria: 'autoarticolato',
  lunghezza: 16.50,
  larghezza: 2.55,
  altezza: 4.00,
  pesoMax: 44.0,
  portataUtile: 26.0,
  volumeUtile: 90.0,
  numAssi: 5,
  euroClasse: 'euro6',
  note: '',
  attivo: true,
};

export default function TipiVeicoli() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const filteredData = showOnlyActive ? data.filter(c => c.attivo) : data;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/gestionale/tipi-veicoli');
      setData(response.data || []);
    } catch (err) {
      console.error('Errore caricamento tipi veicoli:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (record) => {
    try {
      const response = await api.post('/gestionale/tipi-veicoli', record);
      setData(prev => [...prev, response.data]);
    } catch (err) {
      console.error('Errore creazione:', err);
    }
  };

  const handleEdit = async (id, record) => {
    try {
      await api.put(`/gestionale/tipi-veicoli/${id}`, record);
      setData(prev => prev.map(c => c.id === id ? { ...record, id } : c));
    } catch (err) {
      console.error('Errore aggiornamento:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gestionale/tipi-veicoli/${id}`);
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
        title="Tipi Veicoli"
        subtitle="Configurazione tipologie veicoli"
        icon={Truck}
        accentColor="blue"
        emptyRecord={emptyRecord}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadData}
        searchable={true}
        searchPlaceholder="Cerca per nome o codice..."
        searchFields={['nome', 'codice', 'categoria']}
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
        storageKey="tipi_veicoli"
        emptyMessage="Nessun tipo veicolo configurato."
      />
    </div>
  );
}
