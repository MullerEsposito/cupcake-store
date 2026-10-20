import { ViaCepProvider } from '../../../../infrastructure/postal-code/ViaCepProvider.js';
import { UsersRepository } from '#repositories/UsersRepository';
import { LookupPostalCodeController } from './LookupPostalCodeController.js';
import { LookupPostalCodeService } from './LookupPostalCodeService.js';

export function getLookupPostalCodeController(): LookupPostalCodeController {
  const users = new UsersRepository();
  const provider = new ViaCepProvider();
  const service = new LookupPostalCodeService(provider, users);
  return new LookupPostalCodeController(service);
}
