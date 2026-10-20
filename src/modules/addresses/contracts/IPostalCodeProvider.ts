export interface PostalAddress {
  postalCode: string;
  street: string;
  district: string;
  city: string;
  state: string;
}
export interface IPostalCodeProvider {
  lookup(postalCode: string): Promise<PostalAddress>;
}
