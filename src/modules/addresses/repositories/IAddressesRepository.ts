import type { AddressDTO, AddressInput } from '../contracts/AddressContracts.js';

export interface IAddressesRepository {
  list(userId: string): Promise<AddressDTO[]>;
  create(userId: string, input: AddressInput): Promise<AddressDTO>;
}
