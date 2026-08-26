export const menuHighlights = [
  {
    category: "Pizzas",
    tagline: "Sauce maison, basilic et huile d'olive",
    items: [
      { name: "Toute garnie", desc: "Piments verts, champignons, pepperoni et fromage", price: "13.70" },
      { name: "Spéciale du chef", desc: "Piments, champignons, pepperoni, bacon ou capicollo, oignons", price: "14.50" },
      { name: "Super Patathèque", desc: "Sauce à spaghetti, saucisses italiennes, oignons, champignons, piments forts", price: "14.70" },
    ],
  },
  {
    category: "Poutines",
    tagline: "La classique québécoise, plusieurs façons",
    items: [
      { name: "Poutine régulière", desc: "Fromage en grains, sauce maison", price: "10.95" },
      { name: "Poutine toute garnie", desc: "Le grand classique, sans compromis", price: "13.95" },
      { name: "Poutine à la viande fumée", desc: "Généreuse et fumée juste comme il faut", price: "13.95" },
    ],
  },
  {
    category: "Sous-marins",
    tagline: "Fromage fondu, oignons frits, laitue, tomates",
    items: [
      { name: "Le Super", desc: "Steak, pepperoni, piments et champignons — tout garni", price: "11.45" },
      { name: "Viande fumée et fromage", desc: "Un classique de comptoir montréalais", price: "12.25" },
      { name: "Végétarien", desc: "Léger, frais, toujours généreux", price: "11.45" },
    ],
  },
  {
    category: "Ailes de poulet",
    tagline: "Servies avec frites, salade de chou et cornichon",
    items: [
      { name: "Assiette ailes de poulet", desc: "La formule complète", price: "10.75" },
      { name: "Hot-chicken", desc: "Sandwich chaud, sauce généreuse", price: "16.95" },
      { name: "Club à la viande fumée", desc: "Trois étages, comme il se doit", price: "18.95" },
    ],
  },
];

export const specials = [
  { id: "Spécial #3", desc: "1 pizza large toute garnie + 2 frites", price: "28.95" },
  { id: "Spécial #2", desc: "Sous-marin 7\" + poutine + 1 breuvage", price: "19.95" },
  { id: "Spécial #17", desc: "2 grosses poutines régulières + 2 breuvages", price: "28.50" },
];

export const testimonials = [
  {
    name: "Camille T.",
    neighborhood: "Rivière-des-Prairies",
    quote: "La poutine toute garnie fait l'unanimité chez nous depuis toujours. C'est LE comptoir du quartier, point final.",
    avatar: "/avatars/1.jpg",
  },
  {
    name: "Marc-André L.",
    neighborhood: "Pointe-aux-Trembles",
    quote: "Portions généreuses, prix honnêtes, service rapide même les soirs de rush. On y retourne chaque semaine.",
    avatar: "/avatars/2.jpg",
  },
  {
    name: "Sophie B.",
    neighborhood: "Rivière-des-Prairies",
    quote: "45 ans plus tard, la pizza toute garnie goûte encore exactement comme dans mes souvenirs d'enfance.",
    avatar: "/avatars/3.jpg",
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
    { day: "Lundi – Mercredi", time: "11 h – 22 h" },
    { day: "Jeudi – Samedi", time: "11 h – 23 h" },
    { day: "Dimanche", time: "11 h – 22 h" },
  ],
};
