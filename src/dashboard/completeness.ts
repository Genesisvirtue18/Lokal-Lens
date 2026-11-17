// One definition of "profile completeness", used by the owner dashboard and by the edit form, so both always show the same number.
export type CompletenessInput = {
  name?: string; category?: string; description?: string;
  phone?: string; email?: string;
  addressLine1?: string; city?: string; state?: string; postalCode?: string;
  services?: number; openDays?: number; photos?: number;
  website?: string; verified?: boolean;
};

export type Section = { id: string; label: string; hint: string; done: boolean };

export function completenessSections(input: CompletenessInput): Section[] {
  const filled = (value?: string) => Boolean(value && value.trim());
  return [
    { id: 'basics', label: 'Business name and category', hint: 'Tell customers what you are.', done: filled(input.name) && filled(input.category) },
    { id: 'about', label: 'A detailed description', hint: 'Write at least 80 characters about what you offer.', done: (input.description || '').trim().length >= 80 },
    { id: 'contact', label: 'Phone and email', hint: 'So customers can reach you.', done: filled(input.phone) && filled(input.email) },
    { id: 'address', label: 'Full address with PIN code', hint: 'Street, city, state and PIN code.', done: filled(input.addressLine1) && filled(input.city) && filled(input.state) && filled(input.postalCode) },
    { id: 'services', label: 'At least 3 services', hint: 'List what you sell or do.', done: (input.services || 0) >= 3 },
    { id: 'hours', label: 'Opening hours', hint: 'Open at least one day.', done: (input.openDays || 0) >= 1 },
    { id: 'photos', label: 'At least 5 photos', hint: 'Listings with photos get far more calls.', done: (input.photos || 0) >= 5 },
    { id: 'website', label: 'Website or online link', hint: 'Add your website so people can learn more.', done: filled(input.website) },
    { id: 'verified', label: 'Verification', hint: 'Confirm your email and address.', done: Boolean(input.verified) },
  ];
}

export function completenessPercent(sections: Section[]): number {
  return Math.round((sections.filter((section) => section.done).length / sections.length) * 100);
}
