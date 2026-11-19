"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ds";
import { reportReview } from "@/dashboard/api";

const REASONS = [["spam", "Spam or advertising"], ["fake", "Fake or not a real customer"], ["abusive", "Abusive or hateful"], ["irrelevant", "Not about this business"], ["personal_info", "Shares personal information"], ["other", "Something else"]];

// "Report" on a review. Needs a signed-in account; the admins decide whether to remove it.
export default function ReportReviewButton({ businessId, reviewId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState({ busy: false, error: "", done: false });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function start() {
    let signedIn = false;
    try { signedIn = Boolean(localStorage.getItem("directflow_access_token")); } catch { /* treat as signed out */ }
    if (!signedIn) { window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`; return; }
    setState({ busy: false, error: "", done: false }); setReason(""); setNote(""); setOpen(true);
  }
  async function send() {
    setState({ busy: true, error: "", done: false });
    try { await reportReview(businessId, reviewId, reason, note.trim() || undefined); setState({ busy: false, error: "", done: true }); }
    catch (error) { setState({ busy: false, error: error instanceof Error ? error.message : "Unable to send the report", done: false }); }
  }

  return (
    <>
      <button type="button" onClick={start} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#6e7079] hover:text-[#b42318]"><Flag size={13} aria-hidden="true" />Report</button>
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Report this review" className="fixed inset-0 z-50 grid place-items-center bg-[#101115]/50 p-4" onClick={() => !state.busy && setOpen(false)}>
          <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-[20px] bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            {state.done ? (
              <>
                <h2 className="text-[20px] font-semibold leading-7">Thanks for letting us know</h2>
                <p className="text-[14px] leading-5 text-[#4a4c55]">Our team will look at this review. If it breaks our rules, it is removed.</p>
                <div className="flex justify-end"><Button type="primary" size="s" onClick={() => setOpen(false)}>Done</Button></div>
              </>
            ) : (
              <>
                <div><h2 className="text-[20px] font-semibold leading-7">Report this review</h2><p className="mt-1 text-[14px] leading-5 text-[#4a4c55]">Tell us what’s wrong with it. Only our team sees your report.</p></div>
                <fieldset className="flex flex-col gap-1">{REASONS.map(([value, label]) => <label key={value} className="flex min-h-10 cursor-pointer items-center gap-3 text-[15px]"><input type="radio" name="report-reason" checked={reason === value} onChange={() => setReason(value)} className="h-[18px] w-[18px] accent-[#002fa7]" />{label}</label>)}</fieldset>
                <label className="flex flex-col gap-1.5 text-[14px] font-medium">More detail <span className="font-normal text-[#6e7079]">(optional)</span><textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, 600))} rows={3} className="rounded-[10px] border border-[#bdbcb5] p-3 text-[14px] font-normal outline-none focus:border-2 focus:border-[#002fa7]" /></label>
                {state.error && <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-[14px] text-[#8c1d13]">{state.error}</p>}
                <div className="flex justify-end gap-2"><Button type="ghost" size="s" onClick={() => setOpen(false)} disabled={state.busy}>Cancel</Button><Button type="primary" size="s" onClick={send} disabled={state.busy || !reason}>{state.busy ? "Sending…" : "Send report"}</Button></div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
