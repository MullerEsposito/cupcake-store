export interface ProductDTO {
  id: string;
  name: string;
  description: string | null;
  price: string;
  weight: number;
  image: string | null;
  stock: number;
  category: string;
  category_id: string;
}
