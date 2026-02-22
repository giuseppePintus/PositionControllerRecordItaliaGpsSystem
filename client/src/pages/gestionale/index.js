// Gestionale Pages Index
// Export all gestionale pages from this file

// Home
export { default as GestionaleHome } from './GestionaleHome';

// Anagrafiche
export { default as Clienti } from './anagrafiche/Clienti';
export { default as Vettori } from './anagrafiche/Vettori';
export { default as MittentiDestinatari } from './anagrafiche/MittentiDestinatari';
export { default as Piattaforme } from './anagrafiche/Piattaforme';
export { default as Magazzino } from './anagrafiche/Magazzino';
export { default as TipiVeicoli } from './anagrafiche/TipiVeicoli';
export { default as Autisti } from './anagrafiche/Autisti';
export { default as Officine } from './anagrafiche/Officine';
export { default as TipiDocumenti } from './anagrafiche/TipiDocumenti';

// Fatture
export { default as FattureClienti } from './fatture/FattureClienti';
export { default as FattureFornitori } from './fatture/FattureFornitori';

// Ordini
export { default as ListaOrdini } from './ordini/ListaOrdini';
export { default as OrdiniDaAbbinare } from './ordini/OrdiniDaAbbinare';
export { default as GestioneMagazzino } from './ordini/GestioneMagazzino';

// Automezzi
export { default as ListaAutomezzi } from './automezzi/ListaAutomezzi';
export { default as Rifornimenti } from './automezzi/Rifornimenti';
export { default as Manutenzioni } from './automezzi/Manutenzioni';
export { default as DocumentiAutomezzi } from './automezzi/DocumentiAutomezzi';

// Trasporti
export { default as Pianificazione } from './trasporti/Pianificazione';

// Report
export { default as DashboardReport } from './report/DashboardReport';
