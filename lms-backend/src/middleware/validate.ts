import type { RequestHandler } from 'express';
import { z } from 'zod';

type AnySchema = z.ZodTypeAny;

export type ValidateSchemas = {
  body?: AnySchema;
  params?: AnySchema;
  query?: AnySchema;
};

function isSchemas(value: unknown): value is ValidateSchemas {
  if (typeof value !== 'object' || value === null) return false;
  return 'body' in value || 'params' in value || 'query' in value;
}

export function validate(schema: AnySchema): RequestHandler;
export function validate(schemas: ValidateSchemas): RequestHandler;
export function validate(arg: AnySchema | ValidateSchemas): RequestHandler {
  return (req, _res, next) => {
    if (isSchemas(arg)) {
      if (arg.params) req.params = arg.params.parse(req.params) as typeof req.params;
      if (arg.query) req.query = arg.query.parse(req.query) as typeof req.query;
      if (arg.body) req.body = arg.body.parse(req.body) as typeof req.body;
      return next();
    }

    req.body = arg.parse(req.body) as typeof req.body;
    return next();
  };
}
