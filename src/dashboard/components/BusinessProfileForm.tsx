import React, { useEffect, useMemo, useRef, useState } from 'react';
import { completenessPercent, completenessSections } from '../completeness';
import Image from 'next/image';
import { Check, ChevronDown, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { createAdminBusiness, createOwnerBusiness, geocodeBusinessAddress as requestAddressCoordinates, loadBusinessFormData, loadOwnerBusiness, updateOwnerBusiness, uploadBusinessDocuments, uploadBusinessImages } from '../api';
import { BusinessListing } from '../types';

type Category = { _id: string; name: string; services?: string[]; children?: Category[] };
type Hours = { day: string; isClosed: boolean; is24Hours: boolean; opens: string; closes: string; breakStart: string; breakEnd: string };
type Faq = { question: string; answer: string };
type Offer = { title: string; description: string; code: string };
type KycDoc = { type: string; url: string };
type Data = {
  name: string; businessType: string; tagline: string; description: string; establishedYear: string; teamSize: string;
  category: string; subcategory: string; secondaryCategories: string[]; services: string[];
  contactName: string; contactDesignation: string; phone: string; alternatePhone: string; whatsapp: string; landline: string; tollFree: string; email: string; website: string;
  addressLine1: string; addressLine2: string; landmark: string; locality: string; city: string; state: string; postalCode: string; country: string; serviceAreas: string[]; homeDelivery: boolean; mapEmbedUrl: string;
  paymentModes: string[]; languages: string[]; priceRange: string; amenities: string[]; highlights: string[];
  logo: string; images: string[]; videoUrl: string; brochureUrl: string; facebook: string; instagram: string; linkedin: string; youtube: string; x: string;
  gstNumber: string; msmeNumber: string; kycDocuments: KycDoc[]; googlePlaceId: string; faqs: Faq[]; offers: Offer[];
};
type Errors = Partial<Record<string, string>>;
type Option = { id: string; label: string; hint?: string };

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const steps = [
  { title: 'Business basics', help: 'Tell customers who you are.' },
  { title: 'Categories & services', help: 'Help people find you in the right searches.' },
  { title: 'Contact details', help: 'How customers will reach you.' },
  { title: 'Location & service area', help: 'Where you are and where you serve.' },
  { title: 'Hours & payments', help: 'When you are open and how you get paid.' },
  { title: 'Photos & media', help: 'Listings with photos get far more enquiries.' },
  { title: 'Trust & extras', help: 'Optional details that build credibility.' },
  { title: 'Review & submit', help: 'Check everything before it goes for review.' },
];
const businessTypes = [['shop', 'Shop / Retail'], ['service_provider', 'Service provider'], ['restaurant', 'Restaurant / Cafe'], ['clinic', 'Clinic / Hospital'], ['institute', 'School / Institute'], ['manufacturer', 'Manufacturer'], ['wholesaler', 'Wholesaler / Distributor'], ['online', 'Online business'], ['other', 'Other']];
const paymentOptions = [['cash', 'Cash'], ['upi', 'UPI'], ['debit_card', 'Debit card'], ['credit_card', 'Credit card'], ['net_banking', 'Net banking'], ['cheque', 'Cheque'], ['emi', 'EMI'], ['wallet', 'Wallets']];
const priceOptions = [['budget', '₹ Budget'], ['moderate', '₹₹ Moderate'], ['expensive', '₹₹₹ Premium'], ['luxury', '₹₹₹₹ Luxury']];
const languageSuggestions = ['Hindi', 'English', 'Punjabi', 'Urdu', 'Bengali', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada'];
const amenitySuggestions = ['Parking', 'Air conditioned', 'Wi-Fi', 'Wheelchair accessible', 'Home service', 'Online booking', 'Free consultation', 'Open on holidays'];
const kycTypes = [['gst_certificate', 'GST certificate'], ['msme_certificate', 'MSME / Udyam certificate'], ['shop_license', 'Shop licence'], ['pan_card', 'PAN card'], ['other', 'Other document']];
const states = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1899 }, (_, index) => String(currentYear - index));
const phoneRule = /^[1-9]\d{9}$/;
const gstRule = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const draftKey = 'lokal_lens_business_draft_v2';
const adminDraftKey = 'lokal_lens_admin_business_draft_v1';
const emptyData: Data = {
  name: '', businessType: '', tagline: '', description: '', establishedYear: '', teamSize: '', category: '', subcategory: '', secondaryCategories: [], services: [],
  contactName: '', contactDesignation: '', phone: '', alternatePhone: '', whatsapp: '', landline: '', tollFree: '', email: '', website: '',
  addressLine1: '', addressLine2: '', landmark: '', locality: '', city: '', state: '', postalCode: '', country: 'IN', serviceAreas: [], homeDelivery: false, mapEmbedUrl: '',
  paymentModes: [], languages: [], priceRange: '', amenities: [], highlights: [], logo: '', images: [], videoUrl: '', brochureUrl: '', facebook: '', instagram: '', linkedin: '', youtube: '', x: '',
  gstNumber: '', msmeNumber: '', kycDocuments: [], googlePlaceId: '', faqs: [], offers: [],
};
const defaultHours = (): Hours[] => days.map(day => ({ day, isClosed: day === 'sunday', is24Hours: false, opens: '09:00', closes: '18:00', breakStart: '', breakEnd: '' }));
const text = (value?: unknown) => (typeof value === 'string' ? value : '');
const list = (value?: unknown): string[] => (Array.isArray(value) ? value.map(entry => (typeof entry === 'object' && entry && '_id' in entry ? String((entry as { _id: string })._id) : String(entry))).filter(Boolean) : []);
const digits = (value?: string) => { const d = (value || '').replace(/\D/g, ''); return d.length === 12 && d.startsWith('91') ? d.slice(2) : d.length === 11 && d.startsWith('0') ? d.slice(1) : d.slice(-10); };
const isUrl = (value: string) => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };
const inputClass = (invalid?: boolean) => `mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-[15px] text-[#101115] outline-none transition placeholder:text-[#4a4c55] focus:ring-2 ${invalid ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-[#cfcec8] focus:border-[#002fa7] focus:ring-[#002fa7]/15'}`;

function Field({ label, required, hint, error, children, className = '' }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><label className="block text-sm font-semibold text-[#101115]">{label}{required && <span className="text-red-600"> *</span>}{children}</label>{hint && !error && <p className="mt-1 text-xs text-[#4a4c55]">{hint}</p>}{error && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>}</div>;
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return <span className="inline-flex items-center gap-1 rounded-xl border border-[#002fa7]/20 bg-[#002fa7]/5 py-1 pl-3 pr-2 text-sm text-[#00247f]">{children}{onRemove && <button type="button" onClick={onRemove} aria-label={`Remove ${typeof children === 'string' ? children : 'item'}`} className="rounded-full p-0.5 hover:bg-[#002fa7]/10"><X size={14} /></button>}</span>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm font-medium"><span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-[#002fa7]' : 'bg-[#cfcec8]'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} /></span>{label}</button>;
}

