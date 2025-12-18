import { z } from 'zod';
import { insertSequenceSchema, sequences, analyses } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  sequences: {
    list: {
      method: 'GET' as const,
      path: '/api/sequences',
      responses: {
        200: z.array(z.custom<typeof sequences.$inferSelect>()),
      },
    },
    search: {
      method: 'GET' as const,
      path: '/api/sequences/search',
      responses: {
        200: z.array(z.custom<typeof sequences.$inferSelect>()),
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/sequences/upload',
      responses: {
        201: z.object({ count: z.number(), message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/sequences/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
  analyses: {
    list: {
      method: 'GET' as const,
      path: '/api/analyses',
      responses: {
        200: z.array(z.custom<typeof analyses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/analyses',
      input: z.object({
        type: z.enum(['GC Content', 'MSA', 'Multiple Sequence Alignment', 'Phylogeny']),
        sequenceIds: z.array(z.number()),
        parameters: z.record(z.any()),
      }),
      responses: {
        201: z.custom<typeof analyses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/analyses/:id',
      responses: {
        200: z.custom<typeof analyses.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
