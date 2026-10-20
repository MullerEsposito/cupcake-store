import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { CityOption, ICitiesProvider } from '../../modules/addresses/contracts/ICitiesProvider.js';
import { validateState } from '../../modules/addresses/validators/validateState.js';
import { ApplicationError } from '#shared/errors/ApplicationError';

const client = axios.create({
  baseURL: 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/',
  timeout: 5000, maxRedirects: 0, maxContentLength: 1048576, proxy: false
});
const cache = new Map<string, { cities: CityOption[]; expires: number }>();
const pending = new Map<string, Promise<CityOption[]>>();

export class IbgeCitiesProvider implements ICitiesProvider {
  constructor(private readonly http: Pick<AxiosInstance, 'get'> = client) {}

  async listByState(input: string): Promise<CityOption[]> {
    const state = validateState(input);
    if (this.http !== client) return this.fetch(state);
    const hit = cache.get(state);
    if (hit && hit.expires > Date.now()) return hit.cities.map(city => ({ ...city }));
    const running = pending.get(state);
    if (running) return (await running).map(city => ({ ...city }));
    const operation = this.fetch(state);
    pending.set(state, operation);
    try {
      const cities = await operation;
      cache.set(state, { cities, expires: Date.now() + 86400000 });
      return cities.map(city => ({ ...city }));
    } finally { pending.delete(state); }
  }

  private async fetch(state: string): Promise<CityOption[]> {
    try {
      const { data } = await this.http.get<unknown>(state + '/municipios', {
        params: { orderBy: 'nome' }, signal: AbortSignal.timeout(5000)
      });
      if (!Array.isArray(data) || !data.length || data.length > 1000) throw new Error('Lista inválida');
      const cities = data.map((entry: { id?: unknown; nome?: unknown }) => {
        if (!entry || !Number.isSafeInteger(entry.id) || typeof entry.nome !== 'string'
          || !entry.nome.trim() || entry.nome.length > 100 || /[\u0000-\u001f]/.test(entry.nome)) throw new Error('Município inválido');
        return { id: String(entry.id), name: entry.nome.trim() };
      });
      return cities.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
    } catch {
      throw new ApplicationError('UNAVAILABLE', 'Lista de cidades indisponível. Tente novamente; a cidade retornada pelo CEP continua disponível.');
    }
  }
}
