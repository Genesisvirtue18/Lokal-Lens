"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ds";
import { authedFetch } from "@/dashboard/api";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "https://directory-backend-ai6r.onrender.com/api/v1").replace(/\/$/, "");

function Stars({ value, size = 16 }) {
  return <span className="inline-flex gap-0.5" role="img" aria-label={`${Number(value).toFixed(1)} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} className={n <= Math.round(value) ? "fill-[#101115] text-[#101115]" : "text-[#bdbcb5]"} aria-hidden="true" />)}</span>;
}

const subscribeToStorage = (callback) => { window.addEventListener("storage", callback); return () => window.removeEventListener("storage", callback); };
const readSignedIn = () => { try { return Boolean(localStorage.getItem("directflow_access_token")); } catch { return false; } };
const dateText = (value) => { try { return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

export default function CustomerReviews({ businessId, businessName, initialReviews = [], initialAverage = 0, initialCount = 0 }) {
  const [reviews, setReviews] = useState(() => [...initialReviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [sort, setSort] = useState("newest");
  const [visible, setVisible] = useState(3);
  const [writing, setWriting] = useState(false);
  const signedIn = useSyncExternalStore(subscribeToStorage, readSignedIn, () => false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const distribution = useMemo(() => [5, 4, 3, 2, 1].map((star) => ({ star, total: reviews.filter((review) => Math.round(review.rating) === star).length })), [reviews]);
  const ordered = useMemo(() => {
    const list = [...reviews];
    if (sort === "highest") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") list.sort((a, b) => a.rating - b.rating);
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [reviews, sort]);

  async function submit(event) {
    event.preventDefault();
    if (!rating) { setStatus({ type: "error", text: "Choose a star rating first." }); return; }
    setSaving(true); setStatus({ type: "", text: "" });
    try {
      const response = await authedFetch(`${apiUrl}/businesses/${businessId}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment: comment.trim() || undefined }) }, true);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Unable to save your review");
      const list = await fetch(`${apiUrl}/businesses/${businessId}/reviews`).then((res) => res.json()).catch(() => null);
      if (list?.data) { setReviews(list.data.items); setAverage(list.data.averageRating); setCount(list.data.reviewCount); }
      setStatus({ type: "ok", text: body.message || "Thanks for your review" }); setComment(""); setRating(0); setWriting(false);
    } catch (reason) { setStatus({ type: "error", text: reason.message }); }
    finally { setSaving(false); }
  }

  const maxBar = Math.max(1, ...distribution.map((row) => row.total));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2"><p className="font-eyebrow text-[#6e7079]">Reviews · {count}</p><h2 className="text-[24px] font-semibold leading-8 tracking-[-0.0208em]">Reviews</h2></div>

      <div className="flex flex-col gap-6 rounded-[16px] border border-[#dcdbd5] bg-white p-6 md:flex-row md:items-center md:gap-10">
        <div className="flex shrink-0 flex-col gap-1">
          <p className="text-[56px] font-semibold leading-[62px] tracking-[-0.0357em]">{count ? Number(average).toFixed(1) : "–"}</p>
          <Stars value={average} size={18} />
          <p className="text-[14px] leading-5 text-[#4a4c55]">{count} {count === 1 ? "review" : "reviews"}</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2" aria-label="Rating distribution">
          {distribution.map(({ star, total }) => (
            <div key={star} className="flex items-center gap-3 text-[13px] leading-[18px]">
              <span className="w-12 shrink-0 font-display font-medium">{star} star</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#ecebe7]"><span className="block h-full rounded-full bg-[#101115]" style={{ width: `${(total / maxBar) * 100}%` }} /></span>
              <span className="w-8 shrink-0 text-right text-[#4a4c55]">{total}</span>
            </div>
          ))}
        </div>
        <div className="flex shrink-0 flex-col gap-2 md:w-[200px]">
          {signedIn
            ? <Button type="primary" size="s" onClick={() => setWriting((value) => !value)} aria-expanded={writing}>Write a review</Button>
            : <Button type="primary" size="s" href="/login">Write a review</Button>}
          <p className="text-[14px] leading-5 text-[#6e7079]">{signedIn ? "Reviews are checked for spam before they appear." : "Sign in required. Reviews are checked for spam before they appear."}</p>
        </div>
      </div>

      {writing && signedIn && (
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-6">
          <h3 className="font-display text-[16px] font-semibold">Rate {businessName}</h3>
          <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Your rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="p-0.5"><Star size={28} className={n <= (hover || rating) ? "fill-[#101115] text-[#101115]" : "text-[#bdbcb5]"} aria-hidden="true" /></button>)}</div>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={3000} rows={3} placeholder="Share your experience (optional)" className="w-full rounded-[10px] border border-[#bdbcb5] px-3.5 py-3 text-[16px] outline-none placeholder:text-[#6e7079] hover:border-[#101115] focus:border-2 focus:border-[#002fa7] focus:px-[13px]" />
          <div className="flex items-center gap-3"><Button type="primary" size="s" htmlType="submit" disabled={saving}>{saving ? "Saving…" : "Submit review"}</Button>{status.text && <p role={status.type === "error" ? "alert" : "status"} className={`text-[14px] ${status.type === "error" ? "text-[#b3261e]" : "text-[#4a4c55]"}`}>{status.text}</p>}</div>
        </form>
      )}
      {!writing && status.text && status.type === "ok" && <p role="status" className="rounded-[10px] bg-[#e7f4e5] px-4 py-3 text-[14px] text-[#2b7a26]">{status.text}</p>}

      {reviews.length > 0 ? <>
        <ul className="flex flex-col gap-4">{ordered.slice(0, visible).map((review) => (
          <li key={review._id || `${review.reviewerName}-${review.createdAt}`} className="flex flex-col gap-3 rounded-[16px] border border-[#dcdbd5] bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fbe6ec] font-display text-[15px] font-semibold text-[#7a2842]">{(review.reviewerName || "?")[0].toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="truncate font-display text-[15px] font-semibold leading-5">{review.reviewerName}</p><p className="text-[13px] leading-[18px] text-[#6e7079]">{dateText(review.createdAt)}</p></div>
              <Stars value={review.rating} size={16} />
            </div>
            {review.comment && <p className="whitespace-pre-line text-[16px] leading-6">{review.comment}</p>}
            {review.reply?.text && <div className="rounded-[12px] bg-[#f1f1ee] p-4"><p className="font-display text-[13px] font-semibold text-[#002fa7]">Response from the owner · {dateText(review.reply.createdAt)}</p><p className="mt-1 whitespace-pre-line text-[15px] leading-6">{review.reply.text}</p></div>}
          </li>
        ))}</ul>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] leading-5 text-[#4a4c55]">Showing {Math.min(visible, ordered.length)} of {count || ordered.length}</p>
          <label className="flex items-center gap-2 text-[14px] text-[#4a4c55]">Sort<select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded-[10px] border border-[#bdbcb5] bg-white px-3 text-[14px] text-[#101115] outline-none focus:border-[#002fa7]"><option value="newest">Newest</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select></label>
        </div>
        {visible < ordered.length && <div><Button type="secondary" onClick={() => setVisible((value) => value + 5)}>Show more reviews</Button></div>}
      </> : <p className="rounded-[16px] border border-[#dcdbd5] bg-white px-6 py-8 text-center text-[14px] text-[#4a4c55]">No reviews yet. Be the first to share your experience. {!signedIn && <Link href="/login" className="font-medium text-[#002fa7] underline">Sign in</Link>}</p>}
    </div>
  );
}
