(() => {
  const LONG = "A friendly neighbourhood cafe serving fresh coffee, breakfast and snacks every day, with a calm seating area and helpful staff.";
  const els = [...document.querySelectorAll('input,textarea,select')].filter((e) => e.getBoundingClientRect().width > 0 && !['hidden', 'file', 'checkbox', 'radio'].includes(e.type) && !e.closest('aside,nav'));
  const set = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  const log = [];
  for (const el of els) {
    const first = (el.closest('label')?.innerText || '').split('\n')[0];
    const lab = (first || ((el.getAttribute('aria-label') || '') + ' ' + (el.placeholder || ''))).toLowerCase();
    let v = null;
    if (el.tagName === 'SELECT') {
      if (/also listed|add category/.test(lab)) continue;
      if (/optional/.test(lab)) continue;
      const cur = el.options[el.selectedIndex];
      if (cur && cur.value && !/^(choose|select|\+)/i.test(cur.text.trim())) continue;
      const want = /state/.test(lab) ? 'Uttar Pradesh' : /city/.test(lab) ? 'Ghaziabad' : null;
      const opt = [...el.options].find((o) => o.value && !/^(choose|select|\+)/i.test(o.text.trim()) && (!want || o.text.includes(want)) && (!/category/.test(lab) || /^(Cafes & Restaurants|Healthcare)( ›|$)/.test(o.text.trim())));
      if (opt) v = opt.value;
    } else {
      if (el.value) continue;
      if (/optional/.test(lab) && !/area|locality/.test(lab)) continue;
      if (/service|product|item/.test(lab) && /name|service/.test(lab) && !/price/.test(lab)) v = 'Cold coffee';
      else if (/price/.test(lab)) v = '120';
      else if (/business name|^name/.test(lab)) v = 'Browser Test Cafe';
      else if (/description|what you do/.test(lab)) v = LONG;
      else if (/whatsapp|phone|mobile/.test(lab)) v = '9876543210';
      else if (/email/.test(lab)) v = 'cafe@e2e.test';
      else if (/pin|postal/.test(lab)) v = '201001';
      else if (/address line 1|line 1|street|address/.test(lab)) v = '12 Main Road';
      else if (/locality|area|neighbourhood/.test(lab)) v = 'Indirapuram';
      else if (/city/.test(lab)) v = 'Ghaziabad';
      else if (/state/.test(lab)) v = 'Uttar Pradesh';
    }
    if (v !== null) { set(el, v); log.push(lab.trim().slice(0, 26) + '=' + String(v).slice(0, 14)); }
  }
  return JSON.stringify(log);
})()
