import {
  Ambulance, Baby, Banknote, BedDouble, Beer, Bike, BookOpen, Briefcase, Building2, Bus, CakeSlice, Camera, Car, Coffee, Drill, Droplets, Dumbbell, Film, Flame, Flower2, Fuel, Gem, Gift, GraduationCap,
  Hammer, Heart, HeartPulse, Home, Hospital, Hotel, IceCreamCone, KeyRound, Landmark, Laptop, Leaf, Luggage, Mail, Music, Package, PartyPopper, PawPrint, Paintbrush, Pill, Pizza, Plane, Printer, Sandwich,
  Scale, Scissors, ShieldCheck, Shirt, ShoppingBag, ShoppingCart, Smartphone, Smile, Sofa, Sparkles, Stethoscope, Store, Sun, Syringe, Tag, Trees, Truck, Users, Utensils, Wifi, Wine, Wrench, Zap,
} from "lucide-react";

// The icons an admin can give a category. The choice is saved on the category itself, so every screen shows the same icon.
/** @type {{ key: string, label: string, Icon: import("react").ComponentType<{ size?: number, className?: string }> }[]} */
export const CATEGORY_ICONS = [
  ["utensils", "Restaurant", Utensils], ["coffee", "Cafe", Coffee], ["pizza", "Pizza", Pizza], ["cake-slice", "Bakery", CakeSlice], ["ice-cream-cone", "Ice cream", IceCreamCone], ["sandwich", "Fast food", Sandwich], ["wine", "Bar", Wine], ["beer", "Pub", Beer],
  ["stethoscope", "Doctor", Stethoscope], ["hospital", "Hospital", Hospital], ["pill", "Pharmacy", Pill], ["heart-pulse", "Health", HeartPulse], ["syringe", "Clinic", Syringe], ["ambulance", "Emergency", Ambulance], ["smile", "Dentist", Smile], ["baby", "Kids", Baby],
  ["scissors", "Salon", Scissors], ["sparkles", "Beauty", Sparkles], ["flower-2", "Spa", Flower2], ["dumbbell", "Gym", Dumbbell],
  ["graduation-cap", "Education", GraduationCap], ["book-open", "Books", BookOpen],
  ["car", "Cars", Car], ["bike", "Bikes", Bike], ["bus", "Transport", Bus], ["truck", "Logistics", Truck], ["fuel", "Fuel", Fuel], ["wrench", "Repair", Wrench],
  ["hammer", "Construction", Hammer], ["drill", "Tools", Drill], ["paintbrush", "Painting", Paintbrush], ["zap", "Electrician", Zap], ["droplets", "Plumbing", Droplets], ["flame", "Gas", Flame], ["sofa", "Furniture", Sofa], ["home", "Home", Home],
  ["shopping-bag", "Shopping", ShoppingBag], ["shopping-cart", "Grocery", ShoppingCart], ["store", "Store", Store], ["shirt", "Clothing", Shirt], ["gem", "Jewellery", Gem], ["gift", "Gifts", Gift], ["package", "Courier", Package],
  ["briefcase", "Business", Briefcase], ["scale", "Legal", Scale], ["landmark", "Finance", Landmark], ["banknote", "Loans", Banknote], ["shield-check", "Insurance", ShieldCheck],
  ["building-2", "Real estate", Building2], ["key-round", "Rentals", KeyRound], ["hotel", "Hotels", Hotel], ["bed-double", "Stay", BedDouble], ["plane", "Travel", Plane], ["luggage", "Tours", Luggage],
  ["laptop", "IT services", Laptop], ["smartphone", "Mobiles", Smartphone], ["wifi", "Internet", Wifi], ["camera", "Photography", Camera], ["printer", "Printing", Printer], ["mail", "Services", Mail],
  ["party-popper", "Events", PartyPopper], ["music", "Music", Music], ["film", "Cinema", Film], ["paw-print", "Pets", PawPrint], ["leaf", "Nature", Leaf], ["trees", "Gardening", Trees], ["sun", "Solar", Sun],
  ["users", "Community", Users], ["heart", "Care", Heart], ["tag", "Other", Tag],
].map(([key, label, Icon]) => ({ key, label, Icon }));

const BY_KEY = new Map(CATEGORY_ICONS.map((item) => [item.key, item]));

// Only used when a category has no icon chosen yet, so older categories still look reasonable until an admin picks one.
const SUGGESTIONS = [
  [/restaurant|cafe|café|food|bakery|dining/i, "utensils"],
  [/health|clinic|medical|hospital|dent|doctor/i, "stethoscope"],
  [/beauty|salon|spa|wellness/i, "sparkles"],
  [/fitness|gym/i, "dumbbell"],
  [/educat|school|coach|tutor|class/i, "graduation-cap"],
  [/automotive|vehicle|garage|bike|\bcars?\b/i, "car"],
  [/home|repair|electric|plumb|clean|construct/i, "wrench"],
  [/shop|retail|store|fashion|cloth/i, "shopping-bag"],
  [/professional|legal|law|consult|finance|account|business/i, "briefcase"],
  [/hotel|travel|stay|resort/i, "hotel"],
  [/real estate|property|realty/i, "building-2"],
];
export const suggestIconKey = (name) => SUGGESTIONS.find(([pattern]) => pattern.test(name || ""))?.[1] || "store";
export const hasValidIcon = (icon) => BY_KEY.has(icon);

/** The icon of a category: the one the admin chose, otherwise a guess from its name. */
export function CategoryIcon({ icon, name, size = 24, className = "" }) {
  const item = BY_KEY.get(icon) || BY_KEY.get(suggestIconKey(name));
  const Icon = item.Icon;
  return <Icon size={size} className={className} aria-hidden="true" />;
}
