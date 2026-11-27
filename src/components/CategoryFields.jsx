"use client";

import { cx } from "@/components/ds";

// "Category details": the extra questions the chosen category asks. Every question is optional.
// `fields` come from the category (see the admin category list); `answers` is { key: [value, ...] }.
export default function CategoryFields({ fields, answers = {}, onChange, title }) {
  if (!fields.length) return null;
  const set = (key, values) => onChange({ ...answers, [key]: values });
  const control = "h-12 w-full rounded-[10px] border border-[#bdbcb5] bg-white px-3.5 text-[16px] text-[#101115] outline-none placeholder:text-[#6e7079] hover:border-[#101115] focus:border-2 focus:border-[#002fa7] focus:px-[13px]";
  const labelClass = "font-display text-[14px] font-medium leading-5 text-[#101115]";
  return (
    <div className="flex flex-col gap-5 rounded-[16px] border border-[#dcdbd5] bg-[#f7f7f4] p-4 sm:p-5">
      <div>
        <h2 className="font-display text-[16px] font-semibold leading-6">{title ? `${title} details` : "Category details"}</h2>
        <p className="text-[13px] leading-[18px] text-[#4a4c55]">Optional. Customers see only what you fill in.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const values = answers[field.key] || [];
          const id = `field-detail-${field.key}`;
          if (field.type === "multi") {
            return (
              <fieldset key={field.key} className="flex flex-col gap-2 sm:col-span-2">
                <legend className={cx(labelClass, "mb-1.5")}>{field.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {field.options.map((option) => {
                    const on = values.includes(option);
                    return <button key={option} type="button" aria-pressed={on} onClick={() => set(field.key, on ? values.filter((item) => item !== option) : [...values, option])} className={cx("inline-flex min-h-10 items-center rounded-full border px-3.5 font-display text-[13px] font-medium transition-colors", on ? "border-[#002fa7] bg-[#002fa7] text-white" : "border-[#bdbcb5] bg-white text-[#101115] hover:border-[#101115]")}>{option}</button>;
                  })}
                </div>
              </fieldset>
            );
          }
          return (
            <label key={field.key} htmlFor={id} className="flex flex-col gap-1.5">
              <span className={labelClass}>{field.label}{field.unit ? <span className="font-normal text-[#6e7079]"> ({field.unit})</span> : null}</span>
              {field.type === "select"
                ? <select id={id} value={values[0] || ""} onChange={(event) => set(field.key, event.target.value ? [event.target.value] : [])} className={control}><option value="">Select</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                : <input id={id} value={values[0] || ""} inputMode={field.type === "number" ? "numeric" : undefined} maxLength={field.type === "number" ? 9 : 120} placeholder={field.placeholder || ""} onChange={(event) => { const next = field.type === "number" ? event.target.value.replace(/\D/g, "") : event.target.value; set(field.key, next ? [next] : []); }} className={control} />}
            </label>
          );
        })}
      </div>
    </div>
  );
}
