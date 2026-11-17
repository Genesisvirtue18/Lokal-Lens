// Lokal Lens design system: components built from the Figma "Foundations" and "Components" pages.
// Every size, colour and radius below is read from the Figma file, not guessed.
import Link from "next/link";
import { BadgeCheck, Clock3, Megaphone, Sparkles, Star } from "lucide-react";

export const cx = (...parts) => parts.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ Logo */
// Mark 32x32 (ring 14px / 3px stroke + 7px blush dot), wordmark Poppins SemiBold 20px, tracking -3%.
export function Logo({ theme = "light", className = "" }) {
  const onBlue = theme === "blue";
  return (
    <span className={cx("inline-flex items-center gap-[10px]", className)}>
      <span className={cx("relative inline-block h-8 w-8 shrink-0 rounded-full", onBlue ? "bg-white" : "bg-[#002fa7]")} aria-hidden="true">
        <span className={cx("absolute left-[9px] top-[9px] h-[14px] w-[14px] rounded-full border-[3px] border-solid", onBlue ? "border-[#002fa7]" : "border-white")} />
        <span className="absolute left-[19px] top-[6px] h-[7px] w-[7px] rounded-full bg-[#f4b8c8]" />
      </span>
      <span className={cx("font-display text-[20px] font-semibold leading-[26px] tracking-[-0.03em]", onBlue ? "text-white" : "text-[#101115]")}>Lokal Lens</span>
    </span>
  );
}

/* ---------------------------------------------------------------- Button */
const buttonBase = "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-[12px] font-display font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002fa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed";
const buttonSizes = {
  m: "h-12 gap-2 px-[22px] text-[15px] leading-5",
  s: "h-11 gap-2 px-4 text-[14px] leading-[18px]",
};
const buttonTypes = {
  primary: "bg-[#002fa7] text-white hover:bg-[#00248a] active:bg-[#001b6b] disabled:bg-[#e4e3de] disabled:text-[#9a9ba1]",
  secondary: "border border-[#bdbcb5] bg-white text-[#101115] hover:border-[#101115] hover:bg-[#f7f7f4] active:bg-[#e4e3de] disabled:border-[#bdbcb5] disabled:bg-[#e4e3de] disabled:text-[#9a9ba1]",
  ghost: "text-[#002fa7] hover:bg-[#e6ebf7] active:bg-[#d6def2] disabled:text-[#9a9ba1] disabled:hover:bg-transparent",
  onblue: "bg-white text-[#002fa7] hover:bg-[#f1f1ee] active:bg-[#e4e3de]",
};

export function Button({ type = "primary", size = "m", href, children, className = "", icon, trailingIcon, htmlType = "button", ...props }) {
  const classes = cx(buttonBase, buttonSizes[size], buttonTypes[type], className);
  const content = <>{icon}{children}{trailingIcon}</>;
  if (href) return <Link href={href} className={classes} {...props}>{content}</Link>;
  return <button type={htmlType} className={classes} {...props}>{content}</button>;
}

/* 44 x 44 round icon button (Save, share, etc.). */
export function IconButton({ label, children, className = "", ...props }) {
  return (
    <button type="button" aria-label={label} className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#dcdbd5] bg-white text-[#101115] transition-colors hover:border-[#101115] hover:bg-[#f7f7f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002fa7] focus-visible:ring-offset-2", className)} {...props}>{children}</button>
  );
}

/* ----------------------------------------------------------- Eyebrow, text */
// DM Mono Medium 12 / 16, tracking 6%, upper case.
export function Eyebrow({ children, className = "", as: Tag = "p" }) {
  return <Tag className={cx("font-eyebrow", "text-[#002fa7]", className)}>{children}</Tag>;
}

/* ----------------------------------------------------------------- Badges */
const badgeTones = {
  verified: "bg-[#e7f4e5] text-[#2b7a26]",
  live: "bg-[#e7f4e5] text-[#2b7a26]",
  open: "bg-[#e7f4e5] text-[#2b7a26]",
  sponsored: "border border-[#bdbcb5] bg-white text-[#101115]",
  sample: "bg-[#f4b8c8] text-[#101115]",
  new: "bg-[#e6ebf7] text-[#002fa7]",
  pending: "bg-[#fbf0d9] text-[#8a5a00]",
  closing: "bg-[#fbf0d9] text-[#8a5a00]",
  closed: "bg-[#fce9e7] text-[#b42318]",
};
const dotTones = { open: "bg-[#4eae47]", closing: "bg-[#8a5a00]", closed: "bg-[#b42318]" };
const badgeIcons = { verified: BadgeCheck, live: BadgeCheck, sponsored: Megaphone, new: Sparkles, pending: Clock3 };

