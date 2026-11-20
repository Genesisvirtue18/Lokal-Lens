// One rule for every place a new password is chosen (sign up, reset, change). The server enforces the same rule.
export const PASSWORD_HINT = "At least 8 characters, with a letter, a number and a special character (like ! @ # or -).";

/** Returns what is wrong with a new password, or an empty string when it is fine. */
export function passwordProblem(value) {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(value)) return "Add at least one letter.";
  if (!/\d/.test(value)) return "Add at least one number.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Add at least one special character, like ! @ # or -.";
  return "";
}
