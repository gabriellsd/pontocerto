# PontoCerto

Sistema de Controlo de Ponto Digital — **Vite + React + TypeScript + Tailwind** no frontend, **Express + tsx** no backend com persistência em ficheiro JSON.

## Arquitetura

```
┌────────────────┐    HTTP (proxy)    ┌────────────────┐    fs    ┌───────────────────┐
│  React + Vite  │ ──── /api/state ──▶│  Express 5     │ ───────▶ │ data/             │
│  localhost:5173│ ◀── JSON state ────│  localhost:3001│ ◀─────── │  pontocerto.json  │
└────────────────┘                    └────────────────┘          └───────────────────┘
```

- O frontend faz GET inicial a `/api/state` para hidratação
- Cada alteração faz PUT debounced (600 ms) para `/api/state`
- O servidor grava de forma **atómica** (escrita em `.tmp` → rename) e mantém um backup automático em `pontocerto.json.bak`
- Em caso de servidor indisponível, a app continua a funcionar localmente via `localStorage` (cache) e mostra badge **Offline** no header

## Como correr

```bash
npm install

# arranca frontend (5173) + servidor (3001) em paralelo
npm run dev

# apenas o frontend
npm run dev:client

# apenas o servidor
npm run dev:server     # com auto-reload
npm run start:server   # sem watch (produção local)

# build de produção do frontend
npm run build
```

## Estrutura

```
Relogio Ponto/
├── data/                          # criada automaticamente
│   └── pontocerto.json            # base de dados (gitignored)
├── server/
│   ├── index.ts                   # Express + endpoints
│   └── tsconfig.json
├── src/                           # frontend React
│   ├── api/
│   │   └── client.ts              # fetch wrapper para /api
│   ├── components/
│   ├── data/defaults.ts
│   ├── hooks/usePontoState.ts     # sync com servidor + cache local
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts                 # proxy /api → :3001
├── tailwind.config.js
└── package.json
```

## Endpoints da API

| Método | Rota          | Descrição                                                  |
| ------ | ------------- | ---------------------------------------------------------- |
| GET    | `/api/health` | Healthcheck. Devolve `{ ok: true, dataFile }`              |
| GET    | `/api/state`  | Lê o ficheiro `data/pontocerto.json` e devolve em JSON     |
| PUT    | `/api/state`  | Substitui o estado (escrita atómica + backup)              |

## Funcionalidades

- 4 marcações por dia: Entrada, Saída/Retorno Almoço, Saída Final
- Validação automática da ordem das marcações
- Painel com estatísticas em tempo real
- Histórico mensal filtrável + exportação CSV
- Backup completo em JSON (export/import via UI)
- Câmara WebRTC para foto de auditoria
- Geolocalização com **reverse geocoding** (OpenStreetMap Nominatim)
- Tema claro/escuro
- Tab **Configurações** com Perfil, Jornada, Preferências e Dados
- Indicador de estado de sincronização (Sincronizado / Offline / A sincronizar)

## Onde estão os dados

O ficheiro `data/pontocerto.json` é criado automaticamente na primeira execução do servidor com o estado inicial. Pode editá-lo manualmente — basta reiniciar o servidor.

- Backup automático: `data/pontocerto.json.bak` (cópia da última versão antes de cada gravação)
- Gravação atómica: protege contra corrupção em caso de falha

A pasta `data/` está no `.gitignore` para não versionar dados pessoais.

## Variáveis de ambiente

| Variável | Default | Descrição                            |
| -------- | ------- | ------------------------------------ |
| `PORT`   | `3001`  | Porta onde o servidor Express escuta |
