# PontoCerto

Sistema de Controlo de Ponto Digital — **Vite + React + TypeScript + Tailwind** com sincronização na nuvem via **Firebase** (Auth + Firestore).

## Arquitetura

```
┌────────────────┐     Firebase Auth      ┌────────────────┐
│  React + Vite  │ ─────────────────────▶ │  Conta (e-mail) │
│  (PC / mobile) │                        └────────────────┘
└───────┬────────┘
        │ Firestore (tempo real)
        ▼
┌────────────────────────────────────────┐
│  users/{uid}/app/state  →  AppState    │
└────────────────────────────────────────┘
        │
        ▼ cache local (offline)
   localStorage `pontocerto_state`
```

- Login com **e-mail e senha** (mesma conta no PC e no celular)
- Cada alteração grava no **Firestore** (debounce 600 ms) e no **localStorage**
- Ao abrir noutro dispositivo, os dados aparecem automaticamente
- Se a nuvem falhar, o app continua com cache local (badge **Offline**)

O servidor Express em `server/` é **opcional** (desenvolvimento local antigo); em produção use só o frontend + Firebase.

## Configurar Firebase

1. Crie um projeto em [Firebase Console](https://console.firebase.google.com/)
2. Adicione uma app **Web** e copie a configuração
3. Ative **Authentication → E-mail/Senha**
4. Crie **Firestore Database** (modo produção)
5. Em **Firestore → Regras**, publique o conteúdo de `firestore.rules` deste repositório
6. Copie `.env.example` para `.env` e preencha:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Vercel

No painel do projeto → **Settings → Environment Variables**, adicione as mesmas variáveis `VITE_FIREBASE_*` e faça um novo deploy.

## Como correr

```bash
npm install
npm run dev          # só frontend (5173) — precisa do .env com Firebase
npm run build        # build de produção
npm run preview      # pré-visualizar build
```

Para o servidor local antigo (opcional):

```bash
npm run dev:server   # API em :3001 + ficheiro data/pontocerto.json
```

## Estrutura

```
src/
├── firebase/          # config + sync Firestore
├── contexts/          # AuthProvider
├── components/auth/   # Login
├── hooks/usePontoState.ts
└── ...
firestore.rules        # regras de segurança (copiar para o Firebase)
.env.example
```

## Funcionalidades

- 4 marcações por dia, plantão, feriados, folha 21→20
- Histórico, calculadora de remuneração, exportação CSV/PDF
- Sincronização multi-dispositivo (Firebase)
- Definições com menu lateral (Conta, Perfil, Jornada, etc.)
- Backup JSON export/import

## Migrar dados do PC para a nuvem

1. No PC, com os pontos já no app (cache local), crie conta em **Entrar / Registar**
2. Na primeira sessão, se existirem dados locais e a nuvem estiver vazia, o app **envia automaticamente** para o Firestore
3. No celular, entre com o **mesmo e-mail e senha**

## Variáveis de ambiente

| Variável | Descrição |
| -------- | --------- |
| `VITE_FIREBASE_*` | Configuração do projeto Firebase (obrigatório) |
| `PORT` | Porta do servidor Express local (opcional, default `3001`) |
