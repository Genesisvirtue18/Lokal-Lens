// Cleans the city / locality / state of a business address so city filters and the city picker work.
// "DELHI", "delhi" and "New delhi" become "New Delhi"; a neighbourhood typed in the city field ("Anand Vihar",
// "Sector 18, Noida") moves to locality and the real city is filled in.

const trimNoise = (value) => String(value ?? '').replace(/\s+/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '').trim();
const titleCase = (value) => value.toLowerCase().replace(/(^|[\s(-])([a-zà-ÿ])/g, (_m, lead, letter) => lead + letter.toUpperCase());
const blankToUndefined = (value) => (value === '' ? undefined : value);

const GOTHENBURG_AREA = /^(agnesberg|angered|göteborg|goteborg|gothenburg|västra frölunda|vastra frolunda|hisings backa|mölndal|molndal)$/i;
const EMIRATES = new Set(['abu dhabi', 'sharjah', 'dubai', 'ajman', 'fujairah', 'ras al khaimah', 'umm al quwain']);

export function normalizeAddress({ city, state, locality, country } = {}) {
  let nextCity = trimNoise(city);
  let nextState = trimNoise(state);
  let nextLocality = trimNoise(locality);
  const nextCountry = trimNoise(country).toUpperCase() || undefined;
  const lower = nextCity.toLowerCase();

  // Gothenburg suburbs
  if (GOTHENBURG_AREA.test(nextCity)) {
    if (nextCity.toLowerCase() !== 'göteborg' && !nextLocality) nextLocality = titleCase(nextCity);
    nextCity = 'Göteborg'; nextState = nextState || 'Västra Götaland';
  } else if (EMIRATES.has(nextState.toLowerCase()) && !nextCity) {
    nextCity = nextState; // the emirate is the best city we have
  } else if (nextState.toLowerCase() === 'delhi' || /^(new )?delhi$/.test(lower)) {
    // Everything in Delhi is shown under one city; the neighbourhood is kept as locality.
    const isDelhiName = /^(new )?delhi$/.test(lower);
    if (!isDelhiName && nextCity) {
      const neighbourhood = /karkardooma/i.test(nextCity) ? 'Karkardooma' : nextCity;
      if (!nextLocality) nextLocality = titleCase(neighbourhood);
    }
    nextCity = 'New Delhi'; nextState = 'Delhi';
  } else if (/greater noida/.test(lower)) {
    nextCity = 'Greater Noida'; nextState = nextState || 'Uttar Pradesh';
  } else if (/\bnoida\b/.test(lower)) {
    const rest = trimNoise(nextCity.replace(/noida/i, ''));
    if (rest && !nextLocality) nextLocality = rest;
    nextCity = 'Noida'; nextState = nextState || 'Uttar Pradesh';
  } else if (/ghaziabad|vasundhara|indirapuram|vaishali|kaushambi/.test(lower)) {
    const rest = trimNoise(nextCity.replace(/ghaziabad/i, ''));
    if (rest && !nextLocality) nextLocality = rest;
    nextCity = 'Ghaziabad'; nextState = nextState || 'Uttar Pradesh';
  } else if (lower === 'gomti nagar') {
    nextLocality = nextLocality || 'Gomti Nagar'; nextCity = 'Lucknow'; nextState = nextState || 'Uttar Pradesh';
  } else if (nextCity && nextCity === nextCity.toUpperCase() && /[A-Z]/.test(nextCity)) {
    nextCity = titleCase(nextCity);
  }

  return { city: blankToUndefined(nextCity), state: blankToUndefined(nextState), locality: blankToUndefined(nextLocality), country: nextCountry };
}
