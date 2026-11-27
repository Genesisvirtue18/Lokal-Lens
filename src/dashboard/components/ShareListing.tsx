import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ds';
import { businessDetailPath } from '@/lib/directory-data';
import { BusinessListing } from '../types';

const siteOrigin = () => (process.env.NEXT_PUBLIC_SITE_URL || (typeof window === 'undefined' ? '' : window.location.origin)).replace(/\/$/, '');

// Link, WhatsApp message and a printable QR code for a live listing.
export function ShareListing({ business }: { business: BusinessListing }) {
  const live = business.status === 'Active';
  const url = `${siteOrigin()}${businessDetailPath({ address: business.address, category: business.category, slug: business.slug, name: business.name, id: business.id })}`;
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!live) return undefined;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#101115', light: '#ffffff' } }).then((data) => { if (!cancelled) setQr(data); }).catch(() => { if (!cancelled) setQr(''); });
    return () => { cancelled = true; };
  }, [url, live]);

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setFailed(true); }
  }
  const message = `Find ${business.name} on Lokal Lens: ${url}`;
  const fileName = `${(business.slug || business.name || 'listing').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'listing'}-qr.png`;

  return (
    <article className="flex flex-col gap-5 rounded-[20px] border border-[#dcdbd5] bg-white p-6 md:flex-row md:items-center" aria-label="Share your listing">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#e6ebf7] text-[#002fa7]"><Share2 size={22} aria-hidden="true" /></span>
          <div><h2 className="text-[18px] font-semibold leading-[26px] tracking-[-0.0111em]">Share your listing</h2><p className="text-[14px] leading-5 text-[#4a4c55]">{live ? 'Send it to your customers or put the QR code at your counter, so they can find you and leave a review.' : 'Sharing opens once your listing is live. We’ll show the link and QR code here.'}</p></div>
        </div>
        {live && (
          <>
            <div className="flex flex-col gap-1"><div className="flex items-center gap-2 rounded-[10px] border border-[#dcdbd5] bg-[#f7f7f4] px-3 py-2.5"><span className="min-w-0 flex-1 select-all truncate font-mono text-[13px] text-[#4a4c55]" title={url}>{url}</span></div>{failed && <p role="status" className="text-[13px] text-[#8a5a00]">Couldn’t copy automatically. Select the link above and copy it.</p>}</div>
            <div className="flex flex-wrap gap-2">
              <Button type="primary" size="s" onClick={copy} icon={copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}>{copied ? 'Link copied' : 'Copy link'}</Button>
              <Button type="secondary" size="s" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Share on WhatsApp</Button>
            </div>
          </>
        )}
      </div>
      {live && qr && (
        <div className="flex shrink-0 flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code for ${business.name}`} width={144} height={144} className="rounded-[12px] border border-[#dcdbd5]" />
          <a href={qr} download={fileName} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-2.5 font-display text-[14px] font-medium text-[#002fa7] hover:bg-[#eef2fb]"><Download size={16} aria-hidden="true" />Download QR</a>
        </div>
      )}
    </article>
  );
}
