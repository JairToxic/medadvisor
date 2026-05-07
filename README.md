# MedAdvisor AI

> Estimador agéntico de copago y cobertura en tiempo real.
> Reto #3 · HackIAthon Viamatica 2026.

El paciente describe su síntoma en lenguaje natural —por texto, voz o foto— y una cadena de cuatro agentes razona sobre el caso, lee su póliza por OCR, busca el hospital más conveniente de su red preferente y le dice exactamente qué pagará y a dónde le conviene ir. Todo apoyado en Azure OpenAI, Document Intelligence, AI Search y Speech.

**Demo en producción**: https://medadvisor-hack-2026.azurewebsites.net

---

## Importante antes de clonar

Este repositorio **no incluye credenciales**. Para correrlo necesitas tu propia suscripción de Azure y aprovisionar los recursos descritos abajo. Las keys son personales: cada quien genera las suyas. La aplicación es 100% replicable a partir del código y los comandos de aprovisionamiento.

---

## Tabla de contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Recursos Azure](#recursos-azure)
- [Stack](#stack)
- [Aprovisionamiento](#aprovisionamiento)
- [Variables de entorno](#variables-de-entorno)
- [Sembrado de datos](#sembrado-de-datos)
- [Desarrollo local](#desarrollo-local)
- [Despliegue](#despliegue)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Cómo trabajan los índices](#cómo-trabajan-los-índices)
- [Endpoints](#endpoints)
- [Casos de demostración](#casos-de-demostración)
- [Aviso legal](#aviso-legal)

---

## Características

**Pipeline conversacional**

- Cadena de cuatro agentes orquestada vía Server-Sent Events:
  - **TriageAgent** clasifica el síntoma, detecta banderas rojas, sugiere especialidad y reconoce consultas hechas a favor de terceros para pivotar a primeros auxilios.
  - **CoverageAgent** lee la póliza extraída por OCR, calcula el porcentaje aplicable y recupera la cláusula textual relevante mediante búsqueda vectorial.
  - **RecommenderAgent** consulta el directorio de hospitales filtrando por especialidad y aseguradora aceptada; ordena por distancia geográfica real cuando hay ubicación del usuario.
  - **Coordinator** sintetiza el caso completo y responde por streaming, citando la cláusula y proponiendo el hospital con menor copago.
- Cálculo determinístico del copago: `fee × (1 - cobertura%)`, ajustado por el deducible pendiente.

**Más allá del texto**

- Entrada por dictado de voz (Web Speech API) y por foto de síntoma con caption opcional (GPT-4o Vision).
- Salida por voz con `es-EC-AndreaNeural` reproducida en chunks de oración mientras el modelo escribe.
- Mapa Leaflet sobre OpenStreetMap, con ruta real al hospital calculada con OSRM.
- En emergencia, ambulancia simulada que sigue calles reales con consejos contextuales generados por GPT-4o durante la espera.
- Historial del paciente con KPIs y proyección anual.
- Tutorial guiado integrado con Driver.js.
- Bilingüe ES/EN, modo claro/oscuro persistente.

---

## Arquitectura

```
Frontend Next.js 16 (App Router)
    │
    │ fetch / SSE
    ▼
API Routes (mismo proceso)
 ├─ /api/chat               orquestador SSE de los 4 agentes
 ├─ /api/admin/seed         crea índices, OCR-ea pólizas, indexa cláusulas
 ├─ /api/policy/upload      OCR de una póliza nueva
 ├─ /api/vision/analizar    análisis multimodal de imagen
 ├─ /api/voice/tts          síntesis de voz Andrea Neural
 └─ /api/emergency/guidance tips de primeros auxilios contextualizados
    │
    ├─→ Azure OpenAI (gpt-4o, gpt-4o-vision, text-embedding-3-large)
    ├─→ Document Intelligence (prebuilt-layout)
    ├─→ AI Search (directorio · polizas-clausulas vectorial · procedimientos)
    ├─→ Blob Storage (pacientes/ · polizas/ · historial/)
    └─→ Azure Speech (TTS es-EC-AndreaNeural)
```

---

## Recursos Azure

| Recurso | SKU | Función |
|---|---|---|
| Azure OpenAI | S0 | Despliega `gpt-4o` y `text-embedding-3-large` |
| Document Intelligence | F0 | OCR de pólizas con `prebuilt-layout` |
| AI Search | Free | 3 índices, vector search 3072 dims |
| Blob Storage | Standard LRS | 3 contenedores |
| Azure Speech | F0 | TTS Andrea Neural |
| Key Vault | Standard | Custodia de secretos |
| App Service Plan | B1 Linux | Runtime de la aplicación |

Costo mensual aproximado en demo: por debajo de 15 USD (la mayoría de servicios cabe en tier gratis; el cómputo de App Service B1 ronda los 13 USD).

---

## Stack

- Next.js 16, React 19, TypeScript estricto
- `openai` (cliente Azure OpenAI), `@azure-rest/ai-document-intelligence`, `@azure/search-documents`, `@azure/storage-blob`
- `zod` para validación
- `pdfkit` para generar las pólizas sintéticas
- `leaflet` y OSRM para mapa y routing
- `driver.js` para el tour
- Web Speech API para dictado

---

## Aprovisionamiento

Asegúrate de tener Azure CLI autenticado y una suscripción con cuotas para Azure OpenAI.

```bash
RG=rg-medadvisor
LOC=eastus

az group create -n $RG -l $LOC

az storage account create -n stmedadvisor2026 -g $RG -l $LOC \
  --sku Standard_LRS --kind StorageV2 --allow-blob-public-access false

az keyvault create -n kv-medadvisor-2026 -g $RG -l $LOC --enable-rbac-authorization false

az search service create -n srch-medadvisor-2026 -g $RG -l $LOC --sku free

az cognitiveservices account create -n di-medadvisor-2026 -g $RG -l $LOC \
  --kind FormRecognizer --sku F0 --custom-domain di-medadvisor-2026 --yes

az cognitiveservices account create -n speech-medadvisor-2026 -g $RG -l $LOC \
  --kind SpeechServices --sku F0 --custom-domain speech-medadvisor-2026 --yes
```

El despliegue de Azure OpenAI con sus modelos (`gpt-4o`, `text-embedding-3-large`) lo manejas aparte porque depende de cuotas regionales.

---

## Variables de entorno

El proyecto lee 17 variables desde `.env.local`. Copia la plantilla y rellena con los valores de tus recursos:

```bash
cp .env.local.example .env.local
```

Cada variable está documentada en `.env.local.example`. Las keys vienen de los recursos que aprovisionaste en el paso anterior.

`.env.local` está excluido del repositorio. Cualquier secreto que necesites compartir con tu equipo va en Key Vault, no en archivos de código.

---

## Sembrado de datos

La primera vez que arranca el sistema necesita poblar tres índices de AI Search y dos contenedores de Blob. Esto se hace con un único POST:

```bash
curl -X POST http://localhost:3000/api/admin/seed
```

El endpoint:

1. Crea/actualiza los índices `directorio`, `polizas-clausulas` y `procedimientos`.
2. Inserta 12 hospitales reales con coordenadas, 30 doctores y 20 procedimientos.
3. Sube 5 perfiles de pacientes y sus historiales a Blob.
4. Para cada paciente, genera un PDF de póliza, lo OCR-ea con Document Intelligence, parte la salida en cláusulas, vectoriza cada una con `text-embedding-3-large` y la inserta en AI Search.

La operación es idempotente y tarda alrededor de 75 segundos.

---

## Desarrollo local

```bash
npm install
npm run dev
```

La app queda en `http://localhost:3000`. Antes de chatear, ejecuta el seed.

---

## Despliegue

App Service Linux con Node 22 LTS:

```bash
APP=medadvisor-hack-2026
RG=rg-medadvisor

az appservice plan create -n plan-medadvisor -g $RG -l eastus --sku B1 --is-linux

az webapp create -n $APP -g $RG -p plan-medadvisor --runtime "NODE:22-lts"

az webapp config appsettings set -n $APP -g $RG --settings \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true \
  NODE_OPTIONS="--max-old-space-size=1536"

# Inyecta las 17 variables de tu .env.local como App Settings
# (puedes leerlas desde Key Vault y pasarlas con `az webapp config appsettings set`)
```

Para el deploy se sube un zip del código (sin `node_modules` ni `.next`); Oryx instala dependencias y construye automáticamente:

```bash
az webapp deploy -n $APP -g $RG --src-path medadvisor-deploy.zip --type zip
```

Tras el primer arranque, ejecuta el seed contra la URL pública y la aplicación queda lista.

---

## Estructura del proyecto

```
medadvisor/
├── app/
│   ├── layout.tsx                       Root layout y proveedor de preferencias
│   ├── globals.css                      Tokens y estilos
│   ├── page.tsx                         Login
│   ├── consulta/[paciente]/page.tsx     Chat por paciente
│   └── api/                             6 endpoints (chat, seed, vision, voice, ...)
├── componentes/                         18 componentes React (paneles, modales, tutorial)
├── lib/
│   ├── azure/                           Clientes singleton (openai, search, blob, docintel)
│   ├── agentes.ts                       Lógica de los 4 agentes
│   ├── prompts.ts                       System prompts
│   ├── pacientes-seed.ts                5 pacientes sintéticos
│   ├── hospitales-seed.ts               12 hospitales reales
│   ├── doctores-seed.ts                 30 doctores
│   ├── procedimientos-seed.ts           20 procedimientos con costos
│   ├── historiales-seed.ts              Historial clínico simulado
│   ├── poliza-pdf.ts                    Generador de PDFs
│   ├── poliza-parser.ts                 Parser del JSON de Document Intelligence
│   ├── tour.ts                          Configuración Driver.js
│   ├── tipos.ts                         Tipos compartidos
│   └── i18n.ts                          Cadenas ES/EN
├── public/
└── package.json
```

---

## Cómo trabajan los índices

El sistema usa tres índices directos en AI Search; no hay indexers ni skillsets. Toda la creación y carga ocurre en código.

| Índice | Documentos | Tipo |
|---|---|---|
| `directorio` | Hospitales y doctores | Filtros + `geo.distance` |
| `polizas-clausulas` | 8 cláusulas por póliza | Vector 3072d, HNSW, filtrado por `pacienteId` |
| `procedimientos` | Catálogo médico | Búsqueda por palabra clave |

Razón del diseño: los datos cambian poco y se generan en batch al sembrar; con SDK directo controlamos el flujo de embeddings antes de subir cada documento, algo que con un indexer requeriría un skillset adicional.

En runtime los agentes consumen estos índices así:

| Agente | Índice | Tipo de consulta |
|---|---|---|
| Triage | — | sólo modelo |
| Cobertura | `polizas-clausulas` | vectorial top-1 filtrado por `pacienteId` |
| Recomendador | `directorio` | filtros booleanos + `geo.distance` |
| Recomendador (doctor) | `directorio` | filtro por `hospitalId` y `specialty` |
| Coordinator | — | sólo modelo |

---

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/chat` | SSE con la salida de los 4 agentes |
| `POST` | `/api/admin/seed` | Crea índices, sube blobs, OCR + vectoriza pólizas |
| `POST` | `/api/policy/upload` | Sube un PDF nuevo y devuelve el JSON extraído |
| `POST` | `/api/vision/analizar` | Análisis de imagen + caption |
| `POST` | `/api/voice/tts` | MP3 de Andrea Neural |
| `POST` | `/api/emergency/guidance` | 4 tips de primeros auxilios contextualizados |

---

## Casos de demostración

| Perfil | Edad / Ciudad | Plan | Caso |
|---|---|---|---|
| Juan Pérez Bermúdez | 54 / Guayaquil | Aegis Essential 50 | Cefalea con visión borrosa, antecedente de hipertensión |
| María Fernanda López Vera | 42 / Quito | Vital+ World Access | Migraña refractaria, pre-existencia declarada |
| Pedro Antonio Morales Cedeño | 60 / Guayaquil | Solaris Enfermedades Graves | Dolor torácico irradiado, escenario de bandera roja |
| Lucía Estefanía Cárdenas Riofrío | 28 / Cuenca | Aegis Joven Plus | Trauma de tobillo, deducible nuevo |
| Roberto Andrés Salas Mora | 67 / Manta | Vital+ Senior Care 65+ | Artritis reumatoide en seguimiento |

Aseguradoras y datos clínicos son ficticios. Hospitales reales del Ecuador, usados sólo como referencia geográfica.

---

## Aviso legal

La aplicación es **referencial** y no reemplaza la consulta médica ni la lectura de la póliza original. Los pacientes, las aseguradoras (Aegis Salud, Vital+, Solaris Med) y los datos clínicos son **sintéticos**. Las decisiones de cobertura reales se rigen siempre por el contrato vigente con la aseguradora.

---

HackIAthon Viamatica 2026 · Reto #3
