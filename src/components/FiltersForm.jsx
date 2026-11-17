"use client";

// Directory filter form: ticking a box, picking a radio or choosing from a list applies the filter straight away.
// Text boxes still apply on Enter, and the Apply button stays as a fallback.
export default function FiltersForm({ children, ...props }) {
  return (
    <form
      {...props}
      onChange={(event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement && (target.type === "checkbox" || target.type === "radio")) event.currentTarget.requestSubmit();
        else if (target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
