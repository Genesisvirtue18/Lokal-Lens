// Owners type quickly: "world best cafe.we have pasta ,chai". This tidies how such text is SHOWN (spacing around punctuation and capital
// letters at the start of sentences). It never changes spelling or meaning, and the saved text stays exactly as the owner wrote it.
const DOMAIN_ENDINGS = "com|in|org|net|co|io|app|dev|info|biz|me|shop|store|online|site|edu|gov";

export function tidyText(value) {
  if (typeof value !== "string") return value;
  let text = value.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
  if (!text) return text;
  // no space before , . ; : ! ?   ("pasta ,chai" becomes "pasta, chai")
  text = text.replace(/ +([,.;:!?])/g, "$1");
  // a space after , ; : ! ? when a letter follows ("pasta,chai"); numbers like 3,500 and times like 9:30 are left alone
  text = text.replace(/([,;:!?])(?=[A-Za-z])/g, (match, mark, offset) => (mark === ":" && /\b(https?|ftp|mailto)$/i.test(text.slice(0, offset)) ? match : `${mark} `));
  // a space after a full stop that ends a sentence ("ingrident.we"), but not inside website names or e-mail addresses ("kutumb.com")
  text = text.replace(/([a-z]{2,})\.([a-z]{2,})/gi, (match, before, after, offset) => {
    if (new RegExp(`^(${DOMAIN_ENDINGS})$`, "i").test(after)) return match;
    if (/\S$/.test(text.slice(Math.max(0, offset - 1), offset)) && /[@/]/.test(text.slice(Math.max(0, offset - 30), offset))) return match;
    return `${before}. ${after}`;
  });
  // capital letter at the start of the text and after . ! ?
  if (!/^(https?:\/\/|www\.)/i.test(text)) text = text.replace(/^([a-z])/, (letter) => letter.toUpperCase());
  text = text.replace(/([.!?]\s+|\n)([a-z])/g, (match, lead, letter) => `${lead}${letter.toUpperCase()}`);
  return text;
}
