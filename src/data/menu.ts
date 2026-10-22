import menu from "./menu.json";

export type MenuItem = {
  num?: string;
  name: string;
  desc?: string;
  /** One price per entry in the category's `sizes`; null when that size isn't offered. */
  prices: (number | null)[];
  note?: string;
  /** Unclear on the printed menu; confirm with the restaurant. */
  verify?: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  note?: string;
  sizes: string[];
  items: MenuItem[];
};

export type Special = {
  id: string;
  name: string;
  desc?: string;
  price: number;
  note?: string;
  featured: boolean;
};

export const menuCategories = menu.categories as MenuCategory[];
export const specials = menu.specials.items as Special[];
export const specialsNote = menu.specials.note;
export const promos = menu.promos as { name: string; price: number | null }[];

const priceFormat = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" });
export const formatPrice = (price: number) => priceFormat.format(price);

export const testimonials = [
  {
    name: "Camille T.",
    neighborhood: "Rivière-des-Prairies",
    quote: "La poutine toute garnie fait l'unanimité chez nous depuis toujours. C'est LE comptoir du quartier, point final.",
  },
  {
    name: "Marc-André L.",
    neighborhood: "Pointe-aux-Trembles",
    quote: "Portions généreuses, prix honnêtes, service rapide même les soirs de rush. On y retourne chaque semaine.",
  },
  {
    name: "Sophie B.",
    neighborhood: "Rivière-des-Prairies",
    quote: "45 ans plus tard, la pizza toute garnie goûte encore exactement comme dans mes souvenirs d'enfance.",
  },
];

export const restaurant = {
  name: "La Patathèque",
  yearsOpen: 45,
  address: "13640 Rue Sherbrooke Est, Rivière-des-Prairies – Pointe-aux-Trembles, QC H1A 4B2",
  phone: "+1 514-642-2557",
  phoneDisplay: "(514) 642-2557",
  rating: 4.1,
  reviewCount: 532,
  orderUrl: "https://order.restomenu.com/fr/la-patatheque/menu",
  mapsUrl: "https://www.google.com/maps/place/La+Patathèque/@45.6640343,-73.5063928,17z",
  hours: [
    { day: "Dimanche – Mercredi", time: "11 h – 22 h" },
    { day: "Jeudi – Samedi", time: "11 h – 23 h" },
    { day: "Déjeuner, 7 jours", time: "8 h – 13 h" },
  ],
  delivery: "Livraison gratuite, minimum 10 $ avant taxes",
  payments: "Interac à domicile, Visa, Mastercard",
};