function ChoiceChips({ options, value, onChange }: { options: string[][]; value: string[]; onChange: (value: string[]) => void }) {
  return <div className="mt-2 flex flex-wrap gap-2">{options.map(([id, label]) => { const on = value.includes(id); return <button key={id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter(item => item !== id) : [...value, id])} className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm transition ${on ? 'border-[#002fa7] bg-[#002fa7] text-white' : 'border-[#cfcec8] bg-white hover:border-[#002fa7]'}`}>{on && <Check size={14} />}{label}</button>; })}</div>;
}

// Type-and-press-Enter tags with optional suggestion chips.
function TagInput({ value, onChange, suggestions = [], max = 50, placeholder }: { value: string[]; onChange: (value: string[]) => void; suggestions?: string[]; max?: number; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const items = raw.split(',').map(item => item.trim()).filter(Boolean);
    if (!items.length) return;
    const next = [...value];
    for (const item of items) if (next.length < max && !next.some(existing => existing.toLowerCase() === item.toLowerCase())) next.push(item.slice(0, 150));
    onChange(next); setDraft('');
  };
  const remaining = suggestions.filter(item => !value.some(existing => existing.toLowerCase() === item.toLowerCase())).slice(0, 12);
  return <div className="mt-1.5">
    <div className="flex min-h-[46px] flex-wrap items-center gap-2 rounded-xl border border-[#cfcec8] bg-white px-2.5 py-2 focus-within:border-[#002fa7] focus-within:ring-2 focus-within:ring-[#002fa7]/15">
      {value.map(item => <Chip key={item} onRemove={() => onChange(value.filter(entry => entry !== item))}>{item}</Chip>)}
      <input value={draft} onChange={event => setDraft(event.target.value)} onBlur={() => add(draft)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); add(draft); } else if (event.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1)); }} placeholder={value.length >= max ? `Maximum ${max} reached` : placeholder || 'Type and press Enter'} disabled={value.length >= max} className="min-w-[160px] flex-1 bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-[#4a4c55]" />
    </div>
    {remaining.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs text-[#4a4c55]">Suggestions:</span>{remaining.map(item => <button key={item} type="button" onClick={() => add(item)} className="inline-flex items-center gap-1 rounded-xl border border-dashed border-[#bdbcb5] px-2.5 py-1 text-xs hover:border-[#002fa7] hover:text-[#002fa7]"><Plus size={12} />{item}</button>)}</div>}
    <p className="mt-1 text-xs text-[#4a4c55]">{value.length}/{max} added</p>
  </div>;
}

// Searchable single/multi select used for primary and additional categories.
function Combo({ options, selected, onChange, multi, max = 1, placeholder, invalid }: { options: Option[]; selected: string[]; onChange: (value: string[]) => void; multi?: boolean; max?: number; placeholder: string; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (box.current && !box.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);
  const chosen = selected.map(id => options.find(option => option.id === id)).filter((option): option is Option => Boolean(option));
  const visible = options.filter(option => !query.trim() || `${option.label} ${option.hint || ''}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 80);
  const pick = (id: string) => {
    if (!multi) { onChange([id]); setOpen(false); setQuery(''); return; }
    if (selected.includes(id)) onChange(selected.filter(item => item !== id)); else if (selected.length < max) onChange([...selected, id]);
  };
  return <div ref={box} className="relative mt-1.5">
    {multi && chosen.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{chosen.map(option => <Chip key={option.id} onRemove={() => onChange(selected.filter(item => item !== option.id))}>{option.label}</Chip>)}</div>}
    <div className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 focus-within:ring-2 ${invalid ? 'border-red-400 focus-within:ring-red-100' : 'border-[#cfcec8] focus-within:border-[#002fa7] focus-within:ring-[#002fa7]/15'}`}>
      <Search size={16} className="text-[#4a4c55]" />
      <input value={open ? query : multi ? '' : chosen[0]?.label || ''} onFocus={() => { setOpen(true); setQuery(''); }} onChange={event => { setQuery(event.target.value); setOpen(true); }} placeholder={multi && selected.length >= max ? `Maximum ${max} selected` : placeholder} disabled={Boolean(multi && selected.length >= max)} className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#4a4c55]" />
      <ChevronDown size={16} className="text-[#4a4c55]" />
    </div>
    {open && <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#dcdbd5] bg-white py-1 shadow-lg">
      {visible.length === 0 && <li className="px-3 py-2 text-sm text-[#4a4c55]">No category found</li>}
      {visible.map(option => { const on = selected.includes(option.id); return <li key={option.id}><button type="button" role="option" aria-selected={on} onMouseDown={event => event.preventDefault()} onClick={() => pick(option.id)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#f1f1ee]"><span>{option.label}{option.hint && <span className="ml-2 text-xs text-[#4a4c55]">{option.hint}</span>}</span>{on && <Check size={16} className="text-[#002fa7]" />}</button></li>; })}
    </ul>}
    {multi && <p className="mt-1 text-xs text-[#4a4c55]">{selected.length}/{max} selected</p>}
  </div>;
}

function readDraft(key: string): { data: Data; hours: Hours[] } | null {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : null; } catch { return null; }
}

export const BusinessProfileForm = ({ businessId, onClose, onSaved, adminOptions }: { businessId?: string; onClose: () => void; onSaved: (business: BusinessListing, created: boolean) => void; adminOptions?: { owners: { id: string; name: string; email: string }[] } }) => {
  const lenient = Boolean(adminOptions);
  const [ownerId, setOwnerId] = useState('');
  const [publish, setPublish] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft] = useState(() => (businessId ? null : readDraft(adminOptions ? adminDraftKey : draftKey)));
  const [data, setData] = useState<Data>(() => (draft ? { ...emptyData, ...draft.data } : emptyData));
  const [hours, setHours] = useState<Hours[]>(() => (draft?.hours?.length ? draft.hours : defaultHours()));
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('draft');
  const [reviewReason, setReviewReason] = useState('');
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [geocodedAddress, setGeocodedAddress] = useState('');
  const [restored, setRestored] = useState(Boolean(draft));
  const [loaded, setLoaded] = useState(!businessId);
  const topRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Data>(key: K, value: Data[K]) => setData(current => ({ ...current, [key]: value }));
  const pendingEdit = Boolean(businessId && status === 'pending_review');

  const primary = useMemo(() => categories.find(item => item._id === data.category), [categories, data.category]);
  const subcategory = primary?.children?.find(item => item._id === data.subcategory);
  const primaryOptions = useMemo<Option[]>(() => categories.map(item => ({ id: item._id, label: item.name })), [categories]);
  const additionalOptions = useMemo<Option[]>(() => categories.flatMap(item => [{ id: item._id, label: item.name, hint: 'Category' }, ...(item.children || []).map(child => ({ id: child._id, label: child.name, hint: item.name }))]).filter(option => option.id !== data.category), [categories, data.category]);
  const serviceSuggestions = useMemo(() => [...new Set([...(subcategory?.services || []), ...(primary?.services || [])])], [primary, subcategory]);

  useEffect(() => { loadBusinessFormData().then(({ categories: items }) => setCategories(items)).catch(reason => setError(reason.message)); }, []);
  useEffect(() => {
    if (businessId || !loaded) return;
    const timer = setTimeout(() => { try { localStorage.setItem(adminOptions ? adminDraftKey : draftKey, JSON.stringify({ data, hours })); } catch { /* storage unavailable */ } }, 600);
    return () => clearTimeout(timer);
  }, [data, hours, businessId, loaded, adminOptions]);
  useEffect(() => {
    if (!businessId) return;
    loadOwnerBusiness(businessId).then(item => {
      setData({
        ...emptyData, name: text(item.name), businessType: text(item.businessType), tagline: text(item.tagline), description: text(item.description), establishedYear: item.establishedYear?.toString() || '', teamSize: item.teamSize?.toString() || '',
        category: String(item.category?._id || item.category || ''), subcategory: String(item.subcategories?.[0]?._id || item.subcategories?.[0] || ''), secondaryCategories: list(item.secondaryCategories), services: list(item.services),
        contactName: text(item.contactPerson?.name), contactDesignation: text(item.contactPerson?.designation), phone: digits(item.phone), alternatePhone: digits(item.alternatePhone), whatsapp: digits(item.whatsapp), landline: text(item.landline), tollFree: text(item.tollFree), email: text(item.email), website: text(item.website),
        addressLine1: text(item.address?.addressLine1), addressLine2: text(item.address?.addressLine2), landmark: text(item.address?.landmark), locality: text(item.address?.locality), city: text(item.address?.city), state: text(item.address?.state), postalCode: text(item.address?.postalCode), country: text(item.address?.country) || 'IN',
        serviceAreas: list(item.serviceAreas), homeDelivery: Boolean(item.homeDelivery), mapEmbedUrl: text(item.mapEmbedUrl), paymentModes: list(item.paymentModes), languages: list(item.languages), priceRange: text(item.priceRange), amenities: list(item.amenities), highlights: list(item.highlights),
        logo: text(item.logo), images: list(item.images), videoUrl: text(item.videoUrl), brochureUrl: text(item.brochureUrl), facebook: text(item.socialLinks?.facebook), instagram: text(item.socialLinks?.instagram), linkedin: text(item.socialLinks?.linkedin), youtube: text(item.socialLinks?.youtube), x: text(item.socialLinks?.x),
        gstNumber: text(item.gstNumber), msmeNumber: text(item.msmeNumber), kycDocuments: (item.kycDocuments || []).map((doc: KycDoc) => ({ type: doc.type, url: doc.url })), googlePlaceId: text(item.googlePlaceId),
        faqs: (item.faqs || []).map((faq: Faq) => ({ question: faq.question || '', answer: faq.answer || '' })), offers: (item.offers || []).map((offer: Offer) => ({ title: offer.title || '', description: offer.description || '', code: offer.code || '' })),
      });
      const point = item.location?.coordinates;
      if (point?.length === 2) { setCoordinates([Number(point[0]), Number(point[1])]); setGeocodedAddress([item.address?.addressLine1, item.address?.addressLine2, item.address?.landmark, item.address?.locality, item.address?.city, item.address?.state, item.address?.postalCode, item.address?.country || 'IN'].filter(Boolean).join(', ')); }
      if (item.workingHours?.length) setHours(days.map(day => { const entry = item.workingHours.find((hour: { day: string }) => hour.day === day); return entry ? { day, isClosed: Boolean(entry.isClosed), is24Hours: Boolean(entry.is24Hours), opens: entry.opens || '09:00', closes: entry.closes || '18:00', breakStart: entry.breakStart || '', breakEnd: entry.breakEnd || '' } : { ...defaultHours()[days.indexOf(day)], isClosed: true }; }));
      setStatus(item.listingStatus || 'draft'); setReviewReason(item.rejectionReason || ''); setLoaded(true);
    }).catch(reason => setError(reason.message));
  }, [businessId]);

  function errorsFor(index: number): Errors {
    const e: Errors = {};
    if (index === 0) {
      if (!data.name.trim()) e.name = 'Enter your business name.';
      if (!pendingEdit && !lenient && data.description.trim().length < 30) e.description = 'Write at least 30 characters so customers know what you do.';
    }
    if (index === 1) {
      if (!data.category) e.category = 'Choose your primary category.';
      if (!pendingEdit && !data.services.length) e.services = 'Add at least one service.';
    }
    if (index === 2) {
      if (!pendingEdit && !phoneRule.test(data.phone)) e.phone = 'Enter a valid 10-digit mobile number.';
      if (data.phone && !phoneRule.test(data.phone)) e.phone = 'Enter a valid 10-digit mobile number.';
      for (const key of ['alternatePhone', 'whatsapp'] as const) if (data[key] && !phoneRule.test(data[key])) e[key] = 'Enter a valid 10-digit number.';
      if (!pendingEdit && !lenient && !data.email.trim()) e.email = 'Enter an email address.';
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'Enter a valid email address.';
      if (data.website && !isUrl(data.website)) e.website = 'Start the link with http:// or https://';
    }
    if (index === 3) {
      if (!data.addressLine1.trim()) e.addressLine1 = 'Enter the street address.';
      if (!data.city.trim()) e.city = 'Enter the city.';
      if (!data.state) e.state = 'Select the state.';
      if (data.postalCode && !/^\d{6}$/.test(data.postalCode)) e.postalCode = 'PIN code must be 6 digits.';
    }
    if (index === 4 && hours.some(day => !day.isClosed && !day.is24Hours && (!day.opens || !day.closes))) e.hours = 'Add opening and closing times, or mark the day closed.';
    if (index === 5) for (const key of ['videoUrl', 'brochureUrl', 'facebook', 'instagram', 'linkedin', 'youtube', 'x'] as const) if (data[key] && !isUrl(data[key])) e[key] = 'Start the link with http:// or https://';
    if (index === 6) {
      if (data.gstNumber && !gstRule.test(data.gstNumber)) e.gstNumber = 'Enter a valid 15-character GST number, for example 09ABCDE1234F1Z5.';
      if (data.faqs.some(faq => Boolean(faq.question.trim()) !== Boolean(faq.answer.trim()))) e.faqs = 'Complete both question and answer, or remove the empty FAQ.';
      if (data.offers.some(offer => Boolean(offer.description.trim() || offer.code.trim()) && !offer.title.trim())) e.offers = 'Add a title to each offer.';
    }
    return e;
  }
  const errors = showErrors ? errorsFor(step) : {};
  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  async function geocode() {
    const parts = { addressLine1: data.addressLine1, addressLine2: data.addressLine2, landmark: data.landmark, locality: data.locality, city: data.city, state: data.state, postalCode: data.postalCode, country: data.country || 'IN' };
    const address = Object.values(parts).filter(Boolean).join(', ');
    if (coordinates && geocodedAddress === address) return true;
    setGeocoding(true);
    try {
      const result = await requestAddressCoordinates(parts);
      const point: [number, number] = [Number(result.lng), Number(result.lat)];
      if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) throw new Error('We could not find this address. Please check it.');
      setCoordinates(point); setGeocodedAddress(address); setLocationLabel(result.label); return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not find this address.'); return false; }
    finally { setGeocoding(false); }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'images' | 'kyc' | 'brochure', kycType = 'other') {
    const documentTarget = target === 'kyc' || target === 'brochure';
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length) return;
    const allowed = documentTarget ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const bad = files.find(file => !allowed.includes(file.type));
    if (bad) { setError(documentTarget ? `${bad.name} is not supported. Use PDF, JPEG, PNG or WebP.` : `${bad.name} is not supported. Use JPEG, PNG, WebP or GIF.`); return; }
    const limit = documentTarget ? 8 : 5;
    const big = files.find(file => file.size > limit * 1024 * 1024);
    if (big) { setError(`${big.name} is larger than ${limit} MB.`); return; }
    if (target === 'images' && data.images.length + files.length > 30) { setError('You can add up to 30 photos.'); return; }
    setUploading(target); setError('');
    try {
      const urls = documentTarget ? await uploadBusinessDocuments(files) : await uploadBusinessImages(files);
      if (target === 'logo') set('logo', urls[0] || '');
      else if (target === 'images') set('images', [...data.images, ...urls]);
      else if (target === 'brochure') set('brochureUrl', urls[0] || '');
      else set('kycDocuments', [...data.kycDocuments, ...urls.map(url => ({ type: kycType, url }))].slice(0, 10));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Upload failed. Please try again.'); }
    finally { setUploading(''); }
  }

  async function next() {
    setError('');
    if (Object.keys(errorsFor(step)).length) { setShowErrors(true); scrollTop(); return; }
    if (step === 3 && !(await geocode())) return;
    setShowErrors(false); setStep(step + 1); scrollTop();
  }

  async function submit() {
    const failing = steps.findIndex((_, index) => index < steps.length - 1 && Object.keys(errorsFor(index)).length);
    if (failing !== -1) { setStep(failing); setShowErrors(true); setError(`Please fix the highlighted fields in "${steps[failing].title}".`); scrollTop(); return; }
    setSaving(true); setError('');
    try {
      const faqs = data.faqs.filter(faq => faq.question.trim() && faq.answer.trim()).map(faq => ({ question: faq.question.trim(), answer: faq.answer.trim() }));
      const offers = data.offers.filter(offer => offer.title.trim()).map(offer => ({ title: offer.title.trim(), ...(offer.description.trim() ? { description: offer.description.trim() } : {}), ...(offer.code.trim() ? { code: offer.code.trim() } : {}) }));
      const optional = <T,>(value: T | '') => (value === '' ? undefined : value);
      const payload = {
        name: data.name.trim(), businessType: optional(data.businessType), tagline: data.tagline.trim() || undefined, description: data.description.trim() || undefined, establishedYear: data.establishedYear ? Number(data.establishedYear) : undefined, teamSize: data.teamSize ? Number(data.teamSize) : undefined,
        category: data.category, subcategories: data.subcategory ? [data.subcategory] : [], secondaryCategories: data.secondaryCategories.filter(id => id !== data.category), services: data.services,
        contactPerson: data.contactName || data.contactDesignation ? { name: data.contactName.trim(), designation: data.contactDesignation.trim() } : undefined,
        phone: data.phone, alternatePhone: data.alternatePhone || undefined, whatsapp: data.whatsapp || undefined, landline: data.landline.trim() || undefined, tollFree: data.tollFree.trim() || undefined, email: data.email.trim(), website: data.website || undefined,
        address: { addressLine1: data.addressLine1.trim(), addressLine2: data.addressLine2.trim(), landmark: data.landmark.trim(), locality: data.locality.trim(), city: data.city.trim(), state: data.state, postalCode: data.postalCode, country: data.country || 'IN' },
        location: coordinates ? { type: 'Point', coordinates: coordinates } : null, serviceAreas: data.serviceAreas, homeDelivery: data.homeDelivery, mapEmbedUrl: data.mapEmbedUrl || undefined,
        workingHours: hours.map(day => day.isClosed ? { day: day.day, isClosed: true } : day.is24Hours ? { day: day.day, isClosed: false, is24Hours: true } : { day: day.day, isClosed: false, opens: day.opens, closes: day.closes, ...(day.breakStart && day.breakEnd ? { breakStart: day.breakStart, breakEnd: day.breakEnd } : {}) }),
        paymentModes: data.paymentModes, languages: data.languages, priceRange: optional(data.priceRange), amenities: data.amenities, highlights: data.highlights,
        logo: data.logo, images: data.images, videoUrl: data.videoUrl || undefined, brochureUrl: data.brochureUrl || undefined,
        socialLinks: Object.fromEntries(Object.entries({ facebook: data.facebook, instagram: data.instagram, linkedin: data.linkedin, youtube: data.youtube, x: data.x }).filter(([, value]) => value)),
        gstNumber: data.gstNumber.trim().toUpperCase() || undefined, msmeNumber: data.msmeNumber.trim() || undefined, kycDocuments: data.kycDocuments, googlePlaceId: data.googlePlaceId.trim().replace(/\s+/g, ''), faqs, offers,
      };
      const saved = adminOptions ? await createAdminBusiness({ ...payload, email: payload.email || undefined, ownerId: ownerId || undefined, publish }) : businessId ? await updateOwnerBusiness(businessId, payload) : await createOwnerBusiness(payload);
      try { localStorage.removeItem(adminOptions ? adminDraftKey : draftKey); } catch { /* ignore */ }
      onSaved(saved, !businessId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save your business.'); scrollTop(); }
    finally { setSaving(false); }
  }

  const completeness = useMemo(() => completenessPercent(completenessSections({
    name: data.name, category: data.category, description: data.description, phone: data.phone, email: data.email,
    addressLine1: data.addressLine1, city: data.city, state: data.state, postalCode: data.postalCode,
    services: data.services.length, openDays: hours.filter(entry => !entry.isClosed).length,
    photos: data.images.length + (data.logo && !data.images.includes(data.logo) ? 1 : 0), website: data.website, verified: data.kycDocuments.length > 0 || Boolean(data.gstNumber),
  })), [data, hours]);
  const inputFor = (key: keyof Data, label: string, opts: { required?: boolean; hint?: string; type?: string; placeholder?: string; max?: number; className?: string; inputMode?: 'numeric' | 'tel' | 'email' | 'url' | 'text' } = {}) => (
    <Field label={label} required={opts.required} hint={opts.hint} error={errors[key]} className={opts.className}>
      <input type={opts.type || 'text'} inputMode={opts.inputMode} maxLength={opts.max} value={String(data[key] ?? '')} placeholder={opts.placeholder} onChange={event => set(key, event.target.value as never)} aria-invalid={Boolean(errors[key])} className={inputClass(Boolean(errors[key]))} />
    </Field>
  );
  const phoneFor = (key: 'phone' | 'alternatePhone' | 'whatsapp', label: string, required?: boolean, hint?: string) => (
    <Field label={label} required={required} hint={hint} error={errors[key]}>
      <div className={`mt-1.5 flex overflow-hidden rounded-xl border bg-white focus-within:ring-2 ${errors[key] ? 'border-red-400 focus-within:ring-red-100' : 'border-[#cfcec8] focus-within:border-[#002fa7] focus-within:ring-[#002fa7]/15'}`}>
        <span className="flex items-center border-r border-[#dcdbd5] bg-[#f6f6f3] px-3 text-sm text-[#4a4c55]">+91</span>
        <input inputMode="numeric" autoComplete="tel-national" maxLength={10} value={data[key]} placeholder="10-digit number" onChange={event => set(key, event.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full px-3 py-2.5 text-[15px] outline-none placeholder:text-[#4a4c55]" />
      </div>
    </Field>
  );
  const updateHour = (index: number, patch: Partial<Hours>) => setHours(current => current.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)));
  const section = (title: string, children: React.ReactNode, note?: string) => <div className="rounded-xl border border-[#dcdbd5] bg-white p-5 sm:p-6"><h4 className="text-base font-semibold">{title}</h4>{note && <p className="mt-0.5 text-sm text-[#4a4c55]">{note}</p>}<div className="mt-4 space-y-4">{children}</div></div>;
  const timeInput = (value: string, onChange: (value: string) => void, label: string) => <input type="time" aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="rounded-xl border border-[#cfcec8] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#002fa7]" />;

  const reviewItems: { title: string; step: number; value: string }[] = [
    { title: 'Business', step: 0, value: [data.name, businessTypes.find(([id]) => id === data.businessType)?.[1], data.tagline, data.establishedYear && `Since ${data.establishedYear}`].filter(Boolean).join(' · ') },
    { title: 'Categories', step: 1, value: [primary?.name && `Primary: ${primary.name}`, subcategory?.name, data.secondaryCategories.length && `${data.secondaryCategories.length} additional`, `${data.services.length} services`].filter(Boolean).join(' · ') },
    { title: 'Contact', step: 2, value: [data.phone && `+91 ${data.phone}`, data.whatsapp && `WhatsApp ${data.whatsapp}`, data.email, data.website].filter(Boolean).join(' · ') },
    { title: 'Location', step: 3, value: [[data.addressLine1, data.locality, data.city, data.state, data.postalCode].filter(Boolean).join(', '), coordinates ? 'Map location found' : 'No map location'].join(' · ') },
    { title: 'Hours & payments', step: 4, value: [`${hours.filter(day => !day.isClosed).length} days open`, data.paymentModes.length && `${data.paymentModes.length} payment modes`, data.languages.join(', ')].filter(Boolean).join(' · ') },
    { title: 'Photos & media', step: 5, value: [`${data.images.length} photos`, data.logo ? 'Logo added' : 'No logo', data.videoUrl && 'Video'].filter(Boolean).join(' · ') },
    { title: 'Trust & extras', step: 6, value: [data.gstNumber && `GST ${data.gstNumber}`, data.kycDocuments.length && `${data.kycDocuments.length} documents`, `${data.faqs.filter(faq => faq.question).length} FAQs`, `${data.offers.filter(offer => offer.title).length} offers`].filter(Boolean).join(' · ') },
  ];
  const cover = data.images[0] || data.logo;

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f1f1ee] sm:bg-black/40 sm:p-4">
    <div className="mx-auto flex min-h-screen max-w-[1180px] flex-col bg-[#f1f1ee] sm:my-3 sm:min-h-0 sm:overflow-hidden sm:rounded-xl sm:shadow-2xl">
      <header className="flex items-center justify-between gap-4 border-b border-[#dcdbd5] bg-white px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-3"><Image src="/images/lokal-lens-figma.svg" alt="Lokal Lens" width={150} height={28} className="h-7 w-auto" /><span className="hidden text-sm text-[#4a4c55] sm:inline">{adminOptions ? 'Add a business (admin)' : businessId ? 'Edit business listing' : 'Add your business'}</span></div>
        <div className="flex items-center gap-4"><div className="hidden items-center gap-2 sm:flex" title="Profile completeness"><div className="h-2 w-28 overflow-hidden rounded-full bg-[#e5e4de]"><div className="h-full rounded-full bg-[#2b7a26] transition-all" style={{ width: `${completeness}%` }} /></div><span className="text-xs font-medium text-[#4a4c55]">{completeness}% complete</span></div><button type="button" onClick={onClose} aria-label="Close form" className="rounded-xl p-2 hover:bg-[#f1f1ee]"><X size={20} /></button></div>
      </header>
      <nav aria-label="Form steps" className="overflow-x-auto border-b border-[#dcdbd5] bg-white px-5 py-3 sm:px-8"><ol className="flex min-w-max gap-2">{steps.map((item, index) => <li key={item.title}><button type="button" disabled={index > step && !businessId} onClick={() => { if (index <= step || businessId) { setStep(index); setError(''); } }} aria-current={index === step ? 'step' : undefined} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition ${index === step ? 'bg-[#002fa7] text-white' : index < step ? 'bg-[#e7f4e5] text-[#1f6a2a]' : 'text-[#4a4c55]'} disabled:cursor-default`}><span className={`grid h-5 w-5 place-items-center rounded-full text-[13px] font-semibold ${index === step ? 'bg-white/20' : index < step ? 'bg-[#2b7a26] text-white' : 'bg-[#e5e4de]'}`}>{index < step ? <Check size={12} /> : index + 1}</span><span className="hidden md:inline">{item.title}</span></button></li>)}</ol></nav>
      <div ref={topRef} className="grid flex-1 gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,.8fr)]">
        <main className="min-w-0 space-y-5">
          <div><p className="text-xs font-medium uppercase tracking-wider text-[#002fa7]">Step {step + 1} of {steps.length}</p><h2 className="mt-1 text-2xl font-semibold">{steps[step].title}</h2><p className="mt-1 text-sm text-[#4a4c55]">{steps[step].help}</p></div>
          {restored && !businessId && <p className="flex items-center justify-between gap-3 rounded-xl bg-[#e8eefc] p-3 text-sm text-[#00247f]">We restored your unsaved draft.<button type="button" className="font-semibold underline" onClick={() => { try { localStorage.removeItem(adminOptions ? adminDraftKey : draftKey); } catch { /* ignore */ } setData(emptyData); setHours(defaultHours()); setRestored(false); setStep(0); }}>Start over</button></p>}
          {status === 'rejected' && reviewReason && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700"><strong>Changes requested:</strong> {reviewReason}</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {step === 0 && <>
            {section('About your business', <>
              {inputFor('name', 'Business name', { required: true, max: 180, placeholder: 'e.g. Sharma Dental Clinic' })}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business type"><select value={data.businessType} onChange={event => set('businessType', event.target.value)} className={inputClass()}><option value="">Select type</option>{businessTypes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
                <Field label="Established year"><select value={data.establishedYear} onChange={event => set('establishedYear', event.target.value)} className={inputClass()}><option value="">Select year</option>{yearOptions.map(year => <option key={year} value={year}>{year}</option>)}</select></Field>
              </div>
              {inputFor('tagline', 'Tagline', { max: 160, hint: 'A short line shown under your name, e.g. "Painless dental care for the whole family".' })}
              <Field label="Description" required={!lenient} error={errors.description} hint={`${data.description.length}/10000 characters. Mention what you offer, who you serve and what makes you different.`}><textarea rows={6} maxLength={10000} value={data.description} onChange={event => set('description', event.target.value)} aria-invalid={Boolean(errors.description)} className={inputClass(Boolean(errors.description))} /></Field>
              {inputFor('teamSize', 'Team size', { type: 'number', inputMode: 'numeric', hint: 'Optional. Number of people working in your business.' })}
            </>)}
          </>}

          {step === 1 && <>
            {section('Primary category', <>
              <Field label="Main category" required error={errors.category} hint="Pick the one category that best describes your business. This decides where you appear first."><Combo options={primaryOptions} selected={data.category ? [data.category] : []} invalid={Boolean(errors.category)} placeholder="Search a category, e.g. Dentist" onChange={([id]) => setData(current => ({ ...current, category: id, subcategory: '', secondaryCategories: current.secondaryCategories.filter(item => item !== id) }))} /></Field>
              {(primary?.children?.length ?? 0) > 0 && <Field label="Sub-category" hint="Optional. Narrow down your main category."><select value={data.subcategory} onChange={event => set('subcategory', event.target.value)} className={inputClass()}><option value="">None</option>{primary?.children?.map(child => <option key={child._id} value={child._id}>{child.name}</option>)}</select></Field>}
            </>)}
            {section('Additional categories', <Field label="Also list my business under" hint="Optional. Add up to 9 more categories so customers can find you in related searches."><Combo multi max={9} options={additionalOptions} selected={data.secondaryCategories} placeholder="Search and add categories" onChange={value => set('secondaryCategories', value)} /></Field>)}
            {section('Services', <Field label="What do you offer?" required error={errors.services} hint="Add each service separately. Customers search by these."><TagInput value={data.services} onChange={value => set('services', value)} suggestions={serviceSuggestions} max={100} placeholder="Type a service and press Enter" /></Field>)}
          </>}

          {step === 2 && <>
            {section('Phone numbers', <>
              <div className="grid gap-4 sm:grid-cols-2">{phoneFor('phone', 'Mobile number', !pendingEdit, 'Customers will call this number.')}{phoneFor('whatsapp', 'WhatsApp number', false)}</div>
              <button type="button" onClick={() => set('whatsapp', data.phone)} disabled={!data.phone} className="text-sm font-medium text-[#002fa7] disabled:opacity-40">Use my mobile number for WhatsApp</button>
              <div className="grid gap-4 sm:grid-cols-2">{phoneFor('alternatePhone', 'Alternate number', false)}{inputFor('landline', 'Landline', { placeholder: 'e.g. 0120 4123456', max: 20, inputMode: 'tel' })}</div>
              {inputFor('tollFree', 'Toll-free number', { placeholder: '1800 ...', max: 20, inputMode: 'tel', className: 'sm:max-w-[50%]' })}
            </>)}
            {section('Online', <>
              <div className="grid gap-4 sm:grid-cols-2">{inputFor('email', 'Business email', { required: !pendingEdit && !lenient, type: 'email', inputMode: 'email', max: 254 })}{inputFor('website', 'Website', { placeholder: 'https://', max: 2048, inputMode: 'url' })}</div>
            </>)}
            {section('Contact person', <div className="grid gap-4 sm:grid-cols-2">{inputFor('contactName', 'Name', { max: 120 })}{inputFor('contactDesignation', 'Designation', { max: 120, placeholder: 'Owner, Manager...' })}</div>, 'Optional. Shown to customers so they know who to ask for.')}
          </>}

          {step === 3 && <>
            {section('Business address', <>
              {inputFor('addressLine1', 'Building / street', { required: true, max: 250, placeholder: 'Shop no., building, street' })}
              <div className="grid gap-4 sm:grid-cols-2">{inputFor('addressLine2', 'Area / colony', { max: 250 })}{inputFor('landmark', 'Landmark', { max: 150, placeholder: 'Near ...' })}</div>
              <div className="grid gap-4 sm:grid-cols-2">{inputFor('locality', 'Locality / sector', { max: 120 })}{inputFor('city', 'City', { required: true, max: 120 })}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="State" required error={errors.state}><select value={data.state} onChange={event => set('state', event.target.value)} aria-invalid={Boolean(errors.state)} className={inputClass(Boolean(errors.state))}><option value="">Select state</option>{states.map(name => <option key={name} value={name}>{name}</option>)}</select></Field>
                <Field label="PIN code" error={errors.postalCode}><input inputMode="numeric" maxLength={6} value={data.postalCode} onChange={event => set('postalCode', event.target.value.replace(/\D/g, '').slice(0, 6))} className={inputClass(Boolean(errors.postalCode))} /></Field>
              </div>
              <p className="text-sm text-[#4a4c55]">{geocoding ? 'Finding your location on the map…' : coordinates ? <>Map location found{locationLabel ? `: ${locationLabel}` : ''}.</> : 'We will find your map location from this address when you continue.'}</p>
            </>)}
            {section('Service area & delivery', <>
              <Field label="Areas you serve" hint="Optional. Add localities, sectors or cities where you provide service."><TagInput value={data.serviceAreas} onChange={value => set('serviceAreas', value)} max={50} placeholder="e.g. Indirapuram, Vaishali" /></Field>
              <Toggle checked={data.homeDelivery} onChange={value => set('homeDelivery', value)} label="I offer home delivery / home service" />
            </>)}
          </>}

          {step === 4 && <>
            {section('Opening hours', <>
              {errors.hours && <p role="alert" className="text-sm font-medium text-red-600">{errors.hours}</p>}
              <div className="flex flex-wrap gap-2 text-sm"><button type="button" onClick={() => setHours(current => current.map(day => ({ ...current[0], day: day.day })))} className="rounded-xl border border-[#cfcec8] px-3 py-1.5 hover:border-[#002fa7]">Copy Monday to all days</button><button type="button" onClick={() => setHours(current => current.map(day => ({ ...day, isClosed: false, is24Hours: true })))} className="rounded-xl border border-[#cfcec8] px-3 py-1.5 hover:border-[#002fa7]">Open 24 × 7</button></div>
              <div className="divide-y divide-[#ecebe6] rounded-xl border border-[#dcdbd5]">{hours.map((entry, index) => <div key={entry.day} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3"><span className="w-24 text-sm font-semibold capitalize">{entry.day}</span>
                <select aria-label={`${entry.day} status`} value={entry.isClosed ? 'closed' : entry.is24Hours ? '24' : 'open'} onChange={event => updateHour(index, { isClosed: event.target.value === 'closed', is24Hours: event.target.value === '24' })} className="rounded-xl border border-[#cfcec8] bg-white px-2 py-1.5 text-sm"><option value="open">Open</option><option value="24">Open 24 hours</option><option value="closed">Closed</option></select>
                {!entry.isClosed && !entry.is24Hours && <><div className="flex items-center gap-2 text-sm">{timeInput(entry.opens, value => updateHour(index, { opens: value }), `${entry.day} opens`)}<span>to</span>{timeInput(entry.closes, value => updateHour(index, { closes: value }), `${entry.day} closes`)}</div><div className="flex items-center gap-2 text-xs text-[#4a4c55]">Break {timeInput(entry.breakStart, value => updateHour(index, { breakStart: value }), `${entry.day} break starts`)}<span>to</span>{timeInput(entry.breakEnd, value => updateHour(index, { breakEnd: value }), `${entry.day} break ends`)}</div></>}
              </div>)}</div>
            </>)}
            {section('Payments & languages', <>
              <Field label="Payment modes accepted"><ChoiceChips options={paymentOptions} value={data.paymentModes} onChange={value => set('paymentModes', value)} /></Field>
              <Field label="Languages spoken"><TagInput value={data.languages} onChange={value => set('languages', value)} suggestions={languageSuggestions} max={15} placeholder="Add a language" /></Field>
              <Field label="Price range"><div className="mt-2 flex flex-wrap gap-2">{priceOptions.map(([id, label]) => <button key={id} type="button" aria-pressed={data.priceRange === id} onClick={() => set('priceRange', data.priceRange === id ? '' : id)} className={`rounded-xl border px-3.5 py-1.5 text-sm ${data.priceRange === id ? 'border-[#002fa7] bg-[#002fa7] text-white' : 'border-[#cfcec8] bg-white hover:border-[#002fa7]'}`}>{label}</button>)}</div></Field>
              <Field label="Facilities & amenities"><TagInput value={data.amenities} onChange={value => set('amenities', value)} suggestions={amenitySuggestions} max={50} placeholder="e.g. Parking" /></Field>
            </>)}
          </>}

          {step === 5 && <>
            {section('Logo', <div className="flex items-center gap-4">{data.logo ? <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#dcdbd5] bg-white"><Image src={data.logo} alt="Business logo" fill sizes="80px" className="object-contain" /></div> : <div className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-[#bdbcb5] text-xs text-[#4a4c55]">No logo</div>}<div className="space-y-1.5"><label className="inline-block cursor-pointer rounded-xl border border-[#cfcec8] bg-white px-3.5 py-2 text-sm font-medium hover:border-[#002fa7]">{uploading === 'logo' ? 'Uploading…' : data.logo ? 'Change logo' : 'Upload logo'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={event => upload(event, 'logo')} /></label>{data.logo && <button type="button" onClick={() => set('logo', '')} className="ml-2 text-sm text-red-600">Remove</button>}<p className="text-xs text-[#4a4c55]">Square image, up to 5 MB.</p></div></div>)}
            {section('Photos', <>
              <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-[#bdbcb5] bg-[#fafaf8] px-4 py-8 text-center hover:border-[#002fa7]"><span className="text-sm font-semibold">{uploading === 'images' ? 'Uploading…' : 'Click to add photos'}</span><span className="text-xs text-[#4a4c55]">JPEG, PNG, WebP up to 5 MB each. {data.images.length}/30 added. Add shop front, interior, products and team.</span><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={event => upload(event, 'images')} /></label>
              {data.images.length > 0 && <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{data.images.map((url, index) => <li key={url} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[#dcdbd5] bg-white"><Image src={url} alt={`Business photo ${index + 1}`} fill sizes="200px" className="object-cover" />{index === 0 && <span className="absolute left-2 top-2 rounded-xl bg-[#002fa7] px-1.5 py-0.5 text-[12px] font-semibold text-white">COVER</span>}<div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/55 p-1.5 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">{index > 0 ? <button type="button" onClick={() => set('images', [url, ...data.images.filter(item => item !== url)])} className="flex items-center gap-1 text-xs text-white"><Star size={12} />Make cover</button> : <span />}<button type="button" aria-label="Remove photo" onClick={() => set('images', data.images.filter(item => item !== url))} className="text-white"><Trash2 size={14} /></button></div></li>)}</ul>}
            </>)}
            {section('Video & brochure', <div className="grid gap-4 sm:grid-cols-2">{inputFor('videoUrl', 'Video link (YouTube)', { placeholder: 'https://', inputMode: 'url' })}<div>{inputFor('brochureUrl', 'Brochure / menu link', { placeholder: 'https://', inputMode: 'url' })}<label className="mt-2 inline-block cursor-pointer text-sm font-medium text-[#002fa7]">{uploading === 'brochure' ? 'Uploading…' : 'or upload a PDF'}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={event => upload(event, 'brochure')} /></label></div></div>)}
            {section('Social media', <div className="grid gap-4 sm:grid-cols-2">{inputFor('facebook', 'Facebook', { placeholder: 'https://facebook.com/...', inputMode: 'url' })}{inputFor('instagram', 'Instagram', { placeholder: 'https://instagram.com/...', inputMode: 'url' })}{inputFor('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/...', inputMode: 'url' })}{inputFor('youtube', 'YouTube channel', { placeholder: 'https://youtube.com/...', inputMode: 'url' })}{inputFor('x', 'X (Twitter)', { placeholder: 'https://x.com/...', inputMode: 'url' })}</div>)}
          </>}

          {step === 6 && <>
            {section('Business verification', <>
              <div className="grid gap-4 sm:grid-cols-2">{inputFor('gstNumber', 'GST number', { max: 15, placeholder: '09ABCDE1234F1Z5', hint: 'Optional. Verified businesses get a trust badge.' })}{inputFor('msmeNumber', 'MSME / Udyam number', { max: 30 })}</div>
              <Field label="Supporting documents" hint="Optional. Upload your GST certificate, shop licence or similar (PDF or photo, up to 8 MB). Our team reviews it privately.">
                <div className="mt-2 space-y-2">{data.kycDocuments.map((doc, index) => <div key={doc.url} className="flex items-center justify-between rounded-xl border border-[#dcdbd5] bg-white px-3 py-2 text-sm"><span>{kycTypes.find(([id]) => id === doc.type)?.[1] || 'Document'} <span className="text-[#4a4c55]">uploaded</span></span><button type="button" aria-label="Remove document" onClick={() => set('kycDocuments', data.kycDocuments.filter((_, position) => position !== index))} className="text-red-600"><Trash2 size={15} /></button></div>)}
                  <div className="flex flex-wrap gap-2">{kycTypes.map(([id, label]) => <label key={id} className="cursor-pointer rounded-xl border border-[#cfcec8] bg-white px-3 py-1.5 text-sm hover:border-[#002fa7]">{uploading === 'kyc' ? 'Uploading…' : `+ ${label}`}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={event => upload(event, 'kyc', id)} /></label>)}</div></div>
              </Field>
            </>)}
            {section('Highlights', <Field label="What makes you special?" hint="Short points, e.g. '15+ years experience', 'Free home pickup'."><TagInput value={data.highlights} onChange={value => set('highlights', value)} max={10} placeholder="Add a highlight" /></Field>)}
            {section('Offers', <>
              {errors.offers && <p role="alert" className="text-sm font-medium text-red-600">{errors.offers}</p>}
              {data.offers.map((offer, index) => <div key={index} className="space-y-3 rounded-xl border border-[#dcdbd5] p-4"><div className="flex justify-between"><span className="text-sm font-semibold">Offer {index + 1}</span><button type="button" aria-label="Remove offer" onClick={() => set('offers', data.offers.filter((_, position) => position !== index))} className="text-red-600"><Trash2 size={15} /></button></div><div className="grid gap-3 sm:grid-cols-[2fr_1fr]"><input aria-label="Offer title" placeholder="Offer title, e.g. 20% off first visit" value={offer.title} onChange={event => set('offers', data.offers.map((item, position) => (position === index ? { ...item, title: event.target.value } : item)))} className={inputClass()} /><input aria-label="Promo code" placeholder="Promo code (optional)" value={offer.code} onChange={event => set('offers', data.offers.map((item, position) => (position === index ? { ...item, code: event.target.value } : item)))} className={inputClass()} /></div><input aria-label="Offer details" placeholder="Details (optional)" value={offer.description} onChange={event => set('offers', data.offers.map((item, position) => (position === index ? { ...item, description: event.target.value } : item)))} className={inputClass()} /></div>)}
              {data.offers.length < 10 && <button type="button" onClick={() => set('offers', [...data.offers, { title: '', description: '', code: '' }])} className="flex items-center gap-1.5 text-sm font-medium text-[#002fa7]"><Plus size={16} />Add an offer</button>}
            </>)}
            {section('Frequently asked questions', <>
              {errors.faqs && <p role="alert" className="text-sm font-medium text-red-600">{errors.faqs}</p>}
              {data.faqs.map((faq, index) => <div key={index} className="space-y-3 rounded-xl border border-[#dcdbd5] p-4"><div className="flex justify-between"><span className="text-sm font-semibold">Question {index + 1}</span><button type="button" aria-label="Remove FAQ" onClick={() => set('faqs', data.faqs.filter((_, position) => position !== index))} className="text-red-600"><Trash2 size={15} /></button></div><input aria-label="Question" placeholder="Question" maxLength={500} value={faq.question} onChange={event => set('faqs', data.faqs.map((item, position) => (position === index ? { ...item, question: event.target.value } : item)))} className={inputClass()} /><textarea aria-label="Answer" placeholder="Answer" rows={3} maxLength={3000} value={faq.answer} onChange={event => set('faqs', data.faqs.map((item, position) => (position === index ? { ...item, answer: event.target.value } : item)))} className={inputClass()} /></div>)}
              {data.faqs.length < 20 && <button type="button" onClick={() => set('faqs', [...data.faqs, { question: '', answer: '' }])} className="flex items-center gap-1.5 text-sm font-medium text-[#002fa7]"><Plus size={16} />Add a question</button>}
            </>)}
            {section('Google Business link', <Field label="Google Place ID" hint="Optional. Lets us show your Google rating and reviews on your profile. Find it with Google's Place ID Finder."><input value={data.googlePlaceId} onChange={event => set('googlePlaceId', event.target.value)} maxLength={300} placeholder="e.g. ChIJ..." className={inputClass()} /></Field>)}
          </>}

          {step === 7 && <>
            <div className="rounded-xl border border-[#dcdbd5] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><h4 className="font-semibold">Profile completeness</h4><span className="text-sm font-semibold text-[#1f6a2a]">{completeness}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5e4de]"><div className="h-full rounded-full bg-[#2b7a26]" style={{ width: `${completeness}%` }} /></div><p className="mt-2 text-sm text-[#4a4c55]">{completeness < 70 ? 'Add more details, photos and services to get more enquiries.' : 'Great, your profile looks strong.'}</p></div>
            <div className="divide-y divide-[#ecebe6] rounded-xl border border-[#dcdbd5] bg-white">{reviewItems.map(item => <div key={item.title} className="flex items-start justify-between gap-4 p-4"><div className="min-w-0"><p className="text-sm font-semibold">{item.title}</p><p className="mt-0.5 break-words text-sm text-[#4a4c55]">{item.value || 'Not added'}</p></div><button type="button" onClick={() => { setStep(item.step); setShowErrors(false); }} className="shrink-0 text-sm font-medium text-[#002fa7]">Edit</button></div>)}</div>
            {adminOptions && <div className="space-y-4 rounded-xl border border-[#dcdbd5] bg-white p-5 sm:p-6"><h4 className="font-semibold">Admin options</h4><Field label="Assign to business owner" hint="Optional. The owner can then edit this listing. You can assign later."><select value={ownerId} onChange={event => setOwnerId(event.target.value)} className={inputClass()}><option value="">No owner yet</option>{adminOptions.owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name} · {owner.email}</option>)}</select></Field><Toggle checked={publish} onChange={setPublish} label="Publish immediately (skip review)" /></div>}
            <p className="text-sm text-[#4a4c55]">{adminOptions ? (publish ? 'This listing goes live right away.' : 'This listing is saved as a draft.') : businessId ? 'Saving updates your listing. Major changes may be re-reviewed by our team.' : 'Your listing will be reviewed by our team and published after approval.'}</p>
          </>}
        </main>

        <aside className="hidden lg:block"><div className="sticky top-4 space-y-3">
          <div className="overflow-hidden rounded-xl border border-[#dcdbd5] bg-white"><div className="relative aspect-[16/9] bg-[#e5e4de]">{cover ? <Image src={cover} alt="Cover preview" fill sizes="320px" className="object-cover" /> : <div className="grid h-full place-items-center text-sm text-[#4a4c55]">Your cover photo</div>}</div>
            <div className="space-y-1.5 p-4"><h3 className="text-base font-semibold">{data.name || 'Your business name'}</h3>{data.tagline && <p className="text-sm text-[#4a4c55]">{data.tagline}</p>}<p className="text-xs text-[#4a4c55]">{[primary?.name, data.locality || data.city].filter(Boolean).join(' · ') || 'Category · Location'}</p>{data.services.length > 0 && <div className="flex flex-wrap gap-1 pt-1">{data.services.slice(0, 4).map(service => <span key={service} className="rounded-xl bg-[#f1f1ee] px-2 py-0.5 text-[13px]">{service}</span>)}{data.services.length > 4 && <span className="text-[13px] text-[#4a4c55]">+{data.services.length - 4}</span>}</div>}{data.phone && <p className="pt-1 text-sm font-medium text-[#002fa7]">+91 {data.phone}</p>}</div></div>
          <p className="px-1 text-xs text-[#4a4c55]">This is how your listing will look in search results.</p>
        </div></aside>
      </div>
      <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#dcdbd5] bg-white px-5 py-3.5 sm:px-8">
        <button type="button" onClick={() => { if (step === 0) onClose(); else { setStep(step - 1); setError(''); setShowErrors(false); } }} className="h-11 rounded-xl border border-[#cfcec8] px-5 text-sm font-semibold hover:bg-[#f1f1ee]">{step === 0 ? 'Cancel' : 'Back'}</button>
        {step < steps.length - 1 ? <button type="button" onClick={next} disabled={geocoding || !loaded} className="h-11 rounded-xl bg-[#002fa7] px-7 text-sm font-semibold text-white hover:bg-[#00247f] disabled:opacity-60">{geocoding ? 'Finding location…' : 'Save & continue'}</button>
          : <button type="button" onClick={submit} disabled={saving || Boolean(uploading)} className="h-11 rounded-xl bg-[#002fa7] px-7 text-sm font-semibold text-white hover:bg-[#00247f] disabled:opacity-60">{saving ? 'Saving…' : adminOptions ? (publish ? 'Publish listing' : 'Save draft') : businessId ? 'Save changes' : 'Submit for review'}</button>}
      </footer>
    </div>
  </div>;
};
