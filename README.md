# Pokédeck — Prueba técnica


Aplicación Pokédex desarrollada con **Next.js (App Router), tRPC, React Query y Zustand**, consumiendo **PokeAPI** a través de una capa **Backend-for-Frontend (BFF)** encargada de:

- Búsqueda avanzada
- Expansión de cadenas evolutivas
- Filtros por tipo y generación
- Paginación
- Cacheo de respuestas
- Control de concurrencia para evitar rate-limits

---

## Arquitectura

La aplicación sigue un enfoque **BFF-driven**:

Cliente (Next.js)
↓
API tRPC (BFF)
↓
PokeAPI

La capa BFF centraliza toda la lógica de negocio para evitar duplicación en el frontend y garantizar consistencia entre pantallas.

---

## Decisiones técnicas principales

### 1. Búsqueda server-side

Toda la lógica de búsqueda se ejecuta en el backend:

- Búsqueda por nombre
- Búsqueda por número
- Filtros por generación
- Filtros por tipo
- Expansión automática de evoluciones

Esto permite mantener paginación correcta y evitar inconsistencias entre cliente y servidor.

---

### 2. Expansión de evoluciones en el BFF

Cuando se busca un Pokémon, el sistema devuelve también su cadena evolutiva completa:

Ejemplo:

"pikachu" → pichu / pikachu / raichu

La expansión se realiza en el backend para:

- Evitar lógica duplicada en el frontend
- Garantizar que los filtros posteriores funcionen correctamente
- Reducir llamadas innecesarias desde el cliente

---

### 3. Control de concurrencia

PokeAPI puede devolver errores 429/500 cuando se realizan demasiadas llamadas simultáneas.

Se implementó un **pool de concurrencia** que limita el número máximo de requests paralelos:

```ts
const pool = createPool(10);
```

Esto estabiliza el sistema y mejora la resiliencia de la aplicación.

---

### 4. Cache en memoria con TTL

Se implementó un cache en memoria para reducir llamadas repetidas a la API:

| Tipo de datos                            | TTL |
| ---------------------------------------- | --- |
| Datos de Pokémon / índices               | 12h |
| Tipos, generaciones y cadenas evolutivas | 24h |

En un entorno productivo este cache se migraría a Redis o CDN.

---

### 5. Estrategia híbrida SSR + cliente

La primera página de resultados se renderiza en servidor (SSR) para mejorar el tiempo de carga inicial.

Las siguientes páginas se cargan desde cliente mediante tRPC, manteniendo:

- Filtros
- Paginación
- Resultados cargados
- Posición de scroll

Esto permite volver desde la vista de detalle sin perder el estado.

---

### 6. Manejo de edge-cases de PokeAPI

Algunas especies no existen directamente en `/pokemon/{speciesName}` (por ejemplo, `wormadam`), sino únicamente en sus variantes.

La capa BFF resuelve automáticamente la variedad por defecto mediante `/pokemon-species/{name}`, garantizando que todas las evoluciones puedan mostrarse correctamente.

---

## Consideraciones de rendimiento

La solución evita:

- N+1 queries mediante hidratación en batch
- Llamadas repetidas gracias al cache
- Problemas de rate-limit mediante control de concurrencia
- Carga innecesaria hidratando únicamente la página visible

---

## Posibles mejoras futuras

En un entorno productivo se podrían incorporar:

- Cache distribuido (Redis)
- Indexación de búsqueda (Elastic / Meilisearch)
- Observabilidad de llamadas externas
- Prefetching inteligente de evoluciones
- Deduplicación avanzada de requests concurrentes

## Stack tecnológico

- Next.js App Router
- TypeScript
- tRPC
- React Query
- Zustand
- Tailwind CSS
- PokeAPI

---

## Ejecución local

```bash
npm install
npm run dev
```

## Demo online

La aplicación está disponible en:

https://pokedeck-zeta.vercel.app/

---

## Autora

Cynthia Elizabeth Gorosito
Fullstack Developer
