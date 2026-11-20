"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, BadgeCheck, CheckCircle2, Clock, Copy, FileText, Globe, Pencil, ImagePlus, Mail, MessageCircle, Phone, Plus, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "@/components/BrandIcons";
import { Button, Chip, Field, Logo, cx, fieldClass, labelClass } from "@/components/ds";
import BusinessCard from "@/components/ds/BusinessCard";
import PinPicker from "@/components/PinPicker";
import { useConfirm } from "@/components/ConfirmProvider";
import { AMENITY_SUGGESTIONS, BUSINESS_TYPES, DAYS, DOC_TYPES, INDIAN_STATES, LANGUAGES, PAYMENT_MODES, PRICE_RANGES, STEP_FIELDS, check, checkFaq, checkOffer, checkService, checkSpecialHours, clean } from "@/lib/business-validation";
import { createAdminBusiness, createOwnerBusiness, geocodeBusinessAddress, loadAdminBusiness, loadAdminOwners, loadBusinessFormData, loadOwnerBusiness, request, updateAdminBusiness, updateOwnerBusiness, uploadBusinessDocuments, uploadBusinessImages } from "@/dashboard/api";

const DRAFT_KEY = "lokal-lens-business-draft";
const STEPS = ["Basics", "Location", "Services & hours", "Photos & contact", "Preview"];
const MAX_PHOTO = 10 * 1024 * 1024;
const YEARS = Array.from({ length: new Date().getFullYear() - 1899 }, (_, index) => String(new Date().getFullYear() - index));

const emptyHours = () => Object.fromEntries(DAYS.map((day) => [day, { open: day !== "sunday", opens: "09:00", closes: "20:00" }]));
const initial = {
  name: "", category: "", subcategory: "", secondary: [], tagline: "", description: "", businessType: "", establishedYear: "",
  mode: "visit", addressLine1: "", locality: "", city: "", state: "", postalCode: "", landmark: "", serviceAreas: [],
  services: [], hours: emptyHours(), special: [], paymentModes: [], languages: [], priceRange: "", amenities: [], homeDelivery: false, offers: [],
  phone: "", alternatePhone: "", whatsapp: "", email: "", website: "", facebook: "", instagram: "", youtube: "",
  gstNumber: "", kycDocuments: [], faqs: [],
};

const money = (value) => (value === "" || value === undefined || value === null ? "" : `₹${Number(value).toLocaleString("en-IN")}`);
const priceText = (service) => (service.priceFrom ? `${service.priceTo ? "" : "From "}${money(service.priceFrom)}${service.priceTo ? ` – ${money(service.priceTo)}` : ""}${service.unit ? ` / ${service.unit}` : ""}` : "Contact for pricing");
const idOf = (value) => String(value?._id || value || "");

// Opening hours: 30-minute steps shown as 9:00 AM, stored as 24-hour "09:00".
const two = (n) => String(n).padStart(2, "0");
const selectPart = "h-9 cursor-pointer appearance-none rounded-[6px] bg-transparent px-1.5 text-center font-body text-[15px] text-[#101115] outline-none hover:bg-[#f0efe9] focus:bg-[#e8edf8]";
function TimeSelect({ value, onChange, label, invalid }) {
  const [h24, m] = String(value).split(":").map(Number);
  const hour = h24 % 12 || 12;
  const pm = h24 >= 12;
  const emit = (nextHour, nextMinute, nextPm) => onChange(`${two((nextHour % 12) + (nextPm ? 12 : 0))}:${two(nextMinute)}`);
  return (
    <span role="group" aria-label={label} className={cx("inline-flex h-11 items-center gap-0.5 rounded-[10px] border bg-white pl-2.5 pr-1 transition-[border-color] focus-within:border-[#002fa7] focus-within:ring-2 focus-within:ring-[#002fa7]/20 hover:border-[#101115]", invalid ? "border-2 border-[#b42318]" : "border-[#bdbcb5]")}>
      <Clock size={16} className="mr-1 shrink-0 text-[#6e7079]" aria-hidden="true" />
      <select aria-label={`${label}: hour`} value={hour} onChange={(event) => emit(Number(event.target.value), m, pm)} className={cx(selectPart, "w-10")}>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select>
      <span className="text-[#6e7079]" aria-hidden="true">:</span>
      <select aria-label={`${label}: minute`} value={m} onChange={(event) => emit(hour, Number(event.target.value), pm)} className={cx(selectPart, "w-10")}>{Array.from({ length: 60 }, (_, i) => i).map((n) => <option key={n} value={n}>{two(n)}</option>)}</select>
      <select aria-label={`${label}: AM or PM`} value={pm ? "PM" : "AM"} onChange={(event) => emit(hour, m, event.target.value === "PM")} className={cx(selectPart, "w-12 font-medium")}><option>AM</option><option>PM</option></select>
    </span>
  );
}

