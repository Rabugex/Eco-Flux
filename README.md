# EcoFlux - Sistema Inteligente de Água

Sistema de monitoramento e controle de bombas de água com ESP32, BLE e dashboard web em tempo real.

## Setup

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/ecoflux-vercel.git
cd ecoflux-vercel
npm install
```

### 2. Configurar Supabase (Banco de Dados)

1. Cria conta em **supabase.com**
2. Cria um novo projeto
3. No SQL Editor, roda:

```sql
-- Tabela de configurações (salva as customizações)
CREATE TABLE config (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT 'EcoFlux',
  sub TEXT DEFAULT 'CONTROLE DE ÁGUA',
  icon TEXT DEFAULT '🌊',
  colors JSONB DEFAULT '{"water":"#00c2d1","leaf":"#3dd68c","deep":"#020d0f"}',
  limits JSONB DEFAULT '{"bat":500,"pump":1000,"motor":2000,"filter":4320}',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de dados (histórico de medições)
CREATE TABLE dados (
  id BIGSERIAL PRIMARY KEY,
  dispositivo TEXT NOT NULL,
  bomba BOOLEAN,
  nivel INTEGER,
  tensao FLOAT,
  uptime TEXT,
  motorPos INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dados_dispositivo ON dados(dispositivo);
```

4. Vai em **Settings → API Keys** e copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configurar Variáveis de Ambiente

Cria arquivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_key_aqui
```

### 4. Rodar localmente

```bash
npm run dev
```

Acessa `http://localhost:3000`

### 5. Deploy no Vercel

1. Push pro GitHub
2. Vai em **vercel.com**
3. Clica **Import Project**
4. Seleciona `ecoflux-vercel`
5. Adiciona as variáveis de ambiente
6. Clica **Deploy**

## Código ESP32

O ESP32 conecta via BLE e envia:
- Status da bomba (ligada/desligada)
- Nível do reservatório
- Tensão da bateria
- Posição do motor

Veja o arquivo `ecoflux_esp32.ino` para o código completo.

## Estrutura

```
ecoflux-vercel/
├── api/                 # Endpoints (serverless functions)
├── lib/                 # Utilitários (Supabase)
├── public/              # Arquivos estáticos
├── pages/               # Páginas Next.js
├── package.json
├── next.config.js
└── README.md
```