export function Badge({ tone = "verified", children, icon, className = "" }) {
  const Icon = badgeIcons[tone];
  const dot = dotTones[tone];
  return (
    <span className={cx("inline-flex items-center gap-[6px] rounded-full py-1 pl-2 pr-[10px] font-display text-[13px] font-medium leading-[18px]", badgeTones[tone], className)}>
      {dot ? <span className={cx("ml-0 h-2 w-2 rounded-full", dot)} /> : icon ?? (Icon ? <Icon size={16} aria-hidden="true" /> : null)}
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- Rating */
export function Rating({ value, count, className = "" }) {
  if (!Number(value)) return <span className={cx("inline-flex items-center gap-1 text-[14px] leading-5 text-[#6e7079]", className)}><Star size={16} className="text-[#bdbcb5]" aria-hidden="true" />No reviews yet</span>;
  return (
    <span className={cx("inline-flex items-center gap-1 text-[14px] leading-5", className)} aria-label={`Rated ${Number(value).toFixed(1)} out of 5`}>
      <Star size={16} className="fill-[#002fa7] text-[#002fa7]" aria-hidden="true" />
      <span className="font-semibold text-[#101115]">{Number(value).toFixed(1)}</span>
      {count ? <span className="text-[#6e7079]">({Number(count).toLocaleString("en-IN")} reviews)</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ Field */
// Label above the field (Poppins Medium 14/20), field 48px high, radius 10, border #bdbcb5. Helper DM Sans 14/20.
export const fieldClass = "h-12 w-full rounded-[10px] border border-[#bdbcb5] bg-white px-[14px] font-body text-[16px] leading-6 text-[#101115] outline-none transition-[border-color,box-shadow] placeholder:text-[#6e7079] hover:border-[#101115] focus:border-2 focus:border-[#002fa7] focus:px-[13px] disabled:border-[#bdbcb5] disabled:bg-[#e4e3de]";
export const labelClass = "font-display text-[14px] font-medium leading-5 text-[#101115]";

export function Field({ label, optional, required, helper, error, children, className = "" }) {
  return (
    <label className={cx("flex flex-col gap-[6px]", className)}>
      {label ? <span className={labelClass}>{label}{required ? <span className="ml-0.5 text-[#b42318]" aria-hidden="true">*</span> : null}{optional ? <span className="font-normal text-[#6e7079]"> (optional)</span> : null}</span> : null}
      {children}
      {error ? <span role="alert" className="text-[14px] leading-5 text-[#b42318]">{error}</span> : helper ? <span className="text-[14px] leading-5 text-[#6e7079]">{helper}</span> : null}
    </label>
  );
}

/* ------------------------------------------------------------------- Chip */
export function Chip({ selected, children, className = "", ...props }) {
  return (
    <button type="button" aria-pressed={selected} className={cx("inline-flex h-10 items-center gap-1.5 rounded-full border px-[14px] font-display text-[14px] font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002fa7] focus-visible:ring-offset-2", selected ? "border-[#002fa7] bg-[#e6ebf7] text-[#002fa7]" : "border-[#dcdbd5] bg-white text-[#101115] hover:border-[#101115]", className)} {...props}>{children}</button>
  );
}

/* ---------------------------------------------------------- Page containers */
// Page content: 12 columns, 1296 max content (72px margins on a 1440 screen), 32 margin on tablet, 16 on mobile.
export function Container({ className = "", children, as: Tag = "div" }) {
  return <Tag className={cx("mx-auto w-full max-w-[1296px] px-4 md:px-8 min-[1392px]:px-0", className)}>{children}</Tag>;
}

// Header and footer bars: 48px side margin on a 1440 screen, content width 1344.
export function BarContainer({ className = "", children, as: Tag = "div" }) {
  return <Tag className={cx("mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12", className)}>{children}</Tag>;
}
