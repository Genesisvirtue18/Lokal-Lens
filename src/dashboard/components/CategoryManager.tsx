import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Eye, EyeOff, FolderPlus, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { Button, cx } from '@/components/ds';
import { CATEGORY_ICONS, CategoryIcon, guessIconKey, hasValidIcon } from '@/lib/category-icons';
import { useConfirm } from '@/components/ConfirmProvider';
import { addCategoryServices, createCategory, deleteCategory, importCategoriesCsv, importServicesCsv, loadAdminCategories, ManagedCategory, updateCategory } from '../api';

const input = 'h-10 rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px] outline-none focus:border-2 focus:border-[#002fa7]';

// A button that shows the chosen icon and opens a searchable grid of icons. Admins pick from this list only, so icons stay consistent.
function IconPicker({ value, name, onChange, label = 'Icon' }: { value: string; name: string; onChange: (key: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => { if (box.current && !box.current.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const shown = CATEGORY_ICONS.filter((item) => !term.trim() || `${item.label} ${item.key}`.toLowerCase().includes(term.trim().toLowerCase()));
  const chosen = hasValidIcon(value);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${chosen ? CATEGORY_ICONS.find((i) => i.key === value)?.label : 'none chosen'}`} className={cx('flex h-10 items-center gap-2 rounded-[10px] border bg-white px-2.5 text-[14px] hover:border-[#101115]', chosen ? 'border-[#bdbcb5]' : 'border-dashed border-[#b42318] text-[#b42318]')}>
        {chosen ? <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[#e6ebf7] text-[#002fa7]"><CategoryIcon icon={value} name={name} size={18} /></span> : <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[#fdecea]"><Plus size={16} aria-hidden="true" /></span>}
        <span className="font-medium">{chosen ? CATEGORY_ICONS.find((i) => i.key === value)?.label : 'Choose icon'}</span>
        <ChevronDown size={16} className="text-[#6e7079]" aria-hidden="true" />
      </button>
      {open && (
        <div role="dialog" aria-label="Choose an icon" className="absolute left-0 top-12 z-30 w-[340px] max-w-[calc(100vw-32px)] rounded-[16px] border border-[#dcdbd5] bg-white p-3 shadow-[0_8px_24px_rgba(16,17,21,.14)]">
          <label className="mb-2 flex h-10 items-center gap-2 rounded-[10px] border border-[#bdbcb5] px-3"><Search size={16} className="text-[#6e7079]" aria-hidden="true" /><input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search icons (e.g. salon)" aria-label="Search icons" className="w-full bg-transparent text-[14px] outline-none" /></label>
          <div className="grid max-h-[260px] grid-cols-5 gap-1.5 overflow-y-auto pr-1">
            {shown.map((item) => <button key={item.key} type="button" title={item.label} aria-label={item.label} aria-pressed={value === item.key} onClick={() => { onChange(item.key); setOpen(false); setTerm(''); }} className={cx('flex flex-col items-center gap-1 rounded-[10px] border px-1 py-2 text-[11px] leading-3', value === item.key ? 'border-[#002fa7] bg-[#e6ebf7] text-[#002fa7]' : 'border-transparent hover:bg-[#f1f1ee]')}><item.Icon size={20} aria-hidden="true" /><span className="max-w-full truncate">{item.label}</span></button>)}
            {!shown.length && <p className="col-span-5 py-6 text-center text-[13px] text-[#6e7079]">No icon matches “{term}”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export const CategoryManager = ({ onMessage }: { onMessage: (message: string) => void }) => {
  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const suggested = guessIconKey(newName);
  const iconToUse = newIcon || suggested;
  const [open, setOpen] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [subName, setSubName] = useState('');
  const [serviceText, setServiceText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const refresh = async () => { try { setCategories(await loadAdminCategories()); setLoaded(true); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load categories'); } };
  useEffect(() => { let active = true; loadAdminCategories().then((items) => { if (active) { setCategories(items); setLoaded(true); } }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load categories'); }); return () => { active = false; }; }, []);

  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true); setError('');
    try { await work(); await refresh(); onMessage(success); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save changes'); return false; }
    finally { setBusy(false); }
  };
  const chooseFile = (work: (file: File) => Promise<unknown>, success: string) => async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; await run(() => work(file), success); event.target.value = ''; };


  const saveEdit = async () => {
    if (!editing) return;
    const ok = await run(() => updateCategory(editing.id, { name: editing.name.trim(), icon: editing.icon }), 'Category saved.');
    if (ok) setEditing(null);
  };

  const row = (category: ManagedCategory, top: boolean) => {
    const isEditing = editing?.id === category._id;
    const hidden = category.isActive === false;
    const expanded = open === category._id;
    return (
      <div key={category._id} className={cx('flex flex-col', top ? 'rounded-[16px] border border-[#dcdbd5] bg-white' : 'border-t border-[#ecebe7]', hidden && 'opacity-70')}>
        <div className={cx('flex flex-wrap items-center gap-3', top ? 'p-4 sm:px-5' : 'py-3 pl-14 pr-4 sm:pr-5')}>
          {top && <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-[12px]', hasValidIcon(category.icon || '') ? 'bg-[#e6ebf7] text-[#002fa7]' : 'bg-[#fbf0d9] text-[#8a5a00]')}><CategoryIcon icon={category.icon} name={category.name} size={22} /></span>}
          {isEditing ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} maxLength={120} aria-label="Category name" className={cx(input, 'min-w-[160px] flex-1')} />
              {top && <IconPicker value={editing.icon} name={editing.name} onChange={(icon) => setEditing({ ...editing, icon })} />}
              <Button type="primary" size="s" onClick={() => void saveEdit()} disabled={busy || editing.name.trim().length < 2 || (top && !hasValidIcon(editing.icon))}>Save</Button>
              <Button type="ghost" size="s" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-display text-[16px] font-semibold leading-6">{category.name}{hidden && <span className="rounded-full bg-[#e4e3de] px-2 py-0.5 text-[12px] font-medium text-[#4a4c55]">Hidden</span>}{top && !hasValidIcon(category.icon || '') && <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf0d9] px-2 py-0.5 text-[12px] font-medium text-[#8a5a00]"><AlertTriangle size={12} aria-hidden="true" />No icon chosen</span>}</p>
              <p className="text-[13px] leading-[18px] text-[#6e7079]">{top ? `${category.children?.length || 0} subcategories · ` : ''}{category.services?.length || 0} services</p>
            </div>
          )}
          {!isEditing && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button type="secondary" size="s" onClick={() => { setOpen(expanded ? '' : category._id); setSubName(''); setServiceText(''); }}>{expanded ? 'Close' : top ? 'Subcategories & services' : 'Services'}</Button>
              <button type="button" aria-label={`Rename or change icon of ${category.name}`} title="Edit" onClick={() => setEditing({ id: category._id, name: category.name, icon: category.icon || '' })} className="grid h-9 w-9 place-items-center rounded-[8px] text-[#4a4c55] hover:bg-[#f1f1ee]"><Pencil size={16} aria-hidden="true" /></button>
              <button type="button" aria-label={hidden ? `Show ${category.name}` : `Hide ${category.name}`} title={hidden ? 'Show to customers' : 'Hide from customers'} onClick={() => void run(() => updateCategory(category._id, { isActive: hidden }), hidden ? 'Category is visible again.' : 'Category hidden.')} className="grid h-9 w-9 place-items-center rounded-[8px] text-[#4a4c55] hover:bg-[#f1f1ee]">{hidden ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}</button>
              <button type="button" aria-label={`Delete ${category.name}`} title="Delete" onClick={async () => { const pw = await confirm({ title: `Delete “${category.name}”?`, message: 'This can’t be undone. A category that listings still use can only be hidden, not deleted.', confirmLabel: 'Delete category', tone: 'danger', askCode: true }); if (pw) void run(() => deleteCategory(category._id, String(pw)), 'Category deleted.'); }} className="grid h-9 w-9 place-items-center rounded-[8px] text-[#6e7079] hover:bg-[#fdecea] hover:text-[#b42318]"><Trash2 size={16} aria-hidden="true" /></button>
            </div>
          )}
        </div>

        {expanded && (
          <div className={cx('flex flex-col gap-4 border-t border-[#ecebe7] bg-[#f7f7f4] p-4 sm:p-5', top ? 'rounded-b-[16px]' : '')}>
            {top && (
              <div className="flex flex-col gap-2">
                <p className="font-eyebrow text-[#6e7079]">Subcategories</p>
                <div className="flex flex-wrap gap-2"><input value={subName} onChange={(event) => setSubName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && subName.trim().length >= 2) void run(async () => { await createCategory(subName.trim(), category._id); setSubName(''); }, 'Subcategory added.'); }} placeholder="e.g. Dental clinic" maxLength={120} aria-label={`New subcategory in ${category.name}`} className={cx(input, 'min-w-[200px] flex-1')} /><Button type="primary" size="s" disabled={busy || subName.trim().length < 2} onClick={() => void run(async () => { await createCategory(subName.trim(), category._id); setSubName(''); }, 'Subcategory added.')} icon={<FolderPlus size={16} aria-hidden="true" />}>Add</Button></div>
                <label className="flex flex-wrap items-center gap-2 text-[13px] text-[#4a4c55]"><Upload size={14} aria-hidden="true" />Or import a CSV (column: name)<input type="file" accept=".csv,text/csv" disabled={busy} onChange={chooseFile((file) => importCategoriesCsv(file, category._id), 'Subcategories imported.')} className="text-[13px]" /></label>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <p className="font-eyebrow text-[#6e7079]">Services owners can pick</p>
              {category.services?.length ? <ul className="flex flex-wrap gap-2">{category.services.map((service) => <li key={service} className="inline-flex items-center gap-1 rounded-full border border-[#dcdbd5] bg-white py-1 pl-3 pr-1 text-[13px]">{service}<button type="button" aria-label={`Remove ${service}`} disabled={busy} onClick={() => void run(() => updateCategory(category._id, { services: (category.services || []).filter((value) => value !== service) }), 'Service removed.')} className="grid h-6 w-6 place-items-center rounded-full text-[#6e7079] hover:bg-[#fdecea] hover:text-[#b42318]"><X size={13} aria-hidden="true" /></button></li>)}</ul> : <p className="text-[13px] text-[#6e7079]">No services yet.</p>}
              <div className="flex flex-wrap gap-2"><input value={serviceText} onChange={(event) => setServiceText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && serviceText.trim()) void run(async () => { await addCategoryServices(category._id, serviceText.split(',').map((value) => value.trim()).filter(Boolean)); setServiceText(''); }, 'Services added.'); }} placeholder="Add services, separated by commas" aria-label={`Add services to ${category.name}`} className={cx(input, 'min-w-[200px] flex-1')} /><Button type="primary" size="s" disabled={busy || !serviceText.trim()} onClick={() => void run(async () => { await addCategoryServices(category._id, serviceText.split(',').map((value) => value.trim()).filter(Boolean)); setServiceText(''); }, 'Services added.')}>Add</Button></div>
              <label className="flex flex-wrap items-center gap-2 text-[13px] text-[#4a4c55]"><Upload size={14} aria-hidden="true" />Or import a CSV (column: service)<input type="file" accept=".csv,text/csv" disabled={busy} onChange={chooseFile((file) => importServicesCsv(file, category._id), 'Services imported.')} className="text-[13px]" /></label>
            </div>
          </div>
        )}
        {top && (category.children || []).length > 0 && <div>{category.children?.map((child) => row(child, false))}</div>}
      </div>
    );
  };

  const withoutIcon = categories.filter((item) => !hasValidIcon(item.icon || ''));
  const guessable = withoutIcon.filter((item) => guessIconKey(item.name));
  const applyGuesses = () => run(async () => { for (const item of guessable) await updateCategory(item._id, { icon: guessIconKey(item.name) }); }, 'Icons set from the category names.');

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 pb-24 pt-8 md:px-8 lg:pt-10">
      <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#002fa7]">Admin</p><h1 className="text-[28px] font-semibold leading-9 tracking-[-0.0294em] md:text-[34px] md:leading-[42px]">Categories</h1><p className="text-[16px] leading-6 text-[#4a4c55]">The categories customers browse and the services owners can choose. Every category has an icon you pick, so the site looks the same everywhere.</p></div>

      {error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-4 py-3 text-[14px] text-[#8c1d13]">{error}</p>}
      {withoutIcon.length > 0 && <p role="status" className="flex items-start gap-2 rounded-[10px] bg-[#fbf0d9] px-4 py-3 text-[14px] leading-5 text-[#6b4700]"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{withoutIcon.length} {withoutIcon.length === 1 ? 'category has' : 'categories have'} no icon chosen yet ({withoutIcon.map((item) => item.name).join(', ')}). The site is guessing one from the name. Pick one with the pencil button so it stays consistent.{guessable.length > 0 && <> <button type="button" onClick={() => void applyGuesses()} disabled={busy} className="font-semibold underline">Set {guessable.length === withoutIcon.length ? 'all of them' : `${guessable.length} of them`} automatically</button> (you can still change any later).</>}</span></p>}

      <section className="flex flex-col gap-4 rounded-[16px] border border-[#dcdbd5] bg-white p-5" aria-label="Add a category">
        <h2 className="text-[18px] font-semibold leading-[26px]">Add a category</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && newName.trim().length >= 2 && hasValidIcon(iconToUse)) void run(async () => { await createCategory(newName.trim(), undefined, iconToUse); setNewName(''); setNewIcon(''); }, 'Category added.'); }} placeholder="Category name, e.g. Pet care" maxLength={120} aria-label="Category name" className={cx(input, 'min-w-[220px] flex-1')} />
          <IconPicker value={iconToUse} name={newName} onChange={setNewIcon} />
          <Button type="primary" disabled={busy || newName.trim().length < 2 || !hasValidIcon(iconToUse)} onClick={() => void run(async () => { await createCategory(newName.trim(), undefined, iconToUse); setNewName(''); setNewIcon(''); }, 'Category added.')} icon={<Plus size={18} aria-hidden="true" />}>Add category</Button>
        </div>
        {newName.trim().length >= 2 && (!hasValidIcon(iconToUse) ? <p className="text-[13px] text-[#6e7079]">We couldn’t guess an icon for this name. Choose one to add it.</p> : !newIcon ? <p className="text-[13px] text-[#6e7079]">Icon suggested from the name. Change it if it doesn’t fit.</p> : null)}
        <button type="button" onClick={() => setShowImport((v) => !v)} className="self-start text-[14px] font-medium text-[#002fa7] hover:underline">{showImport ? 'Hide CSV import' : 'Import many categories from a CSV'}</button>
        {showImport && <label className="flex flex-col gap-1.5 text-[14px] text-[#4a4c55]">CSV with a “name” column. Imported categories have no icon until you choose one.<input type="file" accept=".csv,text/csv" disabled={busy} onChange={chooseFile((file) => importCategoriesCsv(file), 'Categories imported.')} className="text-[14px]" /></label>}
      </section>

      <section className="flex flex-col gap-3" aria-label="All categories">
        {!loaded && !error ? <p className="text-[14px] text-[#6e7079]">Loading…</p> : categories.length ? categories.map((category) => row(category, true)) : <p className="rounded-[16px] border border-dashed border-[#bdbcb5] bg-white px-6 py-12 text-center text-[15px] text-[#4a4c55]">No categories yet. Add the first one above.</p>}
      </section>
    </main>
  );
};
