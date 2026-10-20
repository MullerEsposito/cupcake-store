import type { ErrorRequestHandler } from 'express';
import { ApplicationError } from '#shared/errors/ApplicationError';
import type { ApplicationErrorCode } from '#shared/errors/ApplicationError';
import { errorInfo, errorCode } from '#shared/errors/error-info';
import { HttpError } from '../errors/http-error.js';

const statusCodes: Record<ApplicationErrorCode, number> = { VALIDATION: 400, UNAUTHORIZED: 401, NOT_FOUND: 404, CONFLICT: 409, RATE_LIMIT: 429, UNAVAILABLE: 503 };
const parserErrors: Record<string, { status: number; message: string }> = {
  'entity.too.large': { status: 413, message: 'Dados acima do limite permitido.' },
  'entity.parse.failed': { status: 400, message: 'Dados inválidos.' },
  'encoding.unsupported': { status: 415, message: 'Codificação de dados não suportada.' },
  'charset.unsupported': { status: 415, message: 'Codificação de dados não suportada.' }
};

export function errorHandler(logger: Pick<Console, 'error'>): ErrorRequestHandler {
  return (error: unknown, request, response, next) => {
    if (response.headersSent) return next(error);
    if (error instanceof HttpError) return response.status(error.status).json({ error: error.message });
    if (error instanceof ApplicationError) {
      return response.status(statusCodes[error.code]).json({ error: error.message });
    }
    const info = errorInfo(error);
    const parserError = typeof info.type === 'string' ? parserErrors[info.type] : undefined;
    if (parserError) return response.status(parserError.status).json({ error: parserError.message });
    if (error instanceof URIError) return response.status(400).json({ error: 'Endereço inválido.' });
    if (info.status === 403) return response.status(403).json({ error: 'Acesso não permitido.' });
    logger.error('Falha de operação:', { code: errorCode(error) });
    return response.status(503).json({ error: 'Não foi possível acessar o serviço. Confira a conexão local e tente novamente.' });
  };
}
