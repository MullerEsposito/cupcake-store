import type { Response } from 'express';
import type { ApiRequest } from '../contracts.js';
import { getDependencies } from '../contracts.js';
import { ApplicationError } from '#shared/errors/ApplicationError';
import { User } from '../../../modules/users/entities/User.js';
import { Order } from '../../../modules/orders/entities/Order.js';

export class OrderEvents {
  private readonly listeners = new Map<string, Set<() => void>>();

  subscribe(userId: string, listener: () => void): () => void {
    const existing = this.listeners.get(userId) ?? new Set();
    const count = [...this.listeners.values()].reduce((total, group) => total + group.size, 0);
    if (existing.size >= 3 || count >= 100) throw new ApplicationError('RATE_LIMIT', 'Muitas conexões de acompanhamento abertas.');
    existing.add(listener);
    this.listeners.set(userId, existing);
    return () => {
      existing.delete(listener);
      if (!existing.size) this.listeners.delete(userId);
    };
  }

  publish(userId: string): void {
    for (const listener of this.listeners.get(userId) ?? []) listener();
  }
}

export async function openOrderEvents(request: ApiRequest, response: Response): Promise<void> {
  const dependencies = getDependencies(request);
  const { userId, token } = request.authentication!;
  const users = dependencies.dataSource.getRepository(User);
  const active = async () => await dependencies.sessions.get(token) === userId && users.findOneBy({ id: userId!, active: true });
  if (!await active()) throw new ApplicationError('UNAUTHORIZED', 'Entre novamente na sua conta.');
  const runtime = dependencies.sharedRuntime;
  let version = runtime ? await runtime.orderVersion(userId!) : '';
  const release = runtime ? await runtime.acquireOrderStream(userId!) : async () => {};
  const hub = request.app.locals.orderEvents as OrderEvents;
  let closed = false;
  let checking = false;
  let pendingChange = false;
  const send = (event: string) => {
    if (closed) return;
    if (!response.write(`event: ${event}\ndata: {}\n\n`)) response.end();
  };
  let unsubscribe: () => void;
  try { unsubscribe = hub.subscribe(userId!, () => { void validateAndSend('orders-changed'); }); }
  catch (error) { await release(); throw error; }
  async function validateAndSend(event: string) {
    if (closed) return;
    if (checking) { if (event === 'orders-changed') pendingChange = true; return; }
    checking = true;
    try {
      if (!await active()) { send('session-ended'); response.end(); }
      else {
        if (runtime && event === 'heartbeat') {
          const current = await runtime.orderVersion(userId!);
          if (current !== version) { version = current; event = 'orders-changed'; }
        }
        send(event);
      }
    } catch { response.end(); }
    finally {
      checking = false;
      if (pendingChange && !closed) { pendingChange = false; void validateAndSend('orders-changed'); }
    }
  }
  const timer = setInterval(() => { void validateAndSend('heartbeat'); }, runtime ? 2000 : 10000);
  const rotation = runtime ? setTimeout(() => response.end(), 240000) : undefined;
  rotation?.unref();
  timer.unref();
  response.once('close', () => {
    closed = true;
    clearInterval(timer);
    clearTimeout(rotation);
    unsubscribe();
    void release().catch(() => {});
  });
  response.status(200).set({
    'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive', 'X-Accel-Buffering': 'no'
  });
  response.flushHeaders();
  response.write('retry: 3000\n\n');
  send('connected');
}

export async function announceOrderAfterResponse(request: ApiRequest, response: Response, orderId: string): Promise<void> {
  const hub = request.app?.locals.orderEvents as OrderEvents | undefined;
  if (!hub) return;
  try {
    const order = await getDependencies(request).dataSource.getRepository(Order).findOneBy({ id: orderId });
    if (order && getDependencies(request).sharedRuntime) {
      try { await getDependencies(request).sharedRuntime!.announceOrder(order.userId); } catch {}
    }
    if (order) response.once('finish', () => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        hub.publish(order.userId);
      }
    });
  } catch {
    return;
  }
}
