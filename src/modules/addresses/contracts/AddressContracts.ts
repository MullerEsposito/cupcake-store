export interface AddressInput {
  recipient: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
}

export interface AddressDTO extends AddressInput { id: string }
