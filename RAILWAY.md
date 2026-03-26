# Deploy no Railway

## Arquitetura

Este repositório está preparado para subir no Railway como:

- 1 serviço web com `Dockerfile` na raiz, servindo API FastAPI + frontend React buildado
- 1 banco `Postgres` gerenciado pelo Railway
- 1 `Bucket` do Railway para os anexos, no lugar do MinIO

Com isso, cada push no GitHub pode gerar deploy automático no Railway.

## O que já está pronto no código

- o frontend usa `VITE_API_URL` quando informado e, em produção, cai em `/api/v1`
- o backend serve o build do frontend e mantém fallback para as rotas SPA
- o container roda `alembic upgrade head` antes de iniciar o `uvicorn`
- a raiz do repositório tem `.env.example` compatível com as variáveis esperadas pelo Railway

## Fluxo recomendado

### 1. Vincular o projeto local ao projeto do Railway

Se você já tiver o projeto criado:

```powershell
railway project link --project "InfraCode CRM" --environment production
```

Se quiser criar um novo:

```powershell
railway init --name "InfraCode CRM"
```

### 2. Criar os recursos de dados

```powershell
railway add --database postgres
railway bucket create storage --region iad
```

Observação:

- o nome `storage` foi escolhido para bater com os references do `.env.example`
- se usar outro nome para o bucket, ajuste as referências `${{storage.*}}`

### 3. Criar o serviço web conectado ao GitHub

```powershell
railway add --repo SSharkFran/infracode-crm
```

Esse é o passo que habilita o fluxo de autodeploy por commit no GitHub.

## Variáveis do serviço web

No serviço da aplicação, configure estas variáveis:

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `MINIO_ENDPOINT=${{storage.ENDPOINT}}`
- `MINIO_ACCESS_KEY=${{storage.ACCESS_KEY_ID}}`
- `MINIO_SECRET_KEY=${{storage.SECRET_ACCESS_KEY}}`
- `MINIO_BUCKET=${{storage.BUCKET}}`
- `SECRET_KEY=<valor aleatório forte>`
- `FERNET_KEY=<saída de Fernet.generate_key()>`
- `DATAJUD_API_KEY=<opcional até você integrar>`
- `CRM_EMAIL=<email de login inicial>`
- `CRM_PASSWORD=<senha de login inicial>`
- `ENVIRONMENT=production`
- `BACKEND_CORS_ORIGINS=` vazio se o frontend estiver no mesmo serviço

Gerando o `FERNET_KEY`:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Primeiro deploy

Depois de criar o serviço conectado ao GitHub e preencher as variáveis:

- faça o commit
- dê `git push origin main`
- o Railway vai buildar automaticamente usando o `Dockerfile` da raiz

## Ajustes finais no painel do Railway

No serviço web:

- gere um domínio Railway
- configure healthcheck em `/health`

## Verificação

Depois do deploy:

- a home do domínio deve abrir o frontend
- `https://seu-dominio/health` deve responder `{"status":"ok"}`
- o login usa `CRM_EMAIL` e `CRM_PASSWORD`
