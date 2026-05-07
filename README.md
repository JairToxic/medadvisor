# MedAdvisor AI

> **Reto #3 · HackIAthon Viamatica 2026**
> Estimador agéntico de copago y cobertura para el paciente.

Asistente conversacional que ayuda al paciente a entender su beneficio **antes** de atenderse. El paciente describe su síntoma (texto, voz o foto), una cadena de cuatro agentes razona sobre el caso, cruza los datos con su póliza de seguro extraída por OCR, busca el hospital más conveniente de su red preferente y le indica **exactamente cuánto pagará** y **a qué hospital le conviene ir**.

---

## Tabla de contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Recursos Azure utilizados](#recursos-azure-utilizados)
- [Stack técnico](#stack-técnico)
- [Variables de entorno y secretos](#variables-de-entorno-y-secretos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Puesta en marcha local](#puesta-en-marcha-local)
- [Aprovisionamiento de Azure](#aprovisionamiento-de-azure)
- [Sembrado de datos](#sembrado-de-datos-seed)
- [Cómo funcionan los índices de AI Search](#cómo-funcionan-los-índices-de-ai-search)
- [Flujo de la app paso a paso](#flujo-de-la-app-paso-a-paso)
- [Casos de demostración](#casos-de-demostración)
- [Endpoints HTTP](#endpoints-http)
- [Despliegue público](#despliegue-público)
- [Limpieza](#limpieza)

---

## Características

### Núcleo del reto

- **Cadena agéntica de 4 agentes** orquestada por el orchestrator del backend:
  1. **TriageAgent** (GPT-4o) — clasifica el síntoma, detecta banderas rojas y sugiere la especialidad. Reconoce además consultas por **terceras personas** y pivota a primeros auxilios sin invocar la cobertura del usuario.
  2. **CoverageAgent** — descarga el JSON parseado de la póliza desde Blob, calcula el porcentaje aplicable y consulta AI Search para citar la cláusula textual relevante (RAG vectorial).
  3. **RecommenderAgent** — consulta el índice `directorio` de AI Search filtrando por especialidad, aseguradora aceptada y ciudad. Si hay ubicación del usuario, ordena por distancia geográfica real (`geo.distance`).
  4. **Coordinator** (GPT-4o) — sintetiza todo en una respuesta natural, cita la cláusula textual, recomienda el hospital con menor copago y menciona al doctor sugerido. Streaming token a token.
- **Cálculo determinístico del copago**: `copago = fee × (1 - cobertura%)`, con deducible pendiente.
- **Hospital más económico de la red**, ordenado: en-red primero → menor copago → menor distancia.

### Funcionalidades ampliadas (efecto WOW)

- **Multi-modal**: entrada por **texto**, **voz** (Web Speech API en el navegador) o **foto del síntoma** (GPT-4o Vision con caption opcional). Si Azure Content Safety bloquea la imagen, el flujo continúa con el texto.
- **Voz Andrea Neural** ecuatoriana (`es-EC-AndreaNeural` de Azure Speech). El TTS se ejecuta **por chunks de oración** mientras el bot escribe, no al final, para que la voz arranque casi al instante.
- **Geolocalización real**: mapa Leaflet con tiles de OpenStreetMap, pines interactivos por hospital y ruta real (no línea recta) calculada con OSRM.
- **Simulación de ambulancia en emergencia**: al pulsar “Llamar 911”, una ambulancia 🚑 aparece en el hospital de despacho, se mueve **siguiendo calles reales** hasta el usuario y mientras tanto el bot envía 4 consejos de primeros auxilios contextuales generados por GPT-4o, programados a lo largo de la espera.
- **Historial del paciente** con KPIs (gastado, ahorrado, especialidades) + **proyección anual** y próxima visita estimada por patrón.
- **Tutorial interactivo con Driver.js** que recorre cada zona de la UI explicando qué tecnología la implementa.
- **Bilingüe** ES/EN, **tema claro/oscuro** persistente, totalmente responsive.

---

## Arquitectura

```
┌────────────────────────────────────────────────────────────────┐
│  Frontend Next.js 16 + React 19 (App Router)                    │
│  ├─ /                      Login (5 personas · tutorial)        │
│  └─ /consulta/[paciente]   Chat + 5 paneles + mapa real         │
└───────────────────────────┬────────────────────────────────────┘
                            │  fetch / SSE
┌───────────────────────────┴────────────────────────────────────┐
│  Backend (API Routes en el mismo Next.js)                       │
│  ├─ POST /api/chat                Orquestador SSE + 4 agentes   │
│  ├─ POST /api/admin/seed          PDFs → Doc Intel → AI Search  │
│  ├─ POST /api/policy/upload       Sube póliza nueva + OCR       │
│  ├─ POST /api/vision/analizar     Foto del síntoma (GPT-4o V)   │
│  ├─ POST /api/voice/tts           Andrea Neural (audio MP3)     │
│  └─ POST /api/emergency/guidance  Tips contextuales 911         │
└───┬─────────┬──────────┬──────────────┬────────────┬─────────────┘
    │         │          │              │            │
    ▼         ▼          ▼              ▼            ▼
 ┌──────┐ ┌────────┐ ┌─────────┐ ┌────────────┐ ┌─────────┐
 │Azure │ │  Doc   │ │   AI    │ │   Blob     │ │  Azure  │
 │OpenAI│ │Intel-  │ │ Search  │ │  Storage   │ │ Speech  │
 │      │ │ ligence│ │  (RAG)  │ │            │ │         │
 │GPT-4o│ │        │ │ 3 idx · │ │ pacientes  │ │ Andrea  │
 │+Vision│ │Layout │ │vector + │ │ polizas    │ │ Neural  │
 │+Embed │ │ OCR   │ │ geo +   │ │ historial  │ │ es-EC   │
 │       │ │       │ │ filter  │ │            │ │         │
 └───────┘ └───────┘ └─────────┘ └────────────┘ └─────────┘
                              ▲
                              │ keys
                       ┌──────┴──────┐
                       │  Key Vault  │
                       │  13 secrets │
                       └─────────────┘
```

---

## Recursos Azure utilizados

Provisionados todos en `rg-medadvisor` (eastus, suscripción `Inteligencia Artificial FAXIAI`).

| Recurso | SKU | Función concreta |
|---|---|---|
| Azure OpenAI (`factibilidades-ai`, compartido) | S0 | Despliega `gpt-4o`, `text-embedding-3-large` |
| Document Intelligence (`di-medadvisor-2026`) | F0 (gratis) | OCR de pólizas con `prebuilt-layout` |
| AI Search (`srch-medadvisor-2026`) | Free | 3 índices: `directorio`, `polizas-clausulas` (vectorial 3072d), `procedimientos` |
| Blob Storage (`stmedadvisor2026`) | Standard LRS | 3 contenedores: `pacientes/`, `polizas/`, `historial/` |
| Azure Speech (`speech-medadvisor-2026`) | F0 (gratis) | TTS con voz `es-EC-AndreaNeural` |
| Key Vault (`kv-medadvisor-2026`) | Standard | 13 secretos (endpoints + keys de cada servicio) |

**Coste mensual estimado**: < 1 USD para demo (todo en tier gratis o consumo mínimo).

---

## Stack técnico

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** estricto
- **OpenAI SDK** v6 (cliente Azure OpenAI con `AzureOpenAI`)
- **@azure-rest/ai-document-intelligence** v1 — REST cliente de Document Intelligence
- **@azure/search-documents** — cliente de AI Search con vector search
- **@azure/storage-blob** — Storage SDK
- **`zod`** — validación de payloads
- **`pdfkit`** — generación de PDFs sintéticos para sembrar pólizas
- **`leaflet`** — mapa interactivo
- **`driver.js`** — tour interactivo por la UI
- **OSRM** público — routing por calles reales (sin API key)
- **Web Speech API** — dictado por voz nativo del navegador

---

## Variables de entorno y secretos

> **TL;DR**: nunca se sube ningún secreto a GitHub. Hay dos archivos:

| Archivo | Qué contiene | ¿Va al repo? |
|---|---|---|
| `.env.local` | **Tus credenciales reales** (keys, endpoints) | ❌ Excluido por `.gitignore` |
| `.env.local.example` | Plantilla con placeholders (`<tu-key>`) | ✅ Sí, sirve de guía |

Cuando alguien clona el repo:

```bash
git clone <repo>
cd medadvisor
cp .env.local.example .env.local      # crea su copia personal
# edita .env.local rellenando sus propias claves de Azure
```

### ¿Cómo obtener los valores?

Todos los secretos están en el Key Vault del proyecto (`kv-medadvisor-2026`). Para un setup limpio:

1. **Aprovisiona los recursos Azure** con los comandos `az` (sección siguiente).
2. **Recolecta las keys** y guárdalas en Key Vault.
3. **Genera `.env.local`** desde Key Vault con un script:

```bash
KV=kv-medadvisor-2026
{
  echo "AZURE_OPENAI_ENDPOINT=$(az keyvault secret show --vault-name $KV --name aoai-endpoint --query value -o tsv)"
  echo "AZURE_OPENAI_API_KEY=$(az keyvault secret show --vault-name $KV --name aoai-key --query value -o tsv)"
  # ...idem para los demás (ver el script completo en "Aprovisionamiento")
} > .env.local
```

Así, **las claves reales viven en Azure, no en archivos**, y solo las copias temporalmente a `.env.local` durante desarrollo. En despliegue (Vercel / App Service) las inyectas directamente como variables de entorno del servicio.

### Si una key se filtra

Si por accidente subes el `.env.local` o una key se compromete, **rótalas inmediatamente**:

```bash
# OpenAI
az cognitiveservices account keys regenerate -n factibilidades-ai -g rg-faxiai --key-name Key1
# Document Intelligence
az cognitiveservices account keys regenerate -n di-medadvisor-2026 -g rg-medadvisor --key-name Key1
# Speech
az cognitiveservices account keys regenerate -n speech-medadvisor-2026 -g rg-medadvisor --key-name Key1
# AI Search admin key
az search admin-key renew --service-name srch-medadvisor-2026 -g rg-medadvisor --key-kind primary
# Storage
az storage account keys renew -n stmedadvisor2026 -g rg-medadvisor --key key1
```

Y vuelve a regenerar `.env.local` con el script anterior.

---

## Estructura del proyecto

```
medadvisor/
├── app/
│   ├── layout.tsx                       Root layout · fuentes · proveedor de preferencias
│   ├── globals.css                      Tokens de diseño + estilos
│   ├── page.tsx                         Login (server component)
│   ├── consulta/[paciente]/page.tsx     Chat por paciente (server component)
│   └── api/
│       ├── chat/route.ts                Orquestador SSE de los 4 agentes
│       ├── admin/seed/route.ts          Sembrado: PDFs + Doc Intel + AI Search + Blob
│       ├── policy/upload/route.ts       Subida + OCR de una póliza nueva
│       ├── vision/analizar/route.ts     GPT-4o Vision sobre foto del síntoma
│       ├── voice/tts/route.ts           Síntesis de voz Andrea Neural
│       └── emergency/guidance/route.ts  Tips contextuales durante la espera de ambulancia
├── componentes/
│   ├── PantallaLogin.tsx                Login con tutorial + persona-picker
│   ├── PantallaChat.tsx                 Orquestador del chat + side panels
│   ├── BurbujaMensaje.tsx               Renderiza mensajes con marcado **negritas**
│   ├── PanelRazonamiento.tsx            Cadena de agentes en vivo
│   ├── PanelPoliza.tsx                  Tarjeta de póliza + cláusula citada (RAG)
│   ├── PanelMapa.tsx                    Mapa real + lista interactiva
│   ├── MapaHospitales.tsx               Leaflet + animación ambulancia OSRM
│   ├── PanelCostos.tsx                  Desglose de copagos
│   ├── PanelHistorial.tsx               Historial + KPIs + proyección anual
│   ├── TarjetaCostos.tsx                Tarjeta inline en el chat
│   ├── TarjetaConfirmacion.tsx          Confirmación de cita con QR
│   ├── TarjetaAmbulancia.tsx            Card de ambulancia con ETA en vivo
│   ├── AlertaUrgencia.tsx               Banner pulsante para emergencias
│   ├── ModalReserva.tsx                 Selección día/hora con horario real del doctor
│   ├── Tutorial.tsx                     Modal de onboarding (5 pasos)
│   ├── ControlesPreferencias.tsx        Selector ES/EN + tema claro/oscuro
│   ├── ProveedorPreferencias.tsx        Contexto de preferencias persistido
│   └── Iconos.tsx                       Iconografía SVG
├── datos/
│   └── (eliminado tras migración)
├── lib/
│   ├── azure/
│   │   ├── config.ts                    Validación de env vars
│   │   ├── openai.ts                    Cliente Azure OpenAI singleton
│   │   ├── docintel.ts                  Cliente Document Intelligence
│   │   ├── search.ts                    Cliente AI Search
│   │   └── blob.ts                      Cliente Blob Storage
│   ├── agentes.ts                       Lógica de los 4 agentes
│   ├── prompts.ts                       System prompts (TriageAgent, Coordinator)
│   ├── pacientes-seed.ts                Datos sintéticos de 5 pacientes
│   ├── pacientes-azure.ts               Lectura runtime desde Blob
│   ├── poliza-pdf.ts                    Generador de PDFs con pdfkit
│   ├── poliza-parser.ts                 Convierte JSON de Doc Intel a PolizaExtraida
│   ├── poliza-loader.ts                 Cache de pólizas parseadas desde Blob
│   ├── hospitales-seed.ts               12 hospitales reales del Ecuador
│   ├── doctores-seed.ts                 30 doctores con horarios
│   ├── procedimientos-seed.ts           20 procedimientos con costos
│   ├── historiales-seed.ts              Historial clínico de los 5 pacientes
│   ├── historial-azure.ts               Lectura runtime de historial
│   ├── horario-doctor.ts                Parser del schedule textual del doctor
│   ├── embeddings.ts                    text-embedding-3-large helper
│   ├── tour.ts                          Configuración Driver.js
│   ├── tipos.ts                         Tipos compartidos
│   ├── i18n.ts                          Cadenas ES/EN
│   └── sse.ts                           Helper Server-Sent Events
├── public/
├── .env.local.example                   Plantilla de variables de entorno
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Puesta en marcha local

### Requisitos

- Node.js ≥ 20
- Azure CLI (`az`) autenticado en la suscripción
- Una suscripción de Azure con cuotas para OpenAI gpt-4o + embeddings

### Pasos

```bash
# 1. Clonar
git clone <repo>
cd medadvisor

# 2. Instalar
npm install

# 3. Configurar variables (ver "Aprovisionamiento" para crear los recursos)
cp .env.local.example .env.local
# Edita .env.local con tus endpoints/keys

# 4. Sembrar datos en Azure (genera PDFs, OCR, indexa)
npm run dev    # arranca el servidor
# en otra terminal:
curl -X POST http://localhost:3000/api/admin/seed

# 5. Abrir http://localhost:3000
```

---

## Aprovisionamiento de Azure

Crea todos los recursos con un solo bloque desde Bash:

```bash
RG=rg-medadvisor
LOC=eastus
SUB=$(az account show --query id -o tsv)

# Resource group
az group create -n $RG -l $LOC

# Storage
az storage account create -n stmedadvisor2026 -g $RG -l $LOC \
  --sku Standard_LRS --kind StorageV2 --allow-blob-public-access false
az storage container create --account-name stmedadvisor2026 -n polizas    --auth-mode login
az storage container create --account-name stmedadvisor2026 -n hospitales --auth-mode login

# Key Vault
az keyvault create -n kv-medadvisor-2026 -g $RG -l $LOC --enable-rbac-authorization false

# AI Search (free tier)
az search service create -n srch-medadvisor-2026 -g $RG -l $LOC --sku free

# Document Intelligence (F0 gratis)
az cognitiveservices account create -n di-medadvisor-2026 -g $RG -l $LOC \
  --kind FormRecognizer --sku F0 --custom-domain di-medadvisor-2026 --yes

# Speech (F0 gratis)
az cognitiveservices account create -n speech-medadvisor-2026 -g $RG -l $LOC \
  --kind SpeechServices --sku F0 --custom-domain speech-medadvisor-2026 --yes

# Recolectar keys y guardar en Key Vault
KV=kv-medadvisor-2026
SK=$(az cognitiveservices account keys list -n speech-medadvisor-2026 -g $RG --query key1 -o tsv)
DK=$(az cognitiveservices account keys list -n di-medadvisor-2026 -g $RG --query key1 -o tsv)
SRK=$(az search admin-key show --service-name srch-medadvisor-2026 -g $RG --query primaryKey -o tsv)
STC=$(az storage account show-connection-string -n stmedadvisor2026 -g $RG --query connectionString -o tsv)

# (Opcional) Reutiliza tu Azure OpenAI existente con sus deployments gpt-4o + text-embedding-3-large
# Sustituye los valores de OAI_* por los tuyos.
az keyvault secret set --vault-name $KV --name aoai-endpoint            --value "<tu-endpoint-openai>"
az keyvault secret set --vault-name $KV --name aoai-key                 --value "<tu-key-openai>"
az keyvault secret set --vault-name $KV --name aoai-deployment-chat     --value "gpt-4o"
az keyvault secret set --vault-name $KV --name aoai-deployment-embed    --value "text-embedding-3-large"
az keyvault secret set --vault-name $KV --name docintel-endpoint        --value "https://di-medadvisor-2026.cognitiveservices.azure.com/"
az keyvault secret set --vault-name $KV --name docintel-key             --value "$DK"
az keyvault secret set --vault-name $KV --name search-endpoint          --value "https://srch-medadvisor-2026.search.windows.net"
az keyvault secret set --vault-name $KV --name search-key               --value "$SRK"
az keyvault secret set --vault-name $KV --name storage-conn             --file <(printf '%s' "$STC")
az keyvault secret set --vault-name $KV --name speech-key               --value "$SK"
az keyvault secret set --vault-name $KV --name speech-region            --value "$LOC"
az keyvault secret set --vault-name $KV --name speech-voice-es          --value "es-EC-AndreaNeural"
az keyvault secret set --vault-name $KV --name speech-voice-en          --value "en-US-JennyNeural"
```

Luego genera `.env.local` con un script breve:

```bash
KV=kv-medadvisor-2026
{
  echo "AZURE_OPENAI_ENDPOINT=$(az keyvault secret show --vault-name $KV --name aoai-endpoint --query value -o tsv)"
  echo "AZURE_OPENAI_API_KEY=$(az keyvault secret show --vault-name $KV --name aoai-key --query value -o tsv)"
  echo "AZURE_OPENAI_API_VERSION=2024-10-21"
  echo "AZURE_OPENAI_DEPLOYMENT_CHAT=$(az keyvault secret show --vault-name $KV --name aoai-deployment-chat --query value -o tsv)"
  echo "AZURE_OPENAI_DEPLOYMENT_EMBED=$(az keyvault secret show --vault-name $KV --name aoai-deployment-embed --query value -o tsv)"
  echo "AZURE_DOCINTEL_ENDPOINT=$(az keyvault secret show --vault-name $KV --name docintel-endpoint --query value -o tsv)"
  echo "AZURE_DOCINTEL_API_KEY=$(az keyvault secret show --vault-name $KV --name docintel-key --query value -o tsv)"
  echo "AZURE_SEARCH_ENDPOINT=$(az keyvault secret show --vault-name $KV --name search-endpoint --query value -o tsv)"
  echo "AZURE_SEARCH_API_KEY=$(az keyvault secret show --vault-name $KV --name search-key --query value -o tsv)"
  echo "AZURE_SEARCH_INDEX_HOSPITALES=hospitales"
  echo "AZURE_STORAGE_CONNECTION_STRING=\"$(az keyvault secret show --vault-name $KV --name storage-conn --query value -o tsv)\""
  echo "AZURE_STORAGE_CONTAINER_POLIZAS=polizas"
  echo "AZURE_SPEECH_KEY=$(az keyvault secret show --vault-name $KV --name speech-key --query value -o tsv)"
  echo "AZURE_SPEECH_REGION=eastus"
  echo "AZURE_SPEECH_VOICE_ES=es-EC-AndreaNeural"
  echo "AZURE_SPEECH_VOICE_EN=en-US-JennyNeural"
  echo "AZURE_KEY_VAULT_URI=https://$KV.vault.azure.net/"
} > .env.local
```

---

## Sembrado de datos (seed)

Cuando los recursos estén creados, ejecuta una vez:

```bash
npm run dev
# en otra terminal:
curl -X POST http://localhost:3000/api/admin/seed
```

Esto:

1. Crea/actualiza el índice **`directorio`** en AI Search e inserta **12 hospitales** + **30 doctores**.
2. Crea/actualiza el índice **`procedimientos`** con **20 procedimientos**.
3. Crea/actualiza el índice **`polizas-clausulas`** con vector field de 3072d.
4. Sube **5 perfiles de paciente** a Blob `pacientes/{id}.json`.
5. Sube **5 historiales** a Blob `historial/{id}.json`.
6. Para cada paciente: genera un PDF de póliza, lo sube a Blob `polizas/{id}.pdf`, lo OCR-ea con Document Intelligence (`prebuilt-layout`), guarda el JSON crudo + el JSON parseado, parte la póliza en cláusulas, las vectoriza con `text-embedding-3-large` y las inserta en AI Search.

Tarda ~1m 15s la primera vez. Devuelve un reporte JSON con todos los blobs creados y el conteo de docs por índice.

---

## Cómo funcionan los índices de AI Search

> **Diseño:** este proyecto usa **índices directos** sin **indexers** ni **skillsets**. Toda la creación de índices y carga de documentos se hace en código (`/api/admin/seed`), no a través del portal de Azure.

### ¿Por qué no usamos indexers de AI Search?

Un **indexer** es un job programado que extrae datos de una fuente (Blob, Cosmos, SQL) y los empuja a un índice. Es útil cuando los datos cambian con frecuencia y necesitas sincronización automática.

En MedAdvisor:
- Los datos de hospitales/doctores/procedimientos son **catálogos curados** que no cambian a diario.
- Las cláusulas de pólizas se generan **una vez** por póliza al hacer OCR.
- El flujo de Document Intelligence se llama **inline** desde nuestro código (no como skill de un indexer).

Entonces controlamos la lógica de carga directamente con `SearchClient.uploadDocuments()` y eso nos permite, por ejemplo, **calcular embeddings con `text-embedding-3-large` justo antes de subir cada cláusula** — algo que con un indexer requeriría un skillset complejo.

### Los 3 índices que creamos

Cada uno con su esquema definido en `app/api/admin/seed/route.ts`:

#### 1. `directorio` — hospitales + doctores en un solo índice

| Campo | Tipo | Filtro/Sort |
|---|---|---|
| `id` | Edm.String | clave |
| `tipo` | Edm.String | filtrable, faceteable (`hospital` / `doctor`) |
| `name` | Edm.String | searchable |
| `city`, `district`, `address` | Edm.String | filtrables |
| `location` | **Edm.GeographyPoint** | filtrable + ordenable (`geo.distance`) |
| `lat`, `lng` | Edm.Double | redundantes para fácil acceso |
| `fee`, `wait`, `level` | Edm.Int32 | filtrables, ordenables |
| `rating` | Edm.Double | ordenable |
| `specialties`, `acceptsInsurers`, `services` | Collection(Edm.String) | filtrables |
| `specialty`, `hospitalId`, `schedule` | (sólo doctores) | filtrables |

Razón del diseño: **un solo índice para hospitales + doctores** porque comparten la mayoría de campos y queremos hacer queries que mezclan ambos (buscar un doctor en un hospital específico).

#### 2. `polizas-clausulas` — vectorial (RAG)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Edm.String | clave |
| `pacienteId`, `policyNo`, `insurer`, `seccion` | Edm.String | filtrables |
| `texto` | Edm.String | searchable |
| `texto_vector` | **Collection(Edm.Single), 3072 dims** | vectorial · `text-embedding-3-large` |

**Configuración vectorial**: HNSW algorithm + perfil `perfil-vector`. Cuando consultamos, generamos embedding de la pregunta y buscamos los `k=5` vecinos más cercanos por similitud coseno, filtrado por `pacienteId`.

#### 3. `procedimientos` — costos referenciales

| Campo | Tipo |
|---|---|
| `id` | Edm.String (clave) |
| `name`, `description` | Edm.String searchable |
| `specialty` | Edm.String filterable, facetable |
| `avgCostLow`, `avgCostHigh` | Edm.Int32 sortable |

### Lo que ocurre cuando llamas a `POST /api/admin/seed`

```
1. SearchIndexClient.createOrUpdateIndex({ name: "directorio", fields: [...] })
2. SearchClient.mergeOrUploadDocuments([12 hospitales + 30 doctores])
3. SearchIndexClient.createOrUpdateIndex({ name: "procedimientos", fields: [...] })
4. SearchClient.mergeOrUploadDocuments([20 procedimientos])
5. Subir 5 perfiles JSON a Blob (pacientes/{id}.json)
6. Subir 5 historiales a Blob (historial/{id}.json)
7. SearchIndexClient.createOrUpdateIndex({ name: "polizas-clausulas", fields: [...], vectorSearch: HNSW })
8. Para cada paciente:
   - pdfkit genera PDF de póliza → Blob (polizas/{id}.pdf)
   - Document Intelligence prebuilt-layout → JSON crudo → Blob (polizas/{id}.extraido.json)
   - Parser → JSON estructurado → Blob (polizas/{id}.poliza.json)
   - Partir en cláusulas (Coberturas, Deducible, Red preferente, etc.)
9. Embeddings.create(text-embedding-3-large) en lote para todas las cláusulas
10. SearchClient.mergeOrUploadDocuments([49 cláusulas con sus vectores])
11. Invalidar caches en memoria (pacientes, pólizas, historial)
```

Tarda ~75 segundos. Es idempotente: puedes ejecutarlo cuantas veces quieras y solo actualiza/sobreescribe.

### Cómo el runtime consume los índices

| Agente | Índice consultado | Tipo de query |
|---|---|---|
| TriageAgent | — | Sólo GPT-4o (sin search) |
| CoverageAgent | `polizas-clausulas` | Vector search filtrado por `pacienteId`, top-1 |
| RecommenderAgent | `directorio` | Filtros (`tipo eq 'hospital'`, `specialties/any(...)`) + `geo.distance` |
| RecommenderAgent (doctor) | `directorio` | Filtros (`tipo eq 'doctor' and hospitalId eq ...`), top-1 por rating |
| Coordinator | — | Sólo GPT-4o (recibe todo el contexto previo) |

---

## Flujo de la app paso a paso

Cuando el usuario envía un síntoma:

```
1. POST /api/chat con { pacienteId, sintoma, idioma, ubicacion? }
2. Backend carga paciente + historial desde Blob
3. SSE: agent_start idx=0 (TriageAgent)
   GPT-4o → JSON { tipoConsulta, sintomas, especialidad, urgencia, redFlags, resumenClinico }
   SSE: agent_done idx=0 (con output)

4a. Si tipoConsulta="tercero":
    - Busca hospital de emergencia más cercano (para que pueda dispatchar ambulancia)
    - Coordinator GPT-4o genera 3-4 pasos de primeros auxilios numerados
    - SSE: bot_token streaming + actions ["call911", "map"]
    - Retorna

4b. Si urgencia="emergencia" (caso propio):
    - SSE: redflag
    - Computa cobertura emergencia + recomendaciones de hospital
    - Coordinator empático con instrucciones de 911
    - SSE: actions ["call911", "map"]
    - Retorna

5. SSE: agent_start idx=1 (CoverageAgent)
   - Descarga {id}.poliza.json desde Blob
   - Calcula porcentaje según especialidad
   - Genera embedding de "Cobertura para {especialidad}"
   - Consulta polizas-clausulas filtrado por pacienteId, top-1 vector search
   - Devuelve { porcentaje, deducible, clausulaCitada }
   SSE: agent_done idx=1 + clausula

6. SSE: agent_start idx=2 (RecommenderAgent)
   - AI Search query directorio con filter:
     tipo eq 'hospital' AND specialties/any(s: s eq 'X')
     AND acceptsInsurers/any(i: i eq 'Aegis Salud')
   - Si hay ubicación: orderBy = geo.distance(location, geography'POINT(...)')
   - Para cada top-5 hospital, búsqueda secundaria de doctor
   - Calcula copago = fee × (1 - porcentaje%)
   - Ordena: in-net → distancia/copago
   - SSE: card_cost + sidepanel switches

7. SSE: agent_start idx=3 (Coordinator)
   - GPT-4o con todo el contexto + cláusula citada + 3 hospitales + doctores + historial
   - Streaming token a token
   - Si voz activa, frontend hace TTS por chunks de oración a /api/voice/tts
   - SSE: bot_token... bot_end + actions ["book", "map"]

8. Frontend renderiza:
   - Panel Razonamiento (4 agentes ✓)
   - Panel Póliza (cláusula citada destacada)
   - Panel Hospitales (mapa real con pines)
   - Panel Costos (desglose con doctor sugerido)
   - Tarjeta inline de costos en el chat con CTA "Agendar"
```

---

## Casos de demostración

5 pacientes inventados con casos clínicos variados:

| Perfil | Edad / Ciudad | Plan | Caso clave |
|---|---|---|---|
| **Juan Pérez Bermúdez** | 54 / Guayaquil | Aegis Essential 50 | Cefalea + visión borrosa, hipertensión declarada, deducible casi consumido |
| **María Fernanda López Vera** | 42 / Quito | Vital+ World Access | Migraña refractaria, pre-existencia declarada y cubierta |
| **Pedro Antonio Morales Cedeño** | 60 / Guayaquil | Solaris Enfermedades Graves | Dolor torácico → bandera roja → ambulancia inmediata |
| **Lucía Estefanía Cárdenas Riofrío** | 28 / Cuenca | Aegis Joven Plus | Tobillo torcido, traumatología 80%, deducible nuevo |
| **Roberto Andrés Salas Mora** | 67 / Manta | Vital+ Senior Care 65+ | Artritis reumatoide + HTA, deducible casi agotado |

Cada paciente tiene un PDF de póliza ficticia generado con pdfkit, OCR-eado con Document Intelligence al sembrar.

---

## Endpoints HTTP

| Método | Ruta | Body | Para |
|---|---|---|---|
| `POST` | `/api/chat` | `{ pacienteId, sintoma, idioma, ubicacion? }` | SSE streaming de los 4 agentes |
| `POST` | `/api/admin/seed` | (vacío) | Sembrado completo (PDFs + OCR + AI Search + Blob) |
| `POST` | `/api/policy/upload` | FormData (`file`) | Subir póliza nueva, OCR con Doc Intel |
| `POST` | `/api/vision/analizar` | FormData (`image`, `caption?`, `idioma`) | Analizar foto del síntoma con GPT-4o Vision |
| `POST` | `/api/voice/tts` | `{ text, idioma }` | Audio MP3 con voz Andrea Neural |
| `POST` | `/api/emergency/guidance` | `{ sintomas, especialidad, durationSeconds, idioma, ... }` | 4 tips contextuales para mientras llega la ambulancia |

---

## Despliegue público

### Opción A — Vercel (recomendada)

```bash
npm install -g vercel
vercel
# pega las 16 variables de .env.local cuando lo pida
# o configurarlas con: vercel env add
```

Tras el deploy, ejecuta `POST /api/admin/seed` una vez contra la URL pública para sembrar Azure.

### Opción B — Azure App Service

```bash
az webapp up --name medadvisor-app --resource-group rg-medadvisor \
  --runtime "NODE:20-lts" --location eastus
az webapp config appsettings set --name medadvisor-app --resource-group rg-medadvisor \
  --settings @env-settings.json
```

---

## Limpieza

Para eliminar **todos** los recursos del proyecto en Azure (no toca los compartidos como `factibilidades-ai`):

```bash
az group delete --name rg-medadvisor --yes --no-wait
```

---

## Aviso legal

Las aseguradoras (**Aegis Salud**, **Vital+**, **Solaris Med**), los pacientes y los datos clínicos son **ficticios**. La aplicación es **referencial** y no reemplaza la consulta médica. Las recomendaciones de copago se basan en pólizas sintéticas generadas para demostración.

---

**HackIAthon Viamatica 2026** · Reto #3 · Estimador agéntico de copago y cobertura.
