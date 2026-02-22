import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Receipt, 
  ShoppingCart, 
  Truck, 
  MapPinned, 
  BarChart3,
  ArrowRight,
  UserCircle,
  Package,
  Fuel,
  Wrench,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react';

const quickStats = [
  { label: 'Clienti Attivi', value: '124', icon: UserCircle, color: 'bg-primary-500' },
  { label: 'Ordini in Corso', value: '38', icon: Package, color: 'bg-green-500' },
  { label: 'Automezzi', value: '45', icon: Truck, color: 'bg-purple-500' },
  { label: 'Manutenzioni Programmate', value: '7', icon: Wrench, color: 'bg-amber-500' },
];

const modules = [
  { 
    title: 'Anagrafiche', 
    description: 'Gestione clienti, vettori, magazzini e autisti',
    icon: Users, 
    path: '/gestionale/anagrafiche/clienti',
    color: 'from-blue-500 to-blue-600',
    items: ['Clienti', 'Vettori', 'Mittenti/Destinatari', 'Piattaforme', 'Magazzino', 'Tipi Veicoli', 'Autisti', 'Officine', 'Tipi Documenti']
  },
  { 
    title: 'Fatture', 
    description: 'Fatturazione clienti e fornitori',
    icon: Receipt, 
    path: '/gestionale/fatture/clienti',
    color: 'from-emerald-500 to-emerald-600',
    badge: 'Prossimamente',
    items: ['Fatture Clienti', 'Fatture Fornitori']
  },
  { 
    title: 'Ordini', 
    description: 'Gestione ordini e magazzino',
    icon: ShoppingCart, 
    path: '/gestionale/ordini/lista',
    color: 'from-violet-500 to-violet-600',
    items: ['Lista Ordini', 'Da Abbinare', 'Gestione Magazzino']
  },
  { 
    title: 'Automezzi', 
    description: 'Flotta, rifornimenti e manutenzioni',
    icon: Truck, 
    path: '/gestionale/automezzi/lista',
    color: 'from-orange-500 to-orange-600',
    items: ['Lista Automezzi', 'Rifornimenti', 'Manutenzioni', 'Documenti']
  },
  { 
    title: 'Trasporti', 
    description: 'Pianificazione e gestione trasporti',
    icon: MapPinned, 
    path: '/gestionale/trasporti/pianificazione',
    color: 'from-rose-500 to-rose-600',
    badge: 'Prossimamente',
    items: ['Pianificazione']
  },
  { 
    title: 'Report', 
    description: 'Analisi e statistiche',
    icon: BarChart3, 
    path: '/gestionale/report/dashboard',
    color: 'from-cyan-500 to-cyan-600',
    badge: 'Prossimamente',
    items: ['Dashboard Report']
  },
];

const recentActivities = [
  { type: 'order', message: 'Nuovo ordine #1234 da Cliente ABC', time: '5 min fa', icon: Package },
  { type: 'maintenance', message: 'Manutenzione completata - Veicolo TG123AB', time: '1 ora fa', icon: Wrench },
  { type: 'refuel', message: 'Rifornimento registrato - 85L Diesel', time: '2 ore fa', icon: Fuel },
  { type: 'alert', message: 'Scadenza documenti - 3 veicoli', time: '3 ore fa', icon: AlertTriangle },
];

export default function GestionaleHome() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Gestionale</h1>
          <p className="text-gray-600">Panoramica delle attività e accesso rapido ai moduli</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={16} />
          <span>Ultimo aggiornamento: {new Date().toLocaleString('it-IT')}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modules Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Moduli</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module, index) => (
            <Link 
              key={index} 
              to={module.path}
              className="group bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all duration-200 hover:border-gray-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`bg-gradient-to-br ${module.color} p-3 rounded-lg`}>
                  <module.icon className="text-white" size={24} />
                </div>
                {module.badge && (
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                    {module.badge}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                {module.title}
              </h3>
              <p className="text-sm text-gray-500 mb-3">{module.description}</p>
              <div className="flex flex-wrap gap-1">
                {module.items.slice(0, 3).map((item, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {item}
                  </span>
                ))}
                {module.items.length > 3 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    +{module.items.length - 3}
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center text-sm text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Vai al modulo <ArrowRight size={16} className="ml-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Attività Recenti</h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Vedi tutte
            </button>
          </div>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <activity.icon size={16} className="text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Statistiche Rapide</h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Report completo
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Ordini completati questo mese</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">156</span>
                <span className="text-xs text-green-600 flex items-center">
                  <TrendingUp size={12} className="mr-0.5" /> +12%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Km totali percorsi</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">45.230</span>
                <span className="text-xs text-green-600 flex items-center">
                  <TrendingUp size={12} className="mr-0.5" /> +8%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Costo medio per km</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">€0.42</span>
                <span className="text-xs text-red-600 flex items-center">
                  <TrendingUp size={12} className="mr-0.5 rotate-180" /> -3%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Efficienza flotta</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">94%</span>
                <span className="text-xs text-green-600 flex items-center">
                  <TrendingUp size={12} className="mr-0.5" /> +2%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
