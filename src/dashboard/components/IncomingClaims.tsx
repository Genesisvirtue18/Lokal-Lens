import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ds';
import { request } from '../api';

type Incoming = { _id: string; businessName?: string; claimantName?: string; relationship?: string; verifiedVia?: string; createdAt?: string; disputed?: boolean };

// Someone else asked to claim one of this owner's listings. Nothing moves without our team, but the owner can say "that's not right".
export function IncomingClaims({ showToast }: { showToast: (message: string) => void }) {
  const [items, setItems] = useState<Incoming[]>([]);
  const [openId, setOpenId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { let live = true; request('/owner/incoming-claims').then((data) => { if (live) setItems(data.items || []); }).catch(() => {}); return () => { live = false; }; }, []);
  if (!items.length) return null;

  const send = async (id: string) => {
    if (note.trim().length < 5) { showToast('Write a few words so our team understands.'); return; }
    setBusy(true);
    try { await request(`/owner/incoming-claims/${id}/dispute`, { method: 'POST', body: JSON.stringify({ note: note.trim() }) }); setItems((list) => list.map((item) => item._id === id ? { ...item, disputed: true } : item)); setOpenId(''); setNote(''); showToast('Thanks. Our team will see your note before deciding.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to send your note'); }
    finally { setBusy(false); }
  };

  return (
    <section aria-label="Claims on your listings" className="flex flex-col gap-3 rounded-[20px] border border-[#f0d9a8] bg-[#fdf6e7] p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#f6e3b8] text-[#8a5a00]"><ShieldAlert size={20} aria-hidden="true" /></span>
        <div><h2 className="text-[17px] font-semibold leading-6">Someone asked to claim your listing</h2><p className="text-[14px] leading-5 text-[#5c3d00]">Our team won’t move a listing without checking. If you don’t know this person, tell us.</p></div>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item._id} className="flex flex-col gap-2 rounded-[12px] bg-white p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[15px] leading-5"><strong>{item.claimantName || 'Someone'}</strong> wants “{item.businessName}”{item.relationship ? <span className="text-[#6e7079]"> · says they’re {item.relationship === 'owner' ? 'the owner' : `the ${item.relationship}`}</span> : null}</p>
              {item.disputed ? <span className="text-[13px] font-medium text-[#2b7a26]">You told us it’s not right</span> : <Button type="secondary" size="s" onClick={() => { setOpenId(openId === item._id ? '' : item._id); setNote(''); }}>This isn’t right</Button>}
            </div>
            {openId === item._id && (
              <div className="flex flex-col gap-2">
                <textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, 800))} rows={3} placeholder="e.g. I don’t know this person. I own this business and haven’t asked anyone to manage it." className="rounded-[10px] border border-[#bdbcb5] p-3 text-[15px] outline-none focus:border-2 focus:border-[#002fa7]" />
                <div className="flex gap-2"><Button type="primary" size="s" disabled={busy} onClick={() => void send(item._id)}>{busy ? 'Sending…' : 'Send to our team'}</Button><Button type="ghost" size="s" onClick={() => setOpenId('')}>Cancel</Button></div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
