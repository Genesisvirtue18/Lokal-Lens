import { Lead } from './types';

const digits = (value = '') => value.replace(/[^0-9]/g, '');

// wa.me needs the country code. Indian 10-digit numbers get 91 in front.
export function whatsappLink(lead: Pick<Lead, 'name' | 'phone' | 'service' | 'targetBusiness'>): string {
  const number = digits(lead.phone);
  const full = number.length === 10 ? `91${number}` : number.length === 11 && number.startsWith('0') ? `91${number.slice(1)}` : number;
  const first = (lead.name || '').trim().split(/\s+/)[0] || 'there';
  const about = lead.service ? ` about ${lead.service}` : '';
  const text = `Hi ${first}, this is ${lead.targetBusiness || 'our team'}. Thanks for your inquiry${about} on Lokal Lens. How can we help you?`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}
