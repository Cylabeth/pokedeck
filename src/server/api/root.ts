import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { pokemonRouter } from "~/server/api/routers/pokemon";


/*
 * Root router de la API tRPC:
 * - Aquí registramos todos los routers funcionales del backend.
 * - Cada router encapsula un dominio (post, pokemon, etc.)
 * - Este router es el que finalmente se expone en /api/trpc.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  pokemon: pokemonRouter,
});

// Tipo exportado de la API completa (usado por client helpers y RSC)
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */

/*
 * createCaller:
 * - Permite llamar a los procedimientos tRPC desde Server Components
 *   sin pasar por HTTP (llamadas directas al router).
 * - Esto es lo que usa ~/trpc/server para SSR y RSC hydration.
 */
export const createCaller = createCallerFactory(appRouter);
