# 🚛 GPS Tracker System - Record Italia

Sistema di monitoraggio GPS per veicoli con geofencing, allarmi e notifiche in tempo reale.

## ✨ Funzionalità

- **🗺️ Mappa interattiva** - Visualizza tutti i veicoli in tempo reale su OpenStreetMap (gratuito)
- **📍 Geofencing** - Disegna zone sulla mappa e ricevi notifiche quando i veicoli entrano/escono
- **🔔 Notifiche multi-canale**:
  - Push notifications nel browser
  - Bot Telegram
- **📊 Gestione tratte** - Configura percorsi con checkpoint e orari previsti
- **⏰ Allarmi intelligenti** - Notifiche per ritardi, mancate partenze/arrivi
- **📱 PWA** - Installabile su smartphone come app nativa
- **🚛 Gestione flotta** - Supporta 50-60 veicoli (camion + rimorchio)

## 🛠️ Tecnologie

- **Backend**: Node.js + Express
- **Frontend**: React + Vite + TailwindCSS
- **Database**: SQLite (leggero, zero configurazione)
- **Mappa**: Leaflet + OpenStreetMap (gratuito)
- **Notifiche**: Telegram Bot + Web Push

## 🚀 Installazione Rapida

### Prerequisiti
- Node.js 18+
- npm o yarn

### 1. Clona e installa

```bash
cd PositionControllerRecordItaliaGpsSystem
npm run setup
```

### 2. Configura le variabili d'ambiente

Modifica il file `.env`:

```env
# API Record Italia (già configurato)
RECORD_ITALIA_SECRET=w0JvFaOLAWVke7XEUjwtupFhp

# Telegram Bot (opzionale ma consigliato)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Push Notifications (genera con: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_EMAIL=mailto:your@email.com
```

### 3. Avvia in sviluppo

```bash
npm run dev
```

L'app sarà disponibile su:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### 4. Login

Credenziali default:
- **Username**: `admin`
- **Password**: `admin123`

## 📱 Configurazione Telegram Bot

1. Apri Telegram e cerca `@BotFather`
2. Invia `/newbot` e segui le istruzioni
3. Copia il token e inseriscilo in `.env`
4. Avvia una chat con il tuo bot
5. Invia `/start` per ottenere il tuo Chat ID
6. Inserisci il Chat ID in `.env` o nelle impostazioni dell'app

## 🌐 Deploy in Produzione

### Opzione 1: Docker (Consigliato)

```bash
# Build e avvia
docker-compose up -d

# Verifica logs
docker-compose logs -f
```

### Opzione 2: Deploy manuale

```bash
# Build frontend
npm run build

# Avvia in produzione
NODE_ENV=production npm start
```

### 🆓 Hosting Gratuiti/Economici Consigliati

| Servizio | Costo | Note |
|----------|-------|------|
| **Railway.app** | Gratis (500h/mese) → $5/mese | Facile deploy da GitHub |
| **Render.com** | Gratis (750h/mese) | Sleep dopo inattività |
| **Fly.io** | Gratis (3 VMs small) | Ottimo per 24/7 |
| **Oracle Cloud** | Sempre gratis | 2 VM ARM, più complesso |
| **Hetzner VPS** | €3.79/mese | VPS dedicato, affidabile |

### Deploy su Railway (Consigliato)

1. Crea account su [railway.app](https://railway.app)
2. Collega il tuo repository GitHub
3. Aggiungi le variabili d'ambiente nel pannello
4. Deploy automatico!

### Deploy su Fly.io

```bash
# Installa CLI
curl -L https://fly.io/install.sh | sh

# Login e deploy
fly auth login
fly launch
fly secrets set RECORD_ITALIA_SECRET=w0JvFaOLAWVke7XEUjwtupFhp
fly deploy
```

## 📖 Utilizzo

### Dashboard
- Visualizza tutti i veicoli sulla mappa
- Stato in tempo reale (in movimento/fermo)
- Eventi recenti

### Geofence
1. Clicca "+" per creare una nuova zona
2. Usa gli strumenti di disegno sulla mappa (poligono o cerchio)
3. Assegna un nome e un colore
4. Salva

### Tratte
1. Crea una nuova tratta
2. Assegna a un veicolo specifico (opzionale)
3. Aggiungi checkpoint con:
   - Zona geofence di riferimento
   - Orario previsto di arrivo
   - Orario previsto di partenza
   - Tolleranza in minuti

### Allarmi
- **Ingresso/Uscita zona**: Notifica quando un veicolo entra o esce da una zona
- **Ritardo arrivo**: Notifica se il veicolo non arriva entro l'orario previsto
- **Mancata partenza**: Notifica se il veicolo non parte entro l'orario previsto

## 🔧 API Endpoints

### Posizioni
- `GET /api/positions` - Tutte le posizioni correnti
- `GET /api/positions/fleet/:id` - Posizioni di una flotta
- `GET /api/history/:idServizio?from=&to=` - Storico posizioni

### Veicoli
- `GET /api/vehicles` - Lista veicoli
- `PUT /api/vehicles/:id` - Aggiorna veicolo

### Geofence
- `GET /api/geofences` - Lista geofence
- `POST /api/geofences` - Crea geofence
- `PUT /api/geofences/:id` - Aggiorna
- `DELETE /api/geofences/:id` - Elimina

### Allarmi
- `GET /api/alarms` - Lista allarmi
- `POST /api/alarms` - Crea allarme
- `PUT /api/alarms/:id` - Aggiorna
- `DELETE /api/alarms/:id` - Elimina

### Monitoraggio
- `GET /api/monitoring/status` - Stato monitoraggio
- `POST /api/monitoring/check` - Forza controllo
- `POST /api/monitoring/start` - Avvia
- `POST /api/monitoring/stop` - Ferma

## 📝 Note

- Il database SQLite viene creato automaticamente in `data/gps_system.db`
- I veicoli vengono registrati automaticamente quando ricevono dati GPS
- Le notifiche push richiedono HTTPS in produzione
- Il monitoraggio controlla le posizioni ogni 5 minuti (configurabile)

## 🤝 Supporto

Per problemi o domande, apri una issue su GitHub.

## 📄 Licenza

MIT License
