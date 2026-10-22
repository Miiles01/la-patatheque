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

export type Testimonial = {
  name: string;
  /** Where the review was posted, e.g. "Avis Google · Local Guide". */
  source: string;
  quote: string;
  /** Language of the quote as written; reviews are shown untranslated. */
  lang: string;
  /** Star rating out of 5, only when the review shows one. */
  rating?: number;
  /** Reviewer's profile photo; falls back to their initial. */
  avatar?: string;
  /** Photo the reviewer posted with the review. */
  photo?: { src: string; alt: string; width: number; height: number };
};

// Real reviews only, quoted verbatim with first name and last initial.
export const testimonials: Testimonial[] = [
  {
    name: "Anna S.",
    source: "Avis Google · Local Guide",
    avatar: "/avatars/anna.webp",
    lang: "en",
    quote:
      "We’ve been living in the area for around a year now and recently tried this place. IT IS THE BEST COMFORT FOOD SPOT EVER. The service is always great, staff is always kind on the phone and delivery is fast. The food is to die for, the poutine is full of flavor and the subs are a good size with lots of meat in it. If you’re ever looking for a good greasy spoon this restaurant is the spot :) as well everything is priced very well. thank you we will be ordering or coming to dine very soon 😊",
  },
  {
    name: "Bagha S.",
    source: "Avis Google · Local Guide",
    avatar: "/avatars/bagha.webp",
    photo: {
      src: "/reviews/bagha-repas.webp",
      alt: "Sous-marin garni, frites maison et poutine sur une table de La Patathèque",
      width: 1000,
      height: 753,
    },
    lang: "en",
    quote:
      "Excellent food with extremely friendly service! We really enjoyed the subway sandwich and the poutine, it doesn't get more authentic than this.",
  },
  {
    name: "Justin K.",
    source: "Avis Google · Local Guide",
    avatar: "/avatars/justin.webp",
    lang: "en",
    quote: "Really enjoyed our meal! The burgers were delicious. Will be going back.",
  },
  {
    name: "Text N.",
    source: "Avis Google",
    lang: "en",
    quote:
      "Had breakfast with my family, truly loved the vibe, staff was very enthusiastic and energetic. its just funny to see them interact, there is a lot of jokes going around making you feel comfortable like at home.\n\nThe prices for the breakfast was the lowest I could find in the area and they had amazing dishes.\n\nTruly love this unique restaurant, it feels like the classic diners I used to go to as a kid with my dad.",
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
