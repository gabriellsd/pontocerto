import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.env.PORT) || 3001;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'pontocerto.json');
const BACKUP_FILE = path.join(DATA_DIR, 'pontocerto.json.bak');

const DEFAULT_STATE = {
  employees: [
    {
      id: 1,
      name: 'Utilizador',
      role: 'Cargo / Função',
      email: 'utilizador@pontocerto.com',
      dailyMinutes: 528, // 8h48
      regime: 'Presencial',
      startTime: '06:00',
      endTime: '15:58',
      lunchMinutes: 70, // 1h10
      weekdaysOnly: true,
    },
  ],
  logs: [],
  shiftMarks: [],
  holidays: [],
  currentEmployeeId: 1,
  isDarkMode: false,
  settings: {
    soundEnabled: true,
    enableWebcam: true,
    enableReminders: false,
  },
};

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2), 'utf-8');
    console.log(`[pontocerto] Estado inicial criado em ${DATA_FILE}`);
  }
}

async function readState(): Promise<unknown> {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeStateAtomic(state: unknown): Promise<void> {
  const tempPath = `${DATA_FILE}.tmp`;
  const payload = JSON.stringify(state, null, 2);

  try {
    await fs.copyFile(DATA_FILE, BACKUP_FILE);
  } catch {
    // sem ficheiro anterior — não há nada para fazer backup
  }

  await fs.writeFile(tempPath, payload, 'utf-8');
  await fs.rename(tempPath, DATA_FILE);
}

function isPlausibleState(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as { employees?: unknown; logs?: unknown };
  return Array.isArray(v.employees) && Array.isArray(v.logs);
}

async function main(): Promise<void> {
  await ensureDataFile();

  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, dataFile: DATA_FILE });
  });

  app.get('/api/state', async (_req, res) => {
    try {
      const state = await readState();
      res.json(state);
    } catch (err) {
      console.error('Erro ao ler estado:', err);
      res.status(500).json({ error: 'Falha a ler ficheiro de estado.' });
    }
  });

  app.put('/api/state', async (req, res) => {
    if (!isPlausibleState(req.body)) {
      res.status(400).json({ error: 'Estrutura de estado inválida.' });
      return;
    }
    try {
      await writeStateAtomic(req.body);
      res.json({ ok: true, savedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Erro ao gravar estado:', err);
      res.status(500).json({ error: 'Falha a gravar ficheiro de estado.' });
    }
  });

  app.listen(PORT, () => {
    console.log(`[pontocerto] API a ouvir em http://localhost:${PORT}`);
    console.log(`[pontocerto] Ficheiro de dados: ${DATA_FILE}`);
  });
}

main().catch((err) => {
  console.error('Falha fatal no servidor:', err);
  process.exit(1);
});
