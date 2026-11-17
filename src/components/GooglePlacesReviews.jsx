'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { getGoogleReviews } from '@/lib/api';

function RatingStars({ rating, label }) {
  const value = Number(rating || 0);
  return <div className="flex gap-0.5 text-[#1746b5]" aria-label={label || `${value} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3 w-3 ${index < Math.round(value) ? 'fill-current' : 'text-[#d8d9df]'}`} />)}
  </div>;
}

export default function GooglePlacesReviews({ businessId }) {
  const section = useRef(null);
  const requested = useRef('');
  const [state, setState] = useState({ status: 'idle', data: null, error: '' });

  const load = useCallback(async signal => {
    setState(current => ({ ...current, status: 'loading', error: '' }));
    try {
      const data = await getGoogleReviews(businessId, signal);
      if (!signal.aborted) setState({ status: 'loaded', data, error: '' });
    } catch (error) {
      if (!signal.aborted) setState({ status: 'error', data: null, error: error instanceof Error ? error.message : 'Unable to load Google reviews.' });
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId || !section.current || typeof IntersectionObserver === 'undefined') return undefined;
    const controller = new AbortController();
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || requested.current === businessId) return;
      requested.current = businessId;
      void load(controller.signal);
      observer.disconnect();
    }, { rootMargin: '120px' });
    observer.observe(section.current);
    return () => { observer.disconnect(); controller.abort(); };
  }, [businessId, load]);

  useEffect(() => {
    if (typeof IntersectionObserver !== 'undefined') return undefined;
    if (requested.current === businessId) return undefined;
    requested.current = businessId;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [businessId, load]);

  const data = state.data;
  const googleMapsUrl = data?.mapsUri;
  const unavailable = state.status === 'error' && /not configured|not available|disabled/i.test(state.error);
  if (unavailable) return null;
  return <section ref={section} id="google-reviews" className="scroll-mt-24 rounded-xl border border-[#e4e3de]/90 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.025)] sm:p-5" aria-labelledby="google-reviews-heading">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-[#ecebe7] pb-3">
      <div>
        <p className="mb-1 text-[12px] font-bold text-[#1746b5]">Authentic feedback</p>
        <h2 id="google-reviews-heading" className="text-lg font-semibold tracking-tight text-[#101115]">Google Reviews</h2>
      </div>
      {state.status === 'loaded' && data?.available && data.rating !== null && <div className="flex items-center gap-2 rounded-xl border border-[#dce5ff] bg-[#f2f6ff] px-2.5 py-1.5">
        <RatingStars rating={data.rating} />
        <span className="text-[12px] font-semibold text-[#101115]">{Number(data.rating).toFixed(1)} / 5</span>
        <span className="hidden text-[12px] text-[#4a4c55] sm:inline">Verified Google source</span>
      </div>}
    </div>
    {state.status === 'idle' && <p className="text-xs text-[#4a4c55]">Google review information loads when you reach this section.</p>}
    {state.status === 'loading' && <p className="text-xs text-[#4a4c55]" role="status">Loading Google review information…</p>}
    {state.status === 'error' && <div role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><p>{state.error}</p><button type="button" onClick={() => { requested.current = true; const controller = new AbortController(); void load(controller.signal); }} className="mt-2 font-semibold underline">Try again</button></div>}
    {state.status === 'loaded' && <>
      {data?.status === 'no_place_id' && <p className="text-xs text-[#4a4c55]">A Google Maps listing has not been linked to this business yet.</p>}
      {data?.status === 'unverified' && <p className="text-xs text-[#4a4c55]">We couldn’t confirm that the linked Google listing matches this business yet. Check the Place ID and address, then try again.</p>}
      {data?.status === 'mismatch' && <p className="text-xs text-[#4a4c55]">Google review information is unavailable because the linked listing does not match this business.</p>}
      {data?.status === 'no_data' && <p className="text-xs text-[#4a4c55]">Google has no rating information available for this listing.</p>}
      {data?.status === 'no_data' && data.mapsUri && <a href={data.mapsUri} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#1746b5] hover:underline">Open this listing on Google Maps ↗</a>}
      {data?.available && <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ecebe7] pb-3">
          <div className="flex items-center gap-3">
            {data.rating !== null && <span className="text-xl font-semibold tracking-tight tabular-nums text-[#101115]">{Number(data.rating).toFixed(1)}</span>}
            <div>
              {data.rating !== null && <RatingStars rating={data.rating} />}
              <p className="mt-1 text-[12px] text-[#4a4c55]">{Number(data.ratingCount || 0).toLocaleString()} Google ratings</p>
            </div>
          </div>
          {googleMapsUrl && <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-[#1746b5] hover:underline">Read on Google Maps ↗</a>}
        </div>
        {data.reviews?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{data.reviews.map((review, index) => <article key={`${review.author?.displayName || 'review'}-${index}`} className="rounded-xl border border-[#ecebe7] bg-[#f7f7f4]/70 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf0ff] text-[12px] font-semibold text-[#1746b5]">{(review.author?.displayName || 'G').slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0">
                {review.author?.uri ? <a href={review.author.uri} target="_blank" rel="noopener noreferrer" className="block truncate text-[12px] font-semibold text-[#101115] hover:underline">{review.author.displayName || 'Google user'}</a> : <h3 className="truncate text-[12px] font-semibold text-[#101115]">{review.author?.displayName || 'Google user'}</h3>}
                {review.relativePublishTimeDescription && <span className="block truncate text-[12px] text-[#4a4c55]">{review.relativePublishTimeDescription}</span>}
              </div>
            </div>
            {review.rating !== null && <RatingStars rating={review.rating} />}
          </div>
          {review.text && <p className="mt-2 whitespace-pre-wrap text-[12px] leading-4 text-[#4a4c55]">{review.text}</p>}
        </article>)}</div> : <p className="mt-3 text-xs text-[#4a4c55]">{data.mode === 'rating' ? 'Review text is not enabled for this listing.' : 'Google has not provided review text for this listing.'}</p>}
      </>}
    </>}
    <p className="mt-3 text-[12px] leading-4 text-[#4a4c55]">Google provides these ratings and reviews. Only a limited selection may be available.</p>
  </section>;
}
