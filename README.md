# MedAdvisor AI

Asistente médico-financiero. En 30 segundos el paciente sabe qué le pasa, a dónde ir y cuánto va a pagar.

> Proyecto preparado para el HackIAthon Viamatica 2026. Prototipo de interfaz de alta fidelidad sobre Next.js + TypeScript.

---

## Demo

Tres perfiles de demostración con flujos completos:

| Perfil  | Caso clínico                   | Aseguradora    | Lo que demuestra                                  |
| ------- | ------------------------------ | -------------- | ------------------------------------------------- |
| Juan    | Cefalea + visión borrosa       | Aegis Salud    | Triage rutinario, ahorro $16 vs $120              |
| María   | Migraña refractaria            | Vital+         | Manejo de pre-existencia declarada                |
| Pedro   | Dolor torácico irradiado       | Solaris Med    | Detección de bandera roja + alerta de emergencia  |

Cada caso ejecuta una cadena simulada de cuatro agentes (Triage → Cobertura → Recomendador → Coordinador), con streaming tipo máquina de escribir y paneles laterales que se actualizan según el contexto.

## Requisitos

- Node.js ≥ 20
- npm (incluido con Node)

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Comandos disponibles

| Comando         | Acción                                                        |
| --------------- | ------------------------------------------------------------- |
| `npm run dev`   | Servidor de desarrollo con recarga automática                 |
| `npm run build` | Compilación de producción                                     |
| `npm start`     | Sirve el build de producción (`.next`)                        |
| `npm run lint`  | Reglas de Next.js para detectar problemas comunes             |

## Estructura del proyecto

```
medadvisor/
├── app/
│   ├── layout.tsx                 Layout raíz, fuentes, proveedor de tema/idioma
│   ├── globals.css                Tokens de diseño + estilos
│   ├── page.tsx                   Pantalla de acceso
│   └── consulta/[paciente]/
│       └── page.tsx               Chat por paciente (rutas dinámicas)
├── componentes/
│   ├── PantallaLogin.tsx          Acceso + selector de perfil
│   ├── PantallaChat.tsx           Orquestador del chat y paneles
│   ├── BurbujaMensaje.tsx         Renderiza mensajes con marcado **negritas**
│   ├── PanelRazonamiento.tsx      Cadena de agentes en vivo
│   ├── PanelPoliza.tsx            Tarjeta de póliza extraída
│   ├── PanelMapa.tsx              Mapa SVG + lista de hospitales
│   ├── PanelCostos.tsx            Desglose de copagos
│   ├── TarjetaCostos.tsx          Tarjeta inline en el chat
│   ├── TarjetaConfirmacion.tsx    Confirmación de cita con QR
│   ├── AlertaUrgencia.tsx         Banner pulsante para emergencias
│   ├── ModalReserva.tsx           Modal de selección de día/hora
│   ├── ControlesPreferencias.tsx  Selector ES/EN + tema claro/oscuro
│   ├── ProveedorPreferencias.tsx  Contexto de preferencias persistido
│   └── Iconos.tsx                 Iconografía SVG
├── datos/
│   ├── pacientes.ts               Catálogo de personas demo
│   ├── hospitales.ts              Catálogo de hospitales
│   └── escenarios.ts              Guiones de los flujos por paciente
├── lib/
│   ├── tipos.ts                   Tipos compartidos
│   ├── i18n.ts                    Cadenas en español e inglés
│   └── recomendador.ts            Cálculo de copagos y orden por red
├── public/
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Decisiones de diseño

- **App Router de Next.js 15.** Cada paciente tiene su propia URL (`/consulta/juan`, `/consulta/maria`, `/consulta/pedro`); el caso es compartible por enlace.
- **Sin librerías de UI.** Todos los componentes son propios. La paleta y la tipografía viven en `app/globals.css` como tokens CSS — el tema oscuro se obtiene reasignando esas variables vía `[data-theme="dark"]`.
- **Internacionalización ligera.** Diccionario en `lib/i18n.ts`, conmutable en caliente sin recargar.
- **Persistencia mínima.** Tema e idioma se guardan en `localStorage`. El tema se aplica antes del primer paint (script inline en `app/layout.tsx`) para evitar parpadeo en modo oscuro.
- **Datos sintéticos.** Aseguradoras (Aegis Salud, Vital+, Solaris Med) y pacientes son ficticios. Hospitales reales del Ecuador a modo de referencia geográfica únicamente.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript en modo estricto
- Fuentes vía `next/font/google`: Geist · Newsreader · JetBrains Mono

## Licencia

Uso académico y de demostración. Ningún dato representa pacientes ni pólizas reales.
