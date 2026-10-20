export interface CityOption { id: string; name: string }
export interface ICitiesProvider {
  listByState(state: string): Promise<CityOption[]>;
}
