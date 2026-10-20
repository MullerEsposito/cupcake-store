import type { RequestHandler } from 'express';
import express from 'express';
import { HttpError } from '../errors/http-error.js';

export function jsonBody(): RequestHandler[] {
  return [
    (request, response, next) => {
      const type = request.headers['content-type']?.split(';')[0].trim().toLowerCase();
      if (type !== 'application/json') throw new HttpError(415, 'Envie os dados em JSON.');
      next();
    },
    express.json({ limit: 8192, strict: true, inflate: false }),
    (request, response, next) => {
      if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
        throw new HttpError(400, 'Dados inválidos.');
      }
      next();
    }
  ];
}
