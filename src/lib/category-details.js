// Shared wording for "Category details" answers.

/** The questions for a chosen category and subcategory (the subcategory's own come first), without repeats. */
export function questionsFor(categories, categoryId, subcategoryId) {
  const root = categories.find((item) => item._id === categoryId);
  const child = root?.children?.find((item) => item._id === subcategoryId);
  const seen = new Set();
  return [...(child?.fields || []), ...(root?.fields || [])].filter((field) => !seen.has(field.key) && seen.add(field.key));
}

/** One answer as readable text: "CBSE, ICSE", "₹600", "12 years". */
export function answerText({ values = [], unit = "" }) {
  const joined = values.join(", ");
  if (!joined || !unit) return joined;
  if (unit.startsWith("₹")) {
    const amount = /^\d+$/.test(joined) ? Number(joined).toLocaleString("en-IN") : joined;
    return `₹${amount}${unit.slice(1)}`;
  }
  return `${joined} ${unit}`;
}
