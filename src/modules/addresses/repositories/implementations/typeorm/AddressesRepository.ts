import type { Repository } from 'typeorm';
import { Address } from '../../../entities/Address.js';
import type { AddressDTO, AddressInput } from '../../../contracts/AddressContracts.js';
import type { IAddressesRepository } from '../../IAddressesRepository.js';
import { getRepository } from '#infrastructure/typeorm/repository-context';

export function presentAddress(address: Address): AddressDTO {
  return { id: address.id, recipient: address.recipient, postalCode: address.postalCode, street: address.street,
    number: address.number, complement: address.complement, district: address.district, city: address.city, state: address.state };
}

export class AddressesRepository implements IAddressesRepository {
  private readonly repository: Repository<Address>;

  constructor() { this.repository = getRepository(Address); }

  async list(userId: string): Promise<AddressDTO[]> {
    return (await this.repository.find({ where: { userId, active: true }, order: { id: 'DESC' }, take: 100 })).map(presentAddress);
  }

  async create(userId: string, input: AddressInput): Promise<AddressDTO> {
    return presentAddress(await this.repository.save(this.repository.create({ ...input, userId, active: true })));
  }
}
