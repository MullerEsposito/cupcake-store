import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { IPostalCodeProvider, PostalAddress } from '../../modules/addresses/contracts/IPostalCodeProvider.js';
import { validatePostalCode } from '../../modules/addresses/validators/validatePostalCode.js';
import { ApplicationError } from '#shared/errors/ApplicationError';

const cache = new Map<string, { address: PostalAddress; expires: number }>();
const pending = new Map<string, Promise<PostalAddress>>();
const client = axios.create({
  baseURL: 'https://viacep.com.br/ws/', timeout: 5000, maxRedirects: 0, maxContentLength: 16384,
  proxy: false
});

export class ViaCepProvider implements IPostalCodeProvider {
  constructor(private readonly http: Pick<AxiosInstance, 'get'> = client) {}

  async lookup(input: string): Promise<PostalAddress> {
    const postalCode = validatePostalCode(input);
    if (this.http !== client) return this.fetch(postalCode);
    const now = Date.now();
    for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);
    const hit = cache.get(postalCode);
    if (hit) return { ...hit.address };
    const running = pending.get(postalCode);
    if (running) return { ...await running };
    if (pending.size >= 50) throw new ApplicationError('UNAVAILABLE', 'Consulta de CEP ocupada. Tente novamente.');
    const operation = this.fetch(postalCode);
    pending.set(postalCode, operation);
    try {
      const address = await operation;
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(postalCode, { address, expires: Date.now() + 3600000 });
      return { ...address };
    } finally { pending.delete(postalCode); }
  }

  private async fetch(postalCode: string): Promise<PostalAddress> {
    try {
      const { data } = await this.http.get<Record<string, unknown>>(postalCode + '/json/', { signal: AbortSignal.timeout(5000) });
      if (data && (data.erro === true || data.erro === 'true')) {
        throw new ApplicationError('NOT_FOUND', 'CEP não encontrado. Confira os oito dígitos.');
      }
      const field = (name: string, maximum: number) => {
        const value = data?.[name];
        if (typeof value !== 'string' || value.length > maximum || /[\u0000-\u001f]/.test(value)) throw new Error('Resposta inválida');
        return value.trim();
      };
      const address = {
        postalCode: field('cep', 9).replace('-', ''), street: field('logradouro', 200),
        district: field('bairro', 100), city: field('localidade', 100), state: field('uf', 2)
      };
      if (address.postalCode !== postalCode || !address.city
        || !'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').includes(address.state)) {
        throw new Error('Resposta inválida');
      }
      return address;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError('UNAVAILABLE', 'Consulta de CEP indisponível. Seus campos foram preservados; tente novamente para salvar.');
    }
  }
}
