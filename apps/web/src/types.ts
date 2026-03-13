export type AuthUser = {
  customerId: number;
  email: string;
  name: string;
  points: number;
};

export type Product = {
  productId: string;
  description: string;
  price: string;
  category: string;
  subCategory: string;
  subCategory2?: string;
  image?: string;
  image2?: string;
  image3?: string;
  image4?: string;
  extendedDescription?: string;
  specs?: string;
  resources?: string;
  status?: string;
  isDownloadable: boolean;
  downloadableFilename?: string;
  freebie?: boolean;
  releaseDate?: string;
  preorder?: number | null;
  header?: string;
  notes?: string;
  captions?: string[];
};