const timeText = (value) => { const [h, m] = String(value).split(":").map(Number); if (Number.isNaN(h)) return value; return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
function PreviewCard({ title, onEdit, children }) {
  return (
    <section className="rounded-[14px] border border-[#dcdbd5] bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-[#ecebe7] px-5 py-3">
        <h3 className="font-display text-[16px] font-semibold leading-6 text-[#101115]">{title}</h3>
        <button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-2.5 text-[14px] font-medium text-[#002fa7] hover:bg-[#eef2fb]"><Pencil size={15} aria-hidden="true" />Edit</button>
      </header>
      <dl className="flex flex-col px-5">{children}</dl>
    </section>
  );
}
function PreviewRow({ label, children }) {
  const empty = children === undefined || children === null || children === "" || children === false;
  return (
    <div className="grid gap-1 border-b border-[#f1f0ec] py-3 last:border-0 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="font-display text-[14px] font-medium leading-6 text-[#6e7079]">{label}</dt>
      <dd className="min-w-0 break-words text-[16px] leading-6 text-[#101115]">{empty ? <span className="text-[#9a9ba3]">Not added</span> : children}</dd>
    </div>
  );
}

// Text input with a leading icon (and optional +91 prefix) for contact and social fields.
function IconInput({ icon, prefix, tone = "text-[#6e7079]", children }) {
  return (
    <div className="relative">
      <span className={cx("pointer-events-none absolute left-3.5 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2", tone)}>{icon}{prefix && <span className="font-body text-[15px] text-[#4a4c55]">{prefix}</span>}</span>
      {children}
    </div>
  );
}

// Turns a saved listing back into the form's shape, so editing uses exactly the same form as adding.
function fromApi(item) {
  const hours = emptyHours();
  (item.workingHours || []).forEach((entry) => { if (hours[entry.day]) hours[entry.day] = { open: !entry.isClosed, opens: entry.opens || "09:00", closes: entry.closes || "20:00" }; });
  return {
    ...initial,
    name: item.name || "", category: idOf(item.category), subcategory: idOf(item.subcategories?.[0]), secondary: (item.secondaryCategories || []).map(idOf),
    tagline: item.tagline || "", description: item.description || "", businessType: item.businessType || "", establishedYear: item.establishedYear ? String(item.establishedYear) : "",
    mode: item.serviceMode || "visit", addressLine1: item.address?.addressLine1 || "", locality: item.address?.locality || "", city: item.address?.city || "", state: item.address?.state || "", postalCode: item.address?.postalCode || "", landmark: item.address?.landmark || "", serviceAreas: item.serviceAreas || [],
    services: item.serviceItems?.length ? item.serviceItems.map(({ name, priceFrom, priceTo, unit }) => ({ name, ...(priceFrom ? { priceFrom } : {}), ...(priceTo ? { priceTo } : {}), ...(unit ? { unit } : {}) })) : (item.services || []).map((name) => ({ name })),
    hours, special: item.specialHours || [], paymentModes: item.paymentModes || [], languages: item.languages || [], priceRange: item.priceRange || "", amenities: item.amenities || [], homeDelivery: Boolean(item.homeDelivery),
    offers: (item.offers || []).map((offer) => ({ title: offer.title, description: offer.description || "", code: offer.code || "", occasion: offer.occasion || "", validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().slice(0, 10) : "" })),
    phone: item.phone || "", alternatePhone: item.alternatePhone || "", whatsapp: item.whatsapp || "", email: item.email || "", website: item.website || "",
    facebook: item.socialLinks?.facebook || "", instagram: item.socialLinks?.instagram || "", youtube: item.socialLinks?.youtube || "",
    gstNumber: item.gstNumber || "", kycDocuments: item.kycDocuments || [], faqs: (item.faqs || []).map(({ question, answer }) => ({ question, answer })),
  };
}

function Stepper({ step, onSelect, embedded }) {
  return (
    <ol className={cx("mx-auto grid w-full max-w-[1440px] grid-cols-5 gap-2", embedded ? "py-4" : "px-4 py-5 md:px-8 lg:px-[72px] lg:py-7")} aria-label="Progress">
      {STEPS.map((label, index) => {
        const done = index < step; const current = index === step;
        const body = (
          <>
            <span className={cx("h-1 rounded-sm", done || current ? "bg-[#002fa7]" : "bg-[#dcdbd5]")} />
            <span className={cx("flex items-center gap-1.5 font-display leading-[18px]", current ? "text-[14px] font-medium leading-5 text-[#101115]" : done ? "text-[13px] font-medium text-[#002fa7]" : "text-[13px] font-medium text-[#6e7079]")}>
              {done && <CheckCircle2 size={14} aria-hidden="true" />}
              <span className="hidden sm:inline">{done ? label : `${String(index + 1).padStart(2, "0")}  ${label}`}</span>
              <span className="sm:hidden">{index + 1}</span>
            </span>
          </>
        );
        return <li key={label} aria-current={current ? "step" : undefined}>{onSelect ? <button type="button" onClick={() => onSelect(index)} className="flex w-full flex-col gap-2 text-left">{body}</button> : <div className="flex flex-col gap-2">{body}</div>}</li>;
      })}
    </ol>
  );
}

function Tip({ title, children, tone = "white" }) {
  return (
    <div className={cx("flex flex-col gap-2 rounded-[16px] p-6", tone === "blush" ? "bg-[#fbe6ec]" : "border border-[#dcdbd5] bg-white")}>
      <h3 className="font-display text-[16px] font-semibold leading-6">{title}</h3>
      <p className="text-[14px] leading-5 text-[#4a4c55]">{children}</p>
    </div>
  );
}

function SubHeading({ children, hint }) {
  return <div className="flex flex-col gap-0.5 border-t border-[#ecebe7] pt-5 first:border-0 first:pt-0"><h2 className="font-display text-[16px] font-semibold leading-6">{children}</h2>{hint && <p className="text-[14px] leading-5 text-[#6e7079]">{hint}</p>}</div>;
}

// A small list editor: type, press Enter or Add, remove with ×. Used for service areas and amenities.
function TagInput({ id, values, onChange, placeholder, suggestions = [], max = 30, sanitize }) {
  const [text, setText] = useState("");
  const add = (raw) => {
    const value = (sanitize ? sanitize(raw) : raw).trim();
    if (value.length < 2 || values.some((item) => item.toLowerCase() === value.toLowerCase()) || values.length >= max) { setText(""); return; }
    onChange([...values, value]); setText("");
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">{values.map((value) => <Chip key={value} selected onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`}>{value}<X size={16} aria-hidden="true" /></Chip>)}</div>
      <div className="flex gap-2">
        <input id={id} value={text} onChange={(event) => setText(sanitize ? sanitize(event.target.value) : event.target.value.slice(0, 60))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(text); } }} placeholder={placeholder} className={fieldClass} />
        <Button type="secondary" size="s" onClick={() => add(text)} className="h-12 shrink-0">Add</Button>
      </div>
      {suggestions.filter((item) => !values.includes(item)).length > 0 && <div className="flex flex-wrap gap-1.5">{suggestions.filter((item) => !values.includes(item)).slice(0, 8).map((item) => <button key={item} type="button" onClick={() => add(item)} className="inline-flex h-8 items-center rounded-full border border-dashed border-[#bdbcb5] px-3 text-[13px] text-[#4a4c55] hover:border-[#002fa7] hover:text-[#002fa7]">+ {item}</button>)}</div>}
    </div>
  );
}

/**
 * Used standalone and embedded inside the owner dashboard, where the sidebar stays in place.
 * @param {{ embedded?: boolean, admin?: boolean, editId?: string, initialStep?: number, onExit?: () => void, onSaved?: () => void }} props
 */
export default function AddBusinessWizard({ embedded = false, admin = false, editId: editIdProp = "", initialStep = 0, onExit, onSaved } = {}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [adminOwners, setAdminOwners] = useState([]);
  const [adminOwnerId, setAdminOwnerId] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [ready, setReady] = useState(false);
  const [editId, setEditId] = useState("");
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initial);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("form"); // form | submitted | saved | failed
  const [sentForReview, setSentForReview] = useState(false);
  const [failure, setFailure] = useState("");
  const [uploads, setUploads] = useState([]); // [{ id, name, progress, error, url, preview }]
  const [serviceDraft, setServiceDraft] = useState(null);
  const [specialDraft, setSpecialDraft] = useState(null);
  const [offerDraft, setOfferDraft] = useState(null);
  const [faqDraft, setFaqDraft] = useState(null);
  const [serviceError, setServiceError] = useState("");
  const [specialError, setSpecialError] = useState("");
  const [offerError, setOfferError] = useState("");
  const [faqError, setFaqError] = useState("");
  const [docType, setDocType] = useState("shop_license");
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [coords, setCoords] = useState(null);
  const [pinSource, setPinSource] = useState(""); // "user" = owner placed or confirmed the pin, "address" = guessed from the address
  async function findPinFromAddress() {
    const found = await geocodeBusinessAddress({ addressLine1: data.addressLine1, locality: data.locality, city: data.city, state: data.state, postalCode: data.postalCode, country: "IN" });
    if (found && Number.isFinite(found.lat) && Number.isFinite(found.lng)) { const point = { lat: found.lat, lng: found.lng }; setCoords(point); setPinSource("address"); return point; }
    return null;
  }
  const fileInput = useRef(null);
  const docInput = useRef(null);
  const editing = Boolean(editId);
  const exit = async () => {
    // Leaving with unsaved typing asks first, so a stray click never throws the form away.
    if (dirty && (phase === "form" || phase === "failed") && !(await confirm({ title: "Leave without saving?", message: "The details you typed will be lost.", confirmLabel: "Leave", cancelLabel: "Keep editing", tone: "warning" }))) return;
    if (embedded) onExit?.(); else router.push("/business-owner");
  };

  // Must be signed in. Add mode restores a saved draft and pre-fills the email; edit mode loads the listing.
  useEffect(() => {
    let token = "";
    try { token = localStorage.getItem("directflow_access_token") || ""; } catch { /* storage unavailable */ }
    const query = new URLSearchParams(window.location.search);
    const edit = embedded ? editIdProp : query.get("edit") || "";
    if (!token && !embedded) { router.replace(`/register?next=${encodeURIComponent(`/add-business${edit ? `?edit=${edit}` : ""}`)}`); return; }
    let draft = null;
    try { if (!edit) draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { /* ignore a broken draft */ }
    (async () => {
      const [{ categories: tree = [] }, me, item] = await Promise.all([loadBusinessFormData().catch(() => ({ categories: [] })), request("/auth/me").catch(() => ({})), edit ? (admin ? loadAdminBusiness : loadOwnerBusiness)(edit).catch(() => null) : Promise.resolve(null)]);
      if (admin) loadAdminOwners().then(setAdminOwners).catch(() => setAdminOwners([]));
      setCategories(tree);
      if (edit && item) {
        setEditId(edit); setData(fromApi(item));
        setUploads([...(item.images || [])].map((url, index) => ({ id: `saved-${index}`, name: `Photo ${index + 1}`, url, preview: url, progress: 100 })));
        if (item.location?.coordinates) { setCoords({ lat: item.location.coordinates[1], lng: item.location.coordinates[0] }); setPinSource("user"); }
        const wanted = embedded ? initialStep + 1 : Number(query.get("step")); if (wanted >= 1 && wanted <= 5) setStep(wanted - 1);
      } else {
        setData((current) => ({ ...current, ...(draft?.data || {}), email: draft?.data?.email || (admin ? "" : me.user?.email) || "" }));
        if (draft?.step) setStep(Math.min(4, draft.step));
      }
      setReady(true);
    })();
  }, [router, embedded, admin, editIdProp, initialStep]);

  const update = (patch) => { setDirty(true); setData((current) => ({ ...current, ...patch })); setErrors((current) => { const keys = Object.keys(patch).filter((key) => current[key]); if (!keys.length) return current; const next = { ...current }; keys.forEach((key) => delete next[key]); return next; }); };
  const categoryOptions = useMemo(() => categories.flatMap((root) => [{ value: `${root._id}|`, label: root.name }, ...(root.children || []).map((child) => ({ value: `${root._id}|${child._id}`, label: `${root.name} › ${child.name}` }))]), [categories]);
  const secondaryOptions = categories.filter((root) => root._id !== data.category && !data.secondary.includes(root._id));
  const nameOf = (id) => categories.find((root) => root._id === id)?.name || "";
  const toggle = (key, value) => update({ [key]: data[key].includes(value) ? data[key].filter((item) => item !== value) : [...data[key], value] });

  function stepProblems(index, source = data) {
    const next = {};
    for (const key of STEP_FIELDS[index] || []) { const message = check(key, source); if (message) next[key] = message; }
    if (index === 1 && source.mode !== "visit" && source.serviceAreas.length === 0 && !source.locality.trim()) next.serviceAreas = "Add at least one area you serve.";
    if (index === 3 && uploads.some((upload) => upload.progress !== undefined && !upload.url && !upload.error)) next.photos = "Wait for photos to finish uploading.";
    return next;
  }
  const focusField = (key) => setTimeout(() => { const node = document.getElementById(`field-${key}`); node?.scrollIntoView({ block: "center", behavior: "smooth" }); node?.focus({ preventScroll: true }); }, 40);
  function validateStep(index) {
    const next = stepProblems(index);
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) focusField(first);
    return !first;
  }
  const blur = (key, tidy) => {
    const tidied = tidy ? tidy(data[key]) : data[key];
    if (tidy && tidied !== data[key]) setData((current) => ({ ...current, [key]: tidied }));
    setErrors((current) => { const message = check(key, { ...data, [key]: tidied }); const next = { ...current }; if (message) next[key] = message; else delete next[key]; return next; });
  };
  const bind = (key, { sanitize, tidy } = {}) => ({
    id: `field-${key}`, value: data[key], "aria-invalid": Boolean(errors[key]),
    onChange: (event) => update({ [key]: sanitize ? sanitize(event.target.value) : event.target.value }),
    onBlur: () => blur(key, tidy || ((value) => String(value).trim())),
  });

  async function next() {
    if (!validateStep(step)) return;
    if (step === 1 && pinSource !== "user") {
      try { const found = await findPinFromAddress(); if (found) setPinSource("address"); }
      catch { /* the listing still saves without a map pin */ }
    }
    setStep((value) => Math.min(4, value + 1)); window.scrollTo({ top: 0 });
  }
  const back = () => { setErrors({}); setStep((value) => Math.max(0, value - 1)); window.scrollTo({ top: 0 }); };
  const goTo = (index) => { if (!editing && index > step) return; setErrors({}); setStep(index); window.scrollTo({ top: 0 }); };

  function saveAndExit() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, step })); setSavedNote("Draft saved on this device. You can continue any time from Add Your Business."); }
    catch { setSavedNote("Couldn’t save the draft in this browser."); return; }
    setDirty(false); setTimeout(() => (embedded ? onExit?.() : router.push("/business-owner")), 900);
  }

  async function addPhotos(fileList) {
    const files = Array.from(fileList || []);
    const room = 20 - uploads.filter((item) => !item.error).length;
    for (const file of files.slice(0, Math.max(0, room))) {
      const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
      if (!/^image\/(jpe?g|png)$/i.test(file.type)) { setUploads((list) => [...list, { id, name: file.name, error: "Use a JPG or PNG." }]); continue; }
      if (file.size > MAX_PHOTO) { setUploads((list) => [...list, { id, name: file.name, error: `Too large (${Math.round(file.size / 1048576)} MB). Max 10 MB.` }]); continue; }
      const preview = URL.createObjectURL(file);
      setUploads((list) => [...list, { id, name: file.name, progress: 30, preview }]);
      try {
        const [url] = await uploadBusinessImages([file]);
        setUploads((list) => list.map((item) => (item.id === id ? { ...item, url, progress: 100 } : item)));
      } catch (reason) { setUploads((list) => list.map((item) => (item.id === id ? { ...item, error: reason.message || "Upload failed", progress: undefined } : item))); }
    }
  }
  const photoUrls = uploads.filter((item) => item.url).map((item) => item.url);

  async function addDocument(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    setDocError("");
    if (!/^(image\/(jpe?g|png)|application\/pdf)$/i.test(file.type)) { setDocError("Upload a JPG, PNG or PDF."); return; }
    if (file.size > 5 * 1024 * 1024) { setDocError("That file is over 5 MB."); return; }
    setDocBusy(true);
    try { const [url] = await uploadBusinessDocuments([file]); update({ kycDocuments: [...data.kycDocuments, { type: docType, url, name: file.name }] }); }
    catch (reason) { setDocError(reason.message || "Upload failed."); }
    finally { setDocBusy(false); }
  }

  function addService() {
    const message = checkService(serviceDraft, data.services);
    if (message) { setServiceError(message); return; }
    const draft = serviceDraft;
    update({ services: [...data.services, { name: draft.name.trim(), ...(draft.priceFrom ? { priceFrom: Number(draft.priceFrom) } : {}), ...(draft.priceTo ? { priceTo: Number(draft.priceTo) } : {}), ...(draft.unit?.trim() ? { unit: draft.unit.trim() } : {}) }] });
    setServiceDraft(null); setServiceError("");
  }
  function addSpecial() {
    const message = checkSpecialHours(specialDraft, data.special);
    if (message) { setSpecialError(message); return; }
    update({ special: [...data.special, { label: specialDraft.label.trim(), date: specialDraft.date, ...(specialDraft.isClosed === false ? { isClosed: false, opens: specialDraft.opens, closes: specialDraft.closes } : { isClosed: true }) }] }); setSpecialDraft(null); setSpecialError("");
  }
  function addOffer() {
    const message = checkOffer(offerDraft, data.offers);
    if (message) { setOfferError(message); return; }
    update({ offers: [...data.offers, { title: offerDraft.title.trim(), description: (offerDraft.description || "").trim(), code: (offerDraft.code || "").toUpperCase(), occasion: (offerDraft.occasion || "").trim(), validUntil: offerDraft.validUntil }] }); setOfferDraft(null); setOfferError("");
  }
  function addFaq() {
    const message = checkFaq(faqDraft, data.faqs);
    if (message) { setFaqError(message); return; }
    update({ faqs: [...data.faqs, { question: faqDraft.question.trim(), answer: faqDraft.answer.trim() }] }); setFaqDraft(null); setFaqError("");
  }

  const draftBusiness = useMemo(() => ({
    name: data.name || "Your business name", category: nameOf(data.category) || "Category", address: { city: data.city, locality: data.locality },
    tagline: data.tagline || data.description, image: uploads.find((item) => item.url || item.preview)?.preview || photoUrls[0] || "", verified: false, workingHours: DAYS.map((day) => ({ day, isClosed: !data.hours[day].open, opens: data.hours[day].opens, closes: data.hours[day].closes })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, uploads, categories]);

  async function submit() {
    // Check every step again, so nothing wrong can slip through from an earlier page.
    for (let index = 0; index < 4; index += 1) {
      const problems = stepProblems(index);
      if (Object.keys(problems).length) { setStep(index); setErrors(problems); focusField(Object.keys(problems)[0]); setFailure(`Please fix the highlighted field on step ${index + 1} first.`); setPhase("failed"); return; }
    }
    setBusy(true); setFailure("");
    try {
      const social = { facebook: data.facebook, instagram: data.instagram, youtube: data.youtube };
      const payload = {
        name: data.name.trim(), category: data.category, subcategories: data.subcategory ? [data.subcategory] : [], secondaryCategories: data.secondary,
        tagline: data.tagline.trim(), description: data.description.trim(), ...(data.businessType ? { businessType: data.businessType } : {}), ...(data.establishedYear ? { establishedYear: Number(data.establishedYear) } : {}),
        serviceMode: data.mode, serviceAreas: data.mode === "visit" ? [] : data.serviceAreas,
        address: { addressLine1: data.addressLine1.trim(), ...(data.locality ? { locality: data.locality.trim() } : {}), city: data.city.trim(), state: data.state.trim(), postalCode: data.postalCode, ...(data.landmark ? { landmark: data.landmark.trim() } : {}), country: "IN" },
        ...(coords ? { location: { type: "Point", coordinates: [coords.lng, coords.lat] }, locationApproximate: pinSource !== "user" } : {}),
        services: data.services.map((service) => service.name), serviceItems: data.services,
        workingHours: DAYS.map((day) => ({ day, isClosed: !data.hours[day].open, ...(data.hours[day].open ? { opens: data.hours[day].opens, closes: data.hours[day].closes } : {}) })),
        specialHours: data.special, paymentModes: data.paymentModes, languages: data.languages, ...(data.priceRange ? { priceRange: data.priceRange } : {}), amenities: data.amenities, homeDelivery: data.homeDelivery,
        offers: data.offers.map((offer) => ({ title: offer.title, ...(offer.description ? { description: offer.description } : {}), ...(offer.code ? { code: offer.code } : {}), ...(offer.occasion ? { occasion: offer.occasion } : {}), validUntil: new Date(`${offer.validUntil}T23:59:59`).toISOString(), isActive: true })),
        phone: data.phone, alternatePhone: data.alternatePhone, whatsapp: data.whatsapp, email: data.email.trim(), website: data.website.trim(), socialLinks: social,
        ...(data.gstNumber ? { gstNumber: data.gstNumber.toUpperCase() } : { gstNumber: "" }), kycDocuments: data.kycDocuments.map(({ type, url }) => ({ type, url })),
        faqs: data.faqs, ...(photoUrls.length ? { images: photoUrls, logo: photoUrls[0] } : { images: [] }),
      };
      if (admin) {
        if (editing) await updateAdminBusiness(editId, payload);
        else await createAdminBusiness({ ...payload, ...(adminOwnerId ? { ownerId: adminOwnerId } : {}), publish: publishNow });
      } else if (editing) { const saved = await updateOwnerBusiness(editId, payload); setSentForReview(saved?.status === "Pending"); } else await createOwnerBusiness(payload); // new listings go straight into review
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* nothing to clear */ }
      setPhase(editing ? "saved" : "submitted");
      onSaved?.();
    } catch (reason) { setFailure(reason.message || "We couldn’t submit your listing."); setPhase("failed"); }
    finally { setBusy(false); }
  }

  if (!ready) return <main className="grid min-h-screen place-items-center bg-[#f1f1ee]"><p className="text-[16px] text-[#4a4c55]">Loading…</p></main>;

  const inputErr = (key) => cx(fieldClass, errors[key] && "!border-2 !border-[#b42318]");
  const shell = (children) => embedded ? (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col px-4 pb-16 pt-6 text-[#101115] md:px-8 lg:pt-8">
      <div className="flex items-center justify-between gap-3">
        <p className="font-eyebrow text-[#002fa7]">{editing ? "Edit listing" : "Add a business"}</p>
        {phase === "form" || phase === "failed" ? <Button type="ghost" size="s" onClick={exit}>{editing ? "Close" : "Cancel"}</Button> : null}
      </div>
      {children}
    </div>
  ) : (
    <main className="min-h-screen bg-[#f1f1ee] text-[#101115]">
      <header className="flex h-[72px] items-center justify-between border-b border-[#dcdbd5] px-4 md:px-12">
        <Link href="/" aria-label="Lokal Lens home"><Logo /></Link>
        <p className="hidden font-display text-[14px] font-medium text-[#4a4c55] sm:block">{editing ? "Edit your listing" : "Add your business"}</p>
        {phase === "form" || phase === "failed" ? (editing ? <Button type="ghost" size="s" href="/business-owner">Close</Button> : <Button type="ghost" size="s" onClick={saveAndExit}>Save &amp; exit</Button>) : <span className="w-[110px]" />}
      </header>
      {children}
    </main>
  );

  if (phase === "submitted" || phase === "saved") return shell(
    <section className="mx-auto flex max-w-[640px] flex-col items-center gap-4 px-4 py-20 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#e7f4e5] text-[#2b7a26]"><CheckCircle2 size={32} aria-hidden="true" /></span>
      <p className="font-eyebrow text-[#002fa7]">{phase === "saved" ? "Saved" : "Submitted"}</p>
      <h1 className="text-[34px] font-semibold leading-[42px] tracking-[-0.0294em]">{phase === "saved" ? (admin ? "Changes saved" : "Your changes are saved") : admin ? (publishNow ? "Listing published" : "Draft saved") : "Thanks — we’re reviewing your listing"}</h1>
      <p className="text-[16px] leading-6 text-[#4a4c55]">{admin ? (phase === "saved" ? "The listing now shows the new details." : publishNow ? "The listing is live in the directory." : "It is saved as a draft and not visible to customers.") : phase === "saved" ? "Your listing now shows the new details. Major changes may be checked by our team again." : <>Our team reviews new listings before they go live. You’ll get an email at <strong className="text-[#101115]">{data.email}</strong> once it’s approved. You can keep editing it from your dashboard.</>}</p>
      {phase === "saved" && !admin && sentForReview && <p role="status" className="max-w-[520px] rounded-[12px] bg-[#fbf0d9] px-4 py-3 text-[15px] leading-6 text-[#5c3d00]">You changed the name, phone, category or city, so our team will check the listing again. It stays hidden from customers until it is approved. Other edits go live straight away.</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-3">{embedded ? <Button type="primary" onClick={exit}>{admin ? "Back to businesses" : "Back to overview"}</Button> : <><Button type="primary" href="/business-owner">Go to dashboard</Button><Button type="secondary" href="/">Back to home</Button></>}</div>
    </section>,
  );

  const aside = (
    <aside className="flex flex-col gap-4">
      {(step === 0 || step === 4) && (
        <div className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-4">
          <div className="flex items-center justify-between"><p className="font-display text-[15px] font-semibold">Card preview</p><span className="font-eyebrow text-[10px] text-[#6e7079]">Live</span></div>
          <BusinessCard business={draftBusiness} layout="grid" className="!h-auto" />
          <p className="text-[13px] leading-[18px] text-[#6e7079]">{step === 0 ? "This is roughly how customers see you in search results. It updates as you type." : "How your listing will look in search results."}</p>
        </div>
      )}
      {step === 0 && !editing && <Tip title="What happens after you submit?" tone="blush">Our team reviews new listings before they go live. Verification is a separate step you can complete later from your dashboard.</Tip>}
      {step === 1 && <><Tip title="Your address is public">It’s shown on your profile so customers can find and visit you. If you work from home, choose “I travel to customers” and list the areas you serve.</Tip><Tip title="Service area example" tone="blush">For a service-area business, add localities like “Indiranagar, HSR Layout”.</Tip></>}
      {step === 2 && <><Tip title="No booking or checkout" tone="blush">Lokal Lens shows your services so customers know what to ask for. They contact you directly — we don’t handle bookings or payments.</Tip><Tip title="Offers get seen">Active offers appear on your profile and on the Offers page for people nearby.</Tip></>}
      {step === 3 && <><Tip title="Only what you answer" tone="blush">Each contact method becomes a button on your profile. Leave optional fields empty and that button simply won’t appear. Your email is never shown publicly.</Tip><Tip title="Why verify?">Verified businesses get a green badge and rank above unverified ones. Add your GST number or upload a document to start.</Tip></>}
    </aside>
  );

  const title = ["Tell us about your business", "Where do customers find you?", "Services and opening hours", "Photos and contact details", editing ? "Review and save" : "Preview and submit"][step];
  const subtitle = ["This is how your business will appear in search results.", "Choose whether people visit you, you visit them, or both.", "List what you offer. Prices are optional — leave them out and we’ll show “Contact for pricing”.", "Clear photos of your storefront and work help people choose you. Add the ways customers can reach you.", editing ? "Check everything once more, then save." : "Check everything once more. You can edit your listing any time after it goes live."][step];
  const mapQuery = [data.addressLine1, data.locality, data.city, data.state, data.postalCode].filter(Boolean).join(", ");

  return shell(
    <>
      <Stepper step={step} onSelect={editing ? goTo : undefined} embedded={embedded} />
      <div className={cx("mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-12 pt-2", embedded ? "pb-12 xl:grid-cols-[minmax(0,1fr)_320px]" : "px-4 pb-20 md:px-8 lg:grid-cols-[minmax(0,760px)_minmax(0,1fr)] lg:px-[72px]")}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Step {step + 1} of 5</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">{title}</h1><p className="text-[16px] leading-6 text-[#4a4c55]">{subtitle}</p></div>
          {savedNote && <p role="status" className="rounded-[10px] bg-[#e7f4e5] px-3.5 py-3 text-[14px] text-[#2b7a26]">{savedNote}</p>}
          {phase === "failed" && <p role="alert" className="flex items-start gap-2.5 rounded-[10px] bg-[#fce9e7] px-3.5 py-3 text-[14px] leading-5 text-[#b42318]"><AlertCircle size={18} className="mt-px shrink-0" aria-hidden="true" /><span><strong>{editing ? "Couldn’t save." : "Submission failed."}</strong> {failure} Your answers are still here.</span></p>}

          <div className="flex flex-col gap-5 rounded-[20px] border border-[#dcdbd5] bg-white p-5 sm:p-8">
            {step < 4 && <p className="text-[14px] leading-5 text-[#6e7079]"><span className="text-[#b42318]" aria-hidden="true">*</span> Required. Fields without a star are optional.</p>}

            {step === 0 && <>
              <Field label="Business name" required error={errors.name}><input {...bind("name", { sanitize: (v) => clean.text(v, 100) })} maxLength={100} autoComplete="organization" placeholder="e.g. Nimbu Bakehouse" className={inputErr("name")} /></Field>
              <Field label="Primary category" required error={errors.category}>
                <select id="field-category" aria-invalid={Boolean(errors.category)} onBlur={() => blur("category")} value={`${data.category}|${data.subcategory}`} onChange={(event) => { const [category, subcategory] = event.target.value.split("|"); update({ category, subcategory, secondary: data.secondary.filter((id) => id !== category) }); }} className={inputErr("category")}>
                  <option value="|">Choose a category</option>
                  {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Also listed under <span className="font-normal text-[#6e7079]">(optional)</span></span>
                <div className="flex flex-wrap gap-2">
                  {data.secondary.map((id) => <Chip key={id} selected onClick={() => update({ secondary: data.secondary.filter((item) => item !== id) })} aria-label={`Remove ${nameOf(id)}`}>{nameOf(id)}<X size={16} aria-hidden="true" /></Chip>)}
                  {data.secondary.length < 9 && secondaryOptions.length > 0 && (
                    <select aria-label="Add category" value="" onChange={(event) => event.target.value && update({ secondary: [...data.secondary, event.target.value] })} className="h-10 rounded-full border border-[#dcdbd5] bg-white px-3.5 font-display text-[14px] font-medium outline-none hover:border-[#101115]"><option value="">+ Add category</option>{secondaryOptions.map((root) => <option key={root._id} value={root._id}>{root.name}</option>)}</select>
                  )}
                </div>
              </div>
              <Field label="Tagline" optional error={errors.tagline} helper="One line that sums you up, like “Fresh sourdough baked every morning”."><input {...bind("tagline", { sanitize: (v) => clean.text(v, 160) })} maxLength={160} placeholder="Shown under your business name" className={inputErr("tagline")} /></Field>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass} htmlFor="field-description">Short description<span className="ml-0.5 text-[#b42318]" aria-hidden="true">*</span></label>
                <textarea {...bind("description", { sanitize: (v) => String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, 300) })} maxLength={300} rows={4} placeholder="What you do, what you’re known for." className={cx("w-full rounded-[10px] border border-[#bdbcb5] px-3.5 py-3 text-[16px] leading-6 outline-none hover:border-[#101115] focus:border-2 focus:border-[#002fa7] focus:px-[13px]", errors.description && "!border-2 !border-[#b42318]")} />
                <div className="flex justify-between gap-3 text-[14px] leading-5 text-[#6e7079]"><span role={errors.description ? "alert" : undefined} className={errors.description ? "text-[#b42318]" : ""}>{errors.description || "Shown on your card and profile. Avoid prices and phone numbers here."}</span><span className="font-meta shrink-0">{data.description.length} / 300</span></div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Business type" optional><select id="field-businessType" value={data.businessType} onChange={(event) => update({ businessType: event.target.value })} className={fieldClass}><option value="">Select type</option>{BUSINESS_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                <Field label="Established in" optional error={errors.establishedYear}><select id="field-establishedYear" value={data.establishedYear} onChange={(event) => update({ establishedYear: event.target.value })} className={inputErr("establishedYear")}><option value="">Select year</option>{YEARS.map((year) => <option key={year} value={year}>{year}</option>)}</select></Field>
              </div>
            </>}

            {step === 1 && <>
              <fieldset className="flex flex-col"><legend className={cx(labelClass, "mb-1")}>How do you serve customers?</legend>
                {[["visit", "Customers visit my location"], ["travel", "I travel to customers (service area)"], ["both", "Both"]].map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 text-[16px]"><input type="radio" name="mode" checked={data.mode === value} onChange={() => update({ mode: value })} className="h-[18px] w-[18px] accent-[#002fa7]" />{label}</label>)}
              </fieldset>
              <Field label="Building, street" required error={errors.addressLine1}><input {...bind("addressLine1", { sanitize: (v) => clean.text(v, 200) })} maxLength={200} autoComplete="address-line1" placeholder="e.g. 12, 12th Main Road" className={inputErr("addressLine1")} /></Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Area / locality" optional error={errors.locality}><input {...bind("locality", { sanitize: clean.place })} maxLength={80} autoComplete="address-level3" placeholder="e.g. Indiranagar" className={inputErr("locality")} /></Field>
                <Field label="City" required error={errors.city}><input {...bind("city", { sanitize: clean.place })} maxLength={80} autoComplete="address-level2" placeholder="e.g. Bengaluru" className={inputErr("city")} /></Field>
                <Field label="State" required error={errors.state}><select id="field-state" aria-invalid={Boolean(errors.state)} value={data.state} onChange={(event) => update({ state: event.target.value })} onBlur={() => blur("state")} autoComplete="address-level1" className={inputErr("state")}><option value="">Choose your state</option>{INDIAN_STATES.map((name) => <option key={name} value={name}>{name}</option>)}</select></Field>
                <Field label="PIN code" required error={errors.postalCode}><input {...bind("postalCode", { sanitize: (v) => clean.digits(v, 6) })} inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder="560038" className={inputErr("postalCode")} /></Field>
                <Field label="Landmark" optional className="sm:col-span-2" error={errors.landmark}><input {...bind("landmark", { sanitize: (v) => clean.text(v, 150) })} maxLength={150} placeholder="e.g. Near Indiranagar Metro" className={inputErr("landmark")} /></Field>
              </div>
              {data.mode !== "visit" && (
                <div className="flex flex-col gap-2">
                  <span className={labelClass}>Areas you serve<span className="ml-0.5 text-[#b42318]" aria-hidden="true">*</span></span>
                  <TagInput id="field-serviceAreas" values={data.serviceAreas} onChange={(serviceAreas) => update({ serviceAreas })} placeholder="e.g. Indiranagar, then press Enter" sanitize={clean.place} max={30} />
                  {errors.serviceAreas && <p role="alert" className="text-[14px] text-[#b42318]">{errors.serviceAreas}</p>}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Exact location on map</span>
                <PinPicker value={coords} source={pinSource} canFind={Boolean(mapQuery)} onFindFromAddress={findPinFromAddress} onChange={(point, source) => { setCoords(point); setPinSource(source); }} />
              </div>
            </>}

            {step === 2 && <>
              <div className="flex flex-col gap-3">
                <h2 id="field-services" tabIndex={-1} className="font-display text-[16px] font-semibold leading-6 outline-none">Services or products<span className="ml-0.5 text-[#b42318]" aria-hidden="true">*</span></h2>
                {data.services.map((service, index) => (
                  <div key={`${service.name}-${index}`} className="flex items-center gap-3 rounded-[12px] border border-[#dcdbd5] bg-white p-3 pr-2 transition-colors hover:border-[#bdbcb5]">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#eef2fb] font-display text-[16px] font-semibold text-[#002fa7]" aria-hidden="true">{String(service.name).trim().charAt(0).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] font-semibold leading-5 text-[#101115]">{service.name}</span>
                      <span className={cx("block text-[13px] leading-[18px]", service.priceFrom ? "text-[#4a4c55]" : "text-[#6e7079]")}>{priceText(service)}</span>
                    </span>
                    <button type="button" aria-label={`Remove ${service.name}`} onClick={() => update({ services: data.services.filter((_, i) => i !== index) })} className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-[#6e7079] hover:bg-[#fdecea] hover:text-[#b42318]"><Trash2 size={18} /></button>
                  </div>
                ))}
                {serviceDraft ? (
                  <div className="grid gap-3 rounded-[12px] border border-[#002fa7] bg-[#f7f9fd] p-4 sm:grid-cols-2">
                    <Field label="Name" required className="sm:col-span-2"><input autoFocus value={serviceDraft.name} onChange={(event) => { setServiceDraft({ ...serviceDraft, name: clean.text(event.target.value, 150) }); setServiceError(""); }} maxLength={150} placeholder="e.g. Sourdough loaves" className={fieldClass} /></Field>
                    <Field label="Price from (₹)" optional><input inputMode="numeric" value={serviceDraft.priceFrom ?? ""} onChange={(event) => { setServiceDraft({ ...serviceDraft, priceFrom: clean.digits(event.target.value, 8) }); setServiceError(""); }} placeholder="e.g. 260" className={fieldClass} /></Field>
                    <Field label="Up to (₹)" optional><input inputMode="numeric" value={serviceDraft.priceTo ?? ""} onChange={(event) => { setServiceDraft({ ...serviceDraft, priceTo: clean.digits(event.target.value, 8) }); setServiceError(""); }} placeholder="e.g. 400" className={fieldClass} /></Field>
                    <Field label="Per" optional className="sm:col-span-2"><input value={serviceDraft.unit ?? ""} onChange={(event) => setServiceDraft({ ...serviceDraft, unit: clean.place(event.target.value).slice(0, 30) })} maxLength={30} placeholder="e.g. kg, hour, visit" className={fieldClass} /></Field>
                    {serviceError && <p role="alert" className="text-[14px] leading-5 text-[#b42318] sm:col-span-2">{serviceError}</p>}
                    <div className="flex gap-3 sm:col-span-2"><Button type="primary" size="s" onClick={addService}>Add service</Button><Button type="ghost" size="s" onClick={() => { setServiceDraft(null); setServiceError(""); }}>Cancel</Button></div>
                  </div>
                ) : <div><Button type="secondary" size="s" onClick={() => setServiceDraft({ name: "", priceFrom: "", priceTo: "", unit: "" })} icon={<Plus size={18} aria-hidden="true" />}>Add a service</Button></div>}
                {errors.services && <p role="alert" className="text-[14px] text-[#b42318]">{errors.services}</p>}
              </div>

              <div className="flex flex-col gap-1 border-t border-[#ecebe7] pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="field-hours" tabIndex={-1} className="font-display text-[16px] font-semibold leading-6 outline-none">Opening hours<span className="ml-0.5 text-[#b42318]" aria-hidden="true">*</span></h2><button type="button" onClick={() => { const first = data.hours[DAYS[0]]; update({ hours: Object.fromEntries(DAYS.map((d) => [d, data.hours[d].open ? { ...data.hours[d], opens: first.opens, closes: first.closes } : data.hours[d]])) }); }} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-2.5 text-[14px] font-medium text-[#002fa7] hover:bg-[#eef2fb]"><Copy size={15} aria-hidden="true" />Copy Monday’s hours to all open days</button></div>
                {errors.hours && <p role="alert" className="text-[14px] leading-5 text-[#b42318]">{errors.hours}</p>}
                {DAYS.map((day) => {
                  const entry = data.hours[day];
                  const set = (patch) => update({ hours: { ...data.hours, [day]: { ...entry, ...patch } } });
                  const wrongOrder = entry.open && entry.opens >= entry.closes;
                  return (
                    <div key={day} className="flex min-h-[52px] flex-wrap items-center gap-3">
                      <button type="button" role="switch" aria-checked={entry.open} aria-label={`${day} open`} onClick={() => set({ open: !entry.open })} className={cx("flex h-[26px] w-11 shrink-0 items-center rounded-full p-[3px] transition-colors", entry.open ? "justify-end bg-[#002fa7]" : "justify-start bg-[#bdbcb5]")}><span className="h-5 w-5 rounded-full bg-white" /></button>
                      <span className="w-24 text-[16px] capitalize">{day}</span>
                      {entry.open ? (
                        <span className="flex items-center gap-2">
                          <TimeSelect label={`${day} opens`} value={entry.opens} invalid={wrongOrder} onChange={(opens) => set({ opens })} />
                          <span className="text-[14px] text-[#6e7079]">to</span>
                          <TimeSelect label={`${day} closes`} value={entry.closes} invalid={wrongOrder} onChange={(closes) => set({ closes })} />
                          </span>
                      ) : <span className="text-[16px] text-[#6e7079]">Closed</span>}
                      {wrongOrder && <p role="alert" className="basis-full text-[13px] leading-[18px] text-[#b42318] sm:pl-[164px]">Closing time must be after the opening time.</p>}
                    </div>
                  );
                })}
                {data.special.map((item, index) => <div key={`${item.label}-${index}`} className="flex items-center gap-3 text-[14px]"><span className="font-medium">{item.label}</span><span className="text-[#6e7079]">{item.date} · {item.isClosed ? "Closed" : `${timeText(item.opens)} – ${timeText(item.closes)}`}</span><button type="button" aria-label="Remove" onClick={() => update({ special: data.special.filter((_, i) => i !== index) })} className="text-[#6e7079] hover:text-[#b42318]"><X size={16} /></button></div>)}
                {specialDraft ? (
                  <div className="mt-2 flex flex-col gap-3 rounded-[12px] border border-[#dcdbd5] p-3">
                    <div className="flex flex-wrap items-end gap-3">
                      <Field label="Occasion" required><input value={specialDraft.label} onChange={(event) => { setSpecialDraft({ ...specialDraft, label: clean.text(event.target.value, 60) }); setSpecialError(""); }} maxLength={60} placeholder="e.g. Diwali" className={cx(fieldClass, "w-44")} /></Field>
                      <Field label="Date" required><input type="date" min={new Date().toISOString().slice(0, 10)} value={specialDraft.date} onChange={(event) => { setSpecialDraft({ ...specialDraft, date: event.target.value }); setSpecialError(""); }} className={cx(fieldClass, "w-44")} /></Field>
                    </div>
                    <div role="radiogroup" aria-label="What happens on this day" className="flex flex-wrap gap-2">
                      {[[true, "Closed all day"], [false, "Open with special hours"]].map(([closed, text]) => (
                        <button key={text} type="button" role="radio" aria-checked={specialDraft.isClosed === closed} onClick={() => { setSpecialDraft({ ...specialDraft, isClosed: closed }); setSpecialError(""); }} className={cx("h-10 rounded-[10px] border px-4 font-display text-[14px] font-medium transition-colors", specialDraft.isClosed === closed ? "border-2 border-[#002fa7] bg-[#f3f6fd] text-[#002fa7]" : "border-[#bdbcb5] bg-white hover:border-[#101115]")}>{text}</button>
                      ))}
                    </div>
                    {specialDraft.isClosed === false && (
                      <div className="flex flex-wrap items-center gap-2">
                        <TimeSelect label="Special day opens" value={specialDraft.opens} invalid={String(specialDraft.opens) >= String(specialDraft.closes)} onChange={(opens) => { setSpecialDraft({ ...specialDraft, opens }); setSpecialError(""); }} />
                        <span className="text-[14px] text-[#6e7079]">to</span>
                        <TimeSelect label="Special day closes" value={specialDraft.closes} invalid={String(specialDraft.opens) >= String(specialDraft.closes)} onChange={(closes) => { setSpecialDraft({ ...specialDraft, closes }); setSpecialError(""); }} />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="primary" size="s" onClick={addSpecial}>{specialDraft.isClosed === false ? "Add special hours" : "Add closure"}</Button>
                      <Button type="ghost" size="s" onClick={() => { setSpecialDraft(null); setSpecialError(""); }}>Cancel</Button>
                    </div>
                    {specialError && <p role="alert" className="text-[14px] leading-5 text-[#b42318]">{specialError}</p>}
                  </div>
                ) : <div className="mt-1"><Button type="ghost" size="s" onClick={() => setSpecialDraft({ label: "", date: "", isClosed: true, opens: "10:00", closes: "14:00" })} icon={<Plus size={18} aria-hidden="true" />}>Add special hours (holidays, festivals)</Button></div>}
              </div>

              <div className="flex flex-col gap-3 border-t border-[#ecebe7] pt-5">
                <SubHeading hint="Festival and seasonal offers show on your profile and on the Offers page.">Offers <span className="font-normal text-[#6e7079]">(optional)</span></SubHeading>
                {data.offers.map((offer, index) => (
                  <div key={`${offer.title}-${index}`} className="flex items-start gap-3 rounded-[12px] border border-[#dcdbd5] px-4 py-3">
                    <div className="min-w-0 flex-1"><p className="font-semibold">{offer.title}</p><p className="text-[13px] leading-[18px] text-[#6e7079]">{[offer.occasion, `Valid till ${offer.validUntil}`, offer.code && `Code ${offer.code}`].filter(Boolean).join(" · ")}</p></div>
                    <button type="button" aria-label={`Remove ${offer.title}`} onClick={() => update({ offers: data.offers.filter((_, i) => i !== index) })} className="text-[#6e7079] hover:text-[#b42318]"><Trash2 size={18} /></button>
                  </div>
                ))}
                {offerDraft ? (
                  <div className="grid gap-3 rounded-[12px] border border-[#002fa7] bg-[#f7f9fd] p-4 sm:grid-cols-2">
                    <Field label="Offer title" required className="sm:col-span-2"><input autoFocus value={offerDraft.title} onChange={(event) => { setOfferDraft({ ...offerDraft, title: clean.text(event.target.value, 80) }); setOfferError(""); }} maxLength={80} placeholder="e.g. 20% off Diwali party packages" className={fieldClass} /></Field>
                    <Field label="Occasion" optional><input value={offerDraft.occasion ?? ""} onChange={(event) => setOfferDraft({ ...offerDraft, occasion: clean.place(event.target.value).slice(0, 30) })} maxLength={30} placeholder="e.g. Diwali" className={fieldClass} /></Field>
                    <Field label="Valid until" required><input type="date" min={new Date().toISOString().slice(0, 10)} value={offerDraft.validUntil ?? ""} onChange={(event) => { setOfferDraft({ ...offerDraft, validUntil: event.target.value }); setOfferError(""); }} className={fieldClass} /></Field>
                    <Field label="Coupon code" optional><input value={offerDraft.code ?? ""} onChange={(event) => { setOfferDraft({ ...offerDraft, code: event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20) }); setOfferError(""); }} maxLength={20} placeholder="e.g. DIWALI20" className={fieldClass} /></Field>
                    <Field label="Details" optional className="sm:col-span-2"><input value={offerDraft.description ?? ""} onChange={(event) => setOfferDraft({ ...offerDraft, description: clean.text(event.target.value, 200) })} maxLength={200} placeholder="Conditions, who it’s for…" className={fieldClass} /></Field>
                    {offerError && <p role="alert" className="text-[14px] leading-5 text-[#b42318] sm:col-span-2">{offerError}</p>}
                    <div className="flex gap-3 sm:col-span-2"><Button type="primary" size="s" onClick={addOffer}>Add offer</Button><Button type="ghost" size="s" onClick={() => { setOfferDraft(null); setOfferError(""); }}>Cancel</Button></div>
                  </div>
                ) : <div><Button type="secondary" size="s" onClick={() => setOfferDraft({ title: "", occasion: "", validUntil: "", code: "", description: "" })} icon={<Plus size={18} aria-hidden="true" />}>Add an offer</Button></div>}
              </div>

              <div className="flex flex-col gap-4 border-t border-[#ecebe7] pt-5">
                <SubHeading hint="Helps customers decide before they call.">Payments, languages and facilities <span className="font-normal text-[#6e7079]">(optional)</span></SubHeading>
                <div className="flex flex-col gap-2"><span className={labelClass}>Payment modes you accept</span><div className="flex flex-wrap gap-2">{PAYMENT_MODES.map(([value, label]) => <Chip key={value} selected={data.paymentModes.includes(value)} onClick={() => toggle("paymentModes", value)}>{label}</Chip>)}</div></div>
                <div className="flex flex-col gap-2"><span className={labelClass}>Languages spoken</span><div className="flex flex-wrap gap-2">{LANGUAGES.map((value) => <Chip key={value} selected={data.languages.includes(value)} onClick={() => toggle("languages", value)}>{value}</Chip>)}</div></div>
                <div className="flex flex-col gap-2"><span className={labelClass}>Price level <span className="font-normal text-[#6e7079]">(optional)</span></span><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Price level">{PRICE_RANGES.map(([value, label]) => <Chip key={value} selected={data.priceRange === value} onClick={() => update({ priceRange: data.priceRange === value ? "" : value })}>{label.replace(/^₹+\s*/, "")}</Chip>)}</div><p className="text-[14px] leading-5 text-[#6e7079]">Tap again to clear. Shown on your profile so customers know what to expect.</p></div>
                <div className="flex flex-col gap-2"><span className={labelClass}>Facilities and features</span><TagInput id="field-amenities" values={data.amenities} onChange={(amenities) => update({ amenities })} placeholder="e.g. Free Wi-Fi, then press Enter" suggestions={AMENITY_SUGGESTIONS} max={30} sanitize={(v) => clean.text(v, 60)} /></div>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[16px]"><input type="checkbox" checked={data.homeDelivery} onChange={(event) => update({ homeDelivery: event.target.checked })} className="h-[18px] w-[18px] accent-[#002fa7]" />Home delivery or home service available</label>
              </div>
            </>}

            {step === 3 && <>
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); addPhotos(event.dataTransfer.files); }}
                className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-[#bdbcb5] bg-[#f7f7f4] p-8 text-center"
              >
                <ImagePlus size={28} className="text-[#6e7079]" aria-hidden="true" />
                <p className="font-display text-[16px] font-semibold">Drag photos here or browse</p>
                <p className="text-[14px] leading-5 text-[#6e7079]">JPG or PNG · up to 10 MB each · up to 20 photos. The first photo is your cover.</p>
                <input ref={fileInput} type="file" accept="image/jpeg,image/png" multiple hidden onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} />
                <Button type="secondary" size="s" onClick={() => fileInput.current?.click()}>Choose photos</Button>
              </div>
              {errors.photos && <p role="alert" className="text-[14px] text-[#b42318]">{errors.photos}</p>}
              {uploads.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {uploads.map((upload, index) => (
                    <div key={upload.id} className="flex w-40 flex-col gap-1.5">
                      {upload.error ? <p className="text-[14px] leading-5 text-[#b42318]">{upload.name}: {upload.error}</p> : (
                        <>
                          <div className="relative h-[126px] overflow-hidden rounded-[12px] bg-[#e4e3de]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {upload.preview && <img src={upload.preview} alt="" className="h-full w-full object-cover" />}
                            {upload.progress !== undefined && !upload.url && <span className="absolute inset-x-0 bottom-0 h-1.5 bg-[#002fa7]/30"><span className="block h-full w-1/2 animate-pulse bg-[#002fa7]" /></span>}
                            <button type="button" aria-label="Remove photo" onClick={() => setUploads((list) => list.filter((item) => item.id !== upload.id))} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95"><X size={14} /></button>
                          </div>
                          <p className="text-[14px] leading-5 text-[#4a4c55]">{index === 0 ? "Cover photo" : upload.url ? "Uploaded" : "Uploading…"}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <SubHeading>Contact details</SubHeading>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Phone" required error={errors.phone} helper="Customers will see this as a Call button."><IconInput icon={<Phone size={18} aria-hidden="true" />} prefix="+91"><input {...bind("phone", { sanitize: clean.phone })} type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder="10-digit mobile number" className={cx(inputErr("phone"), "!pl-[78px] focus:!pl-[77px]")} /></IconInput></Field>
                <Field label="Alternate phone" optional error={errors.alternatePhone}><IconInput icon={<Phone size={18} aria-hidden="true" />} prefix="+91"><input {...bind("alternatePhone", { sanitize: clean.phone })} type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit number" className={cx(inputErr("alternatePhone"), "!pl-[78px] focus:!pl-[77px]")} /></IconInput></Field>
                <div className="flex flex-col gap-1.5">
                  <Field label="WhatsApp" optional error={errors.whatsapp}><IconInput icon={<MessageCircle size={18} aria-hidden="true" />} prefix="+91" tone="text-[#1f9d55]"><input {...bind("whatsapp", { sanitize: clean.phone })} type="tel" inputMode="numeric" maxLength={10} placeholder="WhatsApp number" className={cx(inputErr("whatsapp"), "!pl-[78px] focus:!pl-[77px]")} /></IconInput></Field>
                  {data.phone.length === 10 && !data.whatsapp && <button type="button" onClick={() => update({ whatsapp: data.phone })} className="self-start text-[14px] font-medium text-[#002fa7] hover:underline">Same as phone ({data.phone})</button>}
                </div>
                <Field label="Email" required error={errors.email} helper="Not shown publicly. Used to contact you about your listing."><IconInput icon={<Mail size={18} aria-hidden="true" />}><input {...bind("email", { sanitize: (v) => String(v).replace(/\s/g, "").slice(0, 254), tidy: (v) => String(v).trim().toLowerCase() })} type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" className={cx(inputErr("email"), "!pl-11 focus:!pl-[43px]")} /></IconInput></Field>
                <Field label="Website" optional error={errors.website} className="sm:col-span-2"><IconInput icon={<Globe size={18} aria-hidden="true" />}><input {...bind("website", { sanitize: (v) => String(v).replace(/\s/g, "").slice(0, 200), tidy: clean.website })} type="url" inputMode="url" autoComplete="url" placeholder="https://example.com" className={cx(inputErr("website"), "!pl-11 focus:!pl-[43px]")} /></IconInput></Field>
              </div>

              <SubHeading hint="Paste the link to your page. Each one becomes a button on your profile.">Social links <span className="font-normal text-[#6e7079]">(optional)</span></SubHeading>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Instagram" optional error={errors.instagram}><IconInput icon={<InstagramIcon />} tone="text-[#c13584]"><input {...bind("instagram", { sanitize: (v) => String(v).replace(/\s/g, "").slice(0, 200), tidy: clean.website })} inputMode="url" placeholder="instagram.com/yourpage" className={cx(inputErr("instagram"), "!pl-11 focus:!pl-[43px]")} /></IconInput></Field>
                <Field label="Facebook" optional error={errors.facebook}><IconInput icon={<FacebookIcon />} tone="text-[#1877f2]"><input {...bind("facebook", { sanitize: (v) => String(v).replace(/\s/g, "").slice(0, 200), tidy: clean.website })} inputMode="url" placeholder="facebook.com/yourpage" className={cx(inputErr("facebook"), "!pl-11 focus:!pl-[43px]")} /></IconInput></Field>
                <Field label="YouTube" optional error={errors.youtube} className="sm:col-span-2"><IconInput icon={<YoutubeIcon />} tone="text-[#e02b20]"><input {...bind("youtube", { sanitize: (v) => String(v).replace(/\s/g, "").slice(0, 200), tidy: clean.website })} inputMode="url" placeholder="youtube.com/@yourchannel" className={cx(inputErr("youtube"), "!pl-11 focus:!pl-[43px]")} /></IconInput></Field>
              </div>

              <section aria-labelledby="verify-heading" className="flex flex-col gap-5 rounded-[16px] border border-[#dcdbd5] bg-[#f7f9fd] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#e3f1e1] text-[#2b7a26]"><ShieldCheck size={24} aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <h3 id="verify-heading" className="flex flex-wrap items-center gap-2 font-display text-[18px] font-semibold leading-6 text-[#101115]">Get verified<span className="rounded-full bg-[#e3f1e1] px-2 py-0.5 font-display text-[12px] font-medium text-[#2b7a26]">Recommended</span></h3>
                    <p className="mt-1 text-[14px] leading-5 text-[#4a4c55]">Add one proof document and our team will review it.</p>
                  </div>
                </div>
                <ul className="grid gap-2 text-[14px] leading-5 text-[#2f3138] sm:grid-cols-3">
                  {["Green Verified badge on your profile", "Ranks higher in search", "Documents are private to our review team"].map((text) => <li key={text} className="flex items-start gap-2"><BadgeCheck size={18} className="mt-px shrink-0 text-[#2b7a26]" aria-hidden="true" />{text}</li>)}
                </ul>
                <Field label="GST number" optional error={errors.gstNumber} helper="15 characters, e.g. 29ABCDE1234F1Z5"><input {...bind("gstNumber", { sanitize: (v) => String(v).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 15), tidy: (v) => String(v).trim().toUpperCase() })} maxLength={15} placeholder="Enter GST number" className={cx(inputErr("gstNumber"), "font-mono tracking-wide")} /></Field>
                <div className="flex flex-col gap-3">
                  <span className={labelClass}>Business document</span>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Document type">{DOC_TYPES.map(([value, label]) => <Chip key={value} selected={docType === value} onClick={() => setDocType(value)}>{label}</Chip>)}</div>
                  {data.kycDocuments.map((doc, index) => (
                    <div key={`${doc.url}-${index}`} className="flex items-center gap-3 rounded-[12px] border border-[#cfe5cc] bg-white p-3 pr-2">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#e3f1e1] text-[#2b7a26]"><FileText size={20} aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate font-display text-[14px] font-semibold leading-5">{DOC_TYPES.find(([value]) => value === doc.type)?.[1] || doc.type}</span><span className="block truncate text-[13px] leading-[18px] text-[#4a4c55]">{doc.name || "Uploaded"} · Pending review</span></span>
                      <button type="button" aria-label="Remove document" onClick={() => update({ kycDocuments: data.kycDocuments.filter((_, i) => i !== index) })} className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-[#6e7079] hover:bg-[#fdecea] hover:text-[#b42318]"><Trash2 size={18} /></button>
                    </div>
                  ))}
                  <input ref={docInput} type="file" accept="image/jpeg,image/png,application/pdf" hidden onChange={(event) => { addDocument(event.target.files); event.target.value = ""; }} />
                  <button type="button" onClick={() => docInput.current?.click()} disabled={docBusy} className="flex flex-col items-center gap-1 rounded-[12px] border border-dashed border-[#bdbcb5] bg-white px-4 py-5 text-center transition-colors hover:border-[#002fa7] hover:bg-[#f7f9fd] disabled:opacity-60">
                    <UploadCloud size={24} className="text-[#002fa7]" aria-hidden="true" />
                    <span className="font-display text-[15px] font-semibold text-[#101115]">{docBusy ? "Uploading…" : `Upload ${(DOC_TYPES.find(([value]) => value === docType)?.[1] || "document").toLowerCase()}`}</span>
                    <span className="text-[13px] leading-[18px] text-[#6e7079]">JPG, PNG or PDF · up to 5 MB</span>
                  </button>
                  {docError && <p role="alert" className="text-[14px] text-[#b42318]">{docError}</p>}
                </div>
              </section>
</>}

            {step === 4 && <>
              {admin && !editing && (
                <section className="flex flex-col gap-4 rounded-[14px] border border-[#cdd6ef] bg-[#f7f9fd] p-5" aria-label="Admin options">
                  <h3 className="font-display text-[16px] font-semibold leading-6">Admin options</h3>
                  <Field label="Owner" optional helper="The owner can then sign in and manage this listing. Leave empty to assign later."><select value={adminOwnerId} onChange={(event) => setAdminOwnerId(event.target.value)} className={fieldClass}><option value="">No owner yet</option>{adminOwners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} · {owner.email}</option>)}</select></Field>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[16px]"><input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} className="h-[18px] w-[18px] accent-[#002fa7]" />Publish right away (otherwise it is saved as a draft)</label>
                </section>
              )}
              <div className="flex flex-col gap-4">
                <PreviewCard title="Basics" onEdit={() => goTo(0)}>
                  <PreviewRow label="Business">{data.name} <span className="text-[#6e7079]">· {nameOf(data.category)}{data.businessType ? ` · ${BUSINESS_TYPES.find(([value]) => value === data.businessType)?.[1]}` : ""}</span></PreviewRow>
                  <PreviewRow label="Tagline">{data.tagline}</PreviewRow>
                  <PreviewRow label="Description">{data.description}</PreviewRow>
                </PreviewCard>

                <PreviewCard title="Location" onEdit={() => goTo(1)}>
                  <PreviewRow label="Address">{[data.addressLine1, data.locality, data.city, data.state, data.postalCode].filter(Boolean).join(", ")}</PreviewRow>
                  {data.mode !== "visit" && <PreviewRow label="Areas served">{data.serviceAreas.join(", ")}</PreviewRow>}
                  <PreviewRow label="Map pin">{coords ? (pinSource === "user" ? "Exact pin set" : "Placed from address") : ""}</PreviewRow>
                </PreviewCard>

                <PreviewCard title="Services & hours" onEdit={() => goTo(2)}>
                  <PreviewRow label="Services">
                    <ul className="flex flex-col gap-1.5">{data.services.map((service, index) => <li key={`${service.name}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-4"><span className="font-medium">{service.name}</span><span className="text-[14px] text-[#4a4c55]">{priceText(service)}</span></li>)}</ul>
                  </PreviewRow>
                  <PreviewRow label="Opening hours">
                    <ul className="flex max-w-[360px] flex-col gap-1">
                      {DAYS.map((day) => { const entry = data.hours[day]; return <li key={day} className="flex items-baseline justify-between gap-4"><span className="w-24 capitalize">{day}</span>{entry.open ? <span className="tabular-nums">{timeText(entry.opens)} – {timeText(entry.closes)}</span> : <span className="text-[#6e7079]">Closed</span>}</li>; })}
                    </ul>
                  </PreviewRow>
                  <PreviewRow label="Offers">{data.offers.map((offer) => offer.title).join(" · ")}</PreviewRow>
                  <PreviewRow label="Payments">{data.paymentModes.map((value) => PAYMENT_MODES.find(([id]) => id === value)?.[1]).join(", ")}</PreviewRow>
                </PreviewCard>

                <PreviewCard title="Photos & contact" onEdit={() => goTo(3)}>
                  <PreviewRow label="Photos">{photoUrls.length ? `${photoUrls.length} uploaded` : ""}</PreviewRow>
                  <PreviewRow label="Phone">{data.phone && `+91 ${data.phone}`}</PreviewRow>
                  <PreviewRow label="WhatsApp">{data.whatsapp && `+91 ${data.whatsapp}`}</PreviewRow>
                  <PreviewRow label="Email">{data.email}</PreviewRow>
                  <PreviewRow label="Website & social">{[data.website, data.instagram, data.facebook, data.youtube].filter(Boolean).join(" · ")}</PreviewRow>
                </PreviewCard>

                <PreviewCard title="Verification" onEdit={() => goTo(3)}>
                  <PreviewRow label="Status">{data.kycDocuments.length || data.gstNumber ? <span className="inline-flex items-center gap-1.5 text-[#2b7a26]"><BadgeCheck size={18} aria-hidden="true" />Documents added. Our team will review them.</span> : <span className="text-[#6e7079]">Not started. You can add documents any time.</span>}</PreviewRow>
                </PreviewCard>
              </div>
              <div className="flex flex-col gap-3 border-t border-[#ecebe7] pt-5">
                <SubHeading hint="Answer what customers often ask. This also helps people find you.">Common questions <span className="font-normal text-[#6e7079]">(optional)</span></SubHeading>
                {data.faqs.map((faq, index) => (
                  <div key={`${faq.question}-${index}`} className="flex items-start gap-3 rounded-[12px] border border-[#dcdbd5] px-4 py-3">
                    <div className="min-w-0 flex-1"><p className="font-semibold">{faq.question}</p><p className="text-[14px] leading-5 text-[#4a4c55]">{faq.answer}</p></div>
                    <button type="button" aria-label="Remove question" onClick={() => update({ faqs: data.faqs.filter((_, i) => i !== index) })} className="text-[#6e7079] hover:text-[#b42318]"><Trash2 size={18} /></button>
                  </div>
                ))}
                {faqDraft ? (
                  <div className="grid gap-3 rounded-[12px] border border-[#002fa7] bg-[#f7f9fd] p-4">
                    <Field label="Question" required><input autoFocus value={faqDraft.question} onChange={(event) => { setFaqDraft({ ...faqDraft, question: clean.text(event.target.value, 200) }); setFaqError(""); }} maxLength={200} placeholder="e.g. Do you take pre-orders?" className={fieldClass} /></Field>
                    <Field label="Answer" required><input value={faqDraft.answer} onChange={(event) => { setFaqDraft({ ...faqDraft, answer: clean.text(event.target.value, 600) }); setFaqError(""); }} maxLength={600} placeholder="Short and clear" className={fieldClass} /></Field>
                    {faqError && <p role="alert" className="text-[14px] leading-5 text-[#b42318]">{faqError}</p>}
                    <div className="flex gap-3"><Button type="primary" size="s" onClick={addFaq}>Add question</Button><Button type="ghost" size="s" onClick={() => { setFaqDraft(null); setFaqError(""); }}>Cancel</Button></div>
                  </div>
                ) : <div><Button type="secondary" size="s" onClick={() => setFaqDraft({ question: "", answer: "" })} icon={<Plus size={18} aria-hidden="true" />}>Add a question</Button></div>}
              </div>
            </>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {step === 0 ? (embedded ? <Button type="secondary" onClick={exit}>Cancel</Button> : <Button type="secondary" href={editing ? "/business-owner" : "/"}>Cancel</Button>) : <Button type="secondary" onClick={back}>Back</Button>}
            <div className="flex flex-wrap gap-3">
              {editing && step < 4 && <Button type="secondary" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>}
              {step < 4 ? <Button type="primary" onClick={next}>Continue</Button> : <Button type="primary" onClick={submit} disabled={busy}>{busy ? (editing || admin ? "Saving…" : "Submitting…") : phase === "failed" ? "Try again" : editing ? "Save changes" : admin ? (publishNow ? "Publish listing" : "Save draft") : "Submit for review"}</Button>}
            </div>
          </div>
        </div>
        <div className={embedded ? "hidden xl:block" : "hidden lg:block"}><div className={embedded ? "sticky top-24" : ""}>{aside}</div></div>
      </div>
    </>,
  );
}
