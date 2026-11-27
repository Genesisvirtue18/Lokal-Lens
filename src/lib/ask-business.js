// Takes the visitor to the inquiry form on the business page with the question already written (and a service chosen, if there is one),
// and makes it obvious where to continue: the form flashes blue and the cursor lands in the message box.
export function askBusiness(event, { message = "", service = "" } = {}) {
  const form = document.getElementById("contact");
  if (!form) return false;                       // no form on this page: let the link behave as a normal #contact link
  event?.preventDefault?.();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  const select = form.querySelector("select[name=service]");
  if (select && service && [...select.options].some((option) => option.value === service)) select.value = service;
  const box = form.querySelector("textarea[name=message]");
  if (box && message && !box.value.trim()) box.value = message;
  form.style.transition = "box-shadow 200ms ease";
  form.style.boxShadow = "0 0 0 3px #002fa7";
  window.setTimeout(() => { form.style.boxShadow = ""; box?.focus({ preventScroll: true }); }, 900);
  return true;
}
