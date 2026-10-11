import { hasDigitalDelivery, hasPhysicalDelivery } from '../utils/productTypes';

// Mixed bundles belong to both their physical and paid digital categories.
export const PRODUCT_SUBCATEGORIES = [
  {
    slug: 'cuchacie-lopticky',
    name: 'Čuchacie loptičky',
    matches: (product) => hasPhysicalDelivery(product),
  },
  {
    slug: 'materialy-zadarmo',
    name: 'Materiály zadarmo',
    matches: (product) => product.isFree === true,
  },
  {
    slug: 'premiove-prirucky',
    name: 'Prémiové príručky',
    matches: (product) => hasDigitalDelivery(product) && !product.isFree,
  },
];
