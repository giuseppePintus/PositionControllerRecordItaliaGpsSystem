import React, { useState, useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { DataTable, FieldTypes } from '../../../components/ui';
import api from '../../../api';

const columns = [
  { 
    key: 'nome', 
    label: 'Nome Documento', 
    type: FieldTypes.STRING, 
    sortable: true,
    alwaysVisible: true,
    required: true,
    placeholder: 'Es: DDT, CMR, Fattura...',
    fullWidth: true,
  },
  { 
    key: 'codice', 
    label: 'Codice', 
    type: FieldTypes.STRING, 
    sortable: true,
    placeholder: 'DDT',
    maxLength: 10,
  },
  { 
    key: 'categoria', 
    label: 'Categoria', 
    type: FieldTypes.BADGE, 
    sortable: true,
    options: [
      { value: 'trasporto', label: 'Trasporto' },
      { value: 'amministrativo', label: 'Amministrativo' },
      { value: 'veicolo', label: 'Veicolo' },
      { value: 'autista', label: 'Autista' },
      { value: 'altro', label: 'Altro' },
    ],
    badgeConfig: {
      trasporto: { bg: 'bg-primary-100', text: 'text-primary-700' },
      amministrativo: { bg: 'bg-green-100', text: 'text-green-700' },
      veicolo: { bg: 'bg-orange-100', text: 'text-orange-700' },
      autista: { bg: 'bg-purple-100', text: 'text-purple-700' },
      altro: { bg: 'bg-gray-100', text: 'text-gray-700' },
    },
    badgeLabels: {
      trasporto: 'Trasporto',
      amministrativo: 'Amministrativo',
      veicolo: 'Veicolo',
      autista: 'Autista',
      altro: 'Altro',
    },
  },
  { 
    key: 'descrizione', 
    label: 'Descrizione', 
    type: FieldTypes.TEXT,
    hidden: true,
    fullWidth: true,
    rows: 2,
    placeholder: 'Descrizione del documento...',
  },
  { 
    key: 'obbligatorio', 
    label: 'Obbligatorio', 
    type: FieldTypes.BOOLEAN,
    checkboxLabel: 'Documento obbligatorio',
  },
  { 
    key: 'scadenza', 
    label: 'Ha Scadenza', 
    type: FieldTypes.BOOLEAN,
    checkboxLabel: 'Prevede scadenza',
  },
  { 
    key: 'giorniPreavviso', 
    label: 'Giorni Preavviso', 
    type: FieldTypes.INTEGER,
    hidden: true,
    placeholder: '30',
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
  categoria: 'trasporto',
  descrizione: '',
  obbligatorio: false,
  scadenza: false,
  giorniPreavviso: 30,
  note: '',
  attivo: true,
};

export default function TipiDocumenti() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const filteredData = showOnlyActive ? data.filter(c => c.attivo) : data;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/gestionale/tipi-documenti');
      setData(response.data || []);
    } catch (err) {
      console.error('Errore caricamento tipi documenti:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (record) => {
    try {
      const response = await api.post('/gestionale/tipi-documenti', record);
      setData(prev => [...prev, response.data]);
    } catch (err) {
      console.error('Errore creazione:', err);
    }
  };

  const handleEdit = async (id, record) => {
    try {
      await api.put(`/gestionale/tipi-documenti/${id}`, record);
      setData(prev => prev.map(c => c.id === id ? { ...record, id } : c));
    } catch (err) {
      console.error('Errore aggiornamento:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gestionale/tipi-documenti/${id}`);
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
        title="Tipi Documenti"
        subtitle="Configurazione tipologie documenti"
        icon={FileText}
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
        storageKey="tipi_documenti"
        emptyMessage="Nessun tipo documento configurato."
      />
    </div>
  );
}
