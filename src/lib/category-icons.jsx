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

// Used when a category has no icon chosen yet, and to pre-select one when an admin types a new name.
// Order matters: the broad top-level names first (so "Cafes & Restaurants" stays a fork and knife), then specific words
// (so "Pharmacy" is a pill and "Dentists" a smile), then loose fallbacks.
/** @type {[RegExp, string][]} */
const BROAD = [
  [/restaurants?|dining|food court/i, "utensils"],
  [/healthcare|health care/i, "stethoscope"],
  [/beauty|wellness/i, "sparkles"],
  [/home services|household/i, "wrench"],
  [/professional services?/i, "briefcase"],
  [/automotive|vehicles?/i, "car"],
  [/education|schools? & |coaching/i, "graduation-cap"],
  [/shopping|retail/i, "shopping-bag"],
];
/** @type {[RegExp, string][]} */
const SPECIFIC = [
  [/pharma|chemist|medical store|medicine/i, "pill"],
  [/dent|orthodont/i, "smile"],
  [/hospital|nursing home|trauma/i, "hospital"],
  [/ambulance|emergency/i, "ambulance"],
  [/clinic|diagnos|patholog|\blab(s|oratory)?\b|vaccin|physio/i, "syringe"],
  [/doctor|physician|surgeon|cardio|dermat|pediatric|paediatric|gynae|ortho|\bent\b|eye care|optic/i, "stethoscope"],
  [/yoga|fitness|gym|crossfit|zumba/i, "dumbbell"],
  [/\bspa\b|massage|ayurved/i, "flower-2"],
  [/salon|barber|hair|unisex|mehendi|mehndi/i, "scissors"],
  [/makeup|make-up|beauty|cosmetic|skin/i, "sparkles"],
  [/coffee|cafe|café|\btea\b|chai/i, "coffee"],
  [/pizza/i, "pizza"],
  [/bakery|cake|confection|sweets?\b|mithai/i, "cake-slice"],
  [/ice cream|gelato|dessert|kulfi/i, "ice-cream-cone"],
  [/fast food|burger|snack|street food|sandwich|momo/i, "sandwich"],
  [/\bpubs?\b|brewery|beer/i, "beer"],
  [/\bbars?\b|lounge|wine|liquor|cocktail/i, "wine"],
  [/restaurant|dhaba|biryani|kitchen|caterer|catering|tiffin/i, "utensils"],
  [/child|kids|baby|playschool|nursery school|daycare|crèche|creche/i, "baby"],
  [/book|stationery|library/i, "book-open"],
  [/school|college|tuition|tutor|coaching|academy|institute|class(es)?\b|training/i, "graduation-cap"],
  [/two.?wheeler|motorcycle|bikes?\b|cycle/i, "bike"],
  [/petrol|fuel|cng|gas station/i, "fuel"],
  [/\bcars?\b|car wash|car repair|garage|automobile|auto parts|tyre|tire|showroom/i, "car"],
  [/bus\b|taxi|cab\b|transport|travels?\b/i, "bus"],
  [/courier|parcel|delivery|logistic|packers|movers|cargo|trucks?\b/i, "truck"],
  [/electric|wiring|inverter/i, "zap"],
  [/plumb|water supply|\bro\b|water purifier|sanitary/i, "droplets"],
  [/\bgas\b|lpg|cylinder/i, "flame"],
  [/paint|polish|interior design/i, "paintbrush"],
  [/construct|builder|contractor|civil|architect|mason/i, "hammer"],
  [/tools?\b|hardware|drill/i, "drill"],
  [/furniture|sofa|mattress|carpenter|woodwork/i, "sofa"],
  [/repair|service centre|service center|appliance/i, "wrench"],
  [/grocery|supermarket|kirana|vegetable|fruit|general store|provision/i, "shopping-cart"],
  [/cloth|garment|boutique|tailor|fashion|saree|textile|apparel|shoes?\b|footwear/i, "shirt"],
  [/jewel|gold|silver|diamond|ornament/i, "gem"],
  [/gift|toys?\b|florist|flower shop|bouquet/i, "gift"],
  [/lawyer|advocate|legal|law firm|notary/i, "scale"],
  [/loan|nbfc|credit/i, "banknote"],
  [/insurance/i, "shield-check"],
  [/bank|finance|account(ant|ing)|\bca\b|tax|audit|investment|mutual fund/i, "landmark"],
  [/real estate|property|realty|broker|plots?\b|flats?\b/i, "building-2"],
  [/rent(al|s)?\b|hire|lease/i, "key-round"],
  [/hotel|resort|guest house|lodge|motel/i, "hotel"],
  [/hostel|\bpg\b|stay|homestay|accommodation/i, "bed-double"],
  [/tour|travel agent|holiday|visa|ticket/i, "luggage"],
  [/airline|flight|airport/i, "plane"],
  [/computer|laptop|software|\bit\b|web design|app dev|digital|tech|cyber|seo\b/i, "laptop"],
  [/mobile|smartphone|phone|cellular/i, "smartphone"],
  [/internet|broadband|wifi|wi-fi|network|dth|cable/i, "wifi"],
  [/photo|video|studio|camera|album/i, "camera"],
  [/print|flex|banner|xerox|photocopy|stationer/i, "printer"],
  [/event|wedding|party|decorat|banquet|dj\b|tent house/i, "party-popper"],
  [/music|dance|singing|band\b|instrument/i, "music"],
  [/cinema|movie|theatre|theater|multiplex|film/i, "film"],
  [/\bpets?\b|vet(erinar)?|dog|cat\b|aquarium|grooming/i, "paw-print"],
  [/garden|nursery|plants?\b|landscap|lawn/i, "trees"],
  [/solar|renewable|energy/i, "sun"],
  [/ngo|trust|charity|community|society|temple|church|mosque|gurudwara|religious/i, "users"],
  [/old age|elder|care home|home care|nursing\b|caretaker|maid|helper/i, "heart"],
  [/cleaning|housekeeping|pest control|laundry|dry clean/i, "sparkles"],
];
/** @type {[RegExp, string][]} */
const LOOSE = [
  [/health|medical|care\b/i, "stethoscope"],
  [/home|house/i, "home"],
  [/shop|store|mart|market|trader|traders|enterprises?/i, "store"],
  [/professional|consult|business|service/i, "briefcase"],
  [/stay|resort/i, "hotel"],
];
const SUGGESTIONS = [...BROAD, ...SPECIFIC, ...LOOSE];
export const suggestIconKey = (name) => guessIconKey(name) || "store";
/** A guess from the name, or an empty string when nothing fits (the admin then has to choose). */
export const guessIconKey = (name) => {
  const text = String(name || "").trim();
  if (!text) return "";
  const hit = SUGGESTIONS.find(([pattern]) => pattern.test(text));
  if (hit) return hit[1];
  // Finally: does the name contain the label of an icon in the picker ("Fuel", "Music", "Gifts")?
  const lower = text.toLowerCase();
  return CATEGORY_ICONS.find((item) => item.label.length > 3 && lower.includes(item.label.toLowerCase()))?.key || "";
};
export const hasValidIcon = (icon) => BY_KEY.has(icon);

/** The icon of a category: the one the admin chose, otherwise a guess from its name. */
export function CategoryIcon({ icon, name, size = 24, className = "" }) {
  const item = BY_KEY.get(icon) || BY_KEY.get(suggestIconKey(name));
  const Icon = item.Icon;
  return <Icon size={size} className={className} aria-hidden="true" />;
}
