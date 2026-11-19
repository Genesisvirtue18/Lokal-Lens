(() => {
  const errs = [...document.querySelectorAll('[role=alert]')].map((e) => e.innerText.trim()).filter(Boolean).slice(0, 6);
  const red = [...document.querySelectorAll('p,span')].filter((e) => getComputedStyle(e).color === 'rgb(180, 35, 24)' && e.innerText.trim()).map((e) => e.innerText.trim()).slice(0, 8);
  const fields = [...document.querySelectorAll('input,textarea,select')].filter((e) => e.getBoundingClientRect().width > 0 && e.type !== 'hidden' && !e.closest('aside,nav')).map((e) => ((e.closest('label')?.innerText || e.getAttribute('aria-label') || e.placeholder || e.type).split('\n')[0]).slice(0, 24) + (e.value ? '' : ' (empty)'));
  const step = (document.body.innerText.match(/STEP \d OF \d/) || [''])[0];
  const btns = [...document.querySelectorAll('button')].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('aside,nav')).map((e) => (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 24)).filter(Boolean);
  return JSON.stringify({ step, errs, red, fields, btns });
})()
