import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indianPincodes = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'pincode.json'), 'utf8')
);

const COUNTRY = {
  code: 'IN',
  name: 'India',
  iso3: 'IND',
};

const PIN_LENGTH = 6;


const normalizeName = (value = '') => value.replace(/\s+/g, ' ').trim();
const toStateCode = (name = '') => normalizeName(name).replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toUpperCase();

const stateAccumulator = {};
const ZIP_LOOKUP = {};

Object.entries(indianPincodes || {}).forEach(([stateName, districts]) => {
  const cleanStateName = normalizeName(stateName);
  if (!cleanStateName) return;
  const stateCode = toStateCode(cleanStateName);
  if (!stateAccumulator[stateCode]) {
    stateAccumulator[stateCode] = {
      code: stateCode,
      name: cleanStateName,
      cities: new Set(),
    };
  }

  Object.entries(districts || {}).forEach(([districtName, localityMap]) => {
    const cleanDistrict = normalizeName(districtName);
    if (!cleanDistrict) return;

    stateAccumulator[stateCode].cities.add(cleanDistrict);

    Object.entries(localityMap || {}).forEach(([localityName, pinValue]) => {
      const cleanLocality = normalizeName(localityName);
      const normalizedPin = normalizeZip(pinValue);
      if (!cleanLocality || !normalizedPin) return;

      if (!ZIP_LOOKUP[normalizedPin]) {
        ZIP_LOOKUP[normalizedPin] = {
          stateCode,
          stateName: cleanStateName,
          city: cleanDistrict,
          locality: cleanLocality,
        };
      }
    });
  });
});

const STATE_MAP = Object.entries(stateAccumulator).reduce((acc, [code, value]) => {
  acc[code] = {
    code,
    name: value.name,
    cities: Array.from(value.cities).sort((a, b) => a.localeCompare(b)),
  };
  return acc;
}, {});

const STATE_LIST = Object.values(STATE_MAP)
  .map(({ code, name }) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getCountryByZip(zip) {
  const normalizedZip = normalizeZip(zip);
  const location = ZIP_LOOKUP[normalizedZip];
  const state = location ? STATE_MAP[location.stateCode] : undefined;
  return {
    countryName: COUNTRY.name,
    countryCode: COUNTRY.code,
    countryIso3: COUNTRY.iso3,
    stateCode: state?.code ?? location?.stateCode ?? null,
    stateName: state?.name ?? location?.stateName ?? null,
    city: location?.city ?? null,
    locality: location?.locality ?? null,
  };
}

export function getStatesByCountry(countryCode) {
  if (!countryCode) return [];
  const normalized = countryCode.trim().toUpperCase();
  if (normalized !== COUNTRY.code && normalized !== COUNTRY.iso3 && normalized !== COUNTRY.name.toUpperCase()) {
    return [];
  }
  return STATE_LIST;
}

export function getCitiesByState(stateCode) {
  if (!stateCode) return [];
  const normalized = stateCode.trim().toUpperCase();
  const state = STATE_MAP[normalized];
  if (!state) return [];
  return state.cities;
}

export function normalizeZip(zip) {
  return String(zip || '')
    .trim()
    .replace(/[^0-9]/g, '')
    .padStart(PIN_LENGTH, '0')
    .slice(0, PIN_LENGTH);
}

export const LocationData = {
  COUNTRY,
  STATES: STATE_LIST,
  ZIP_LOOKUP,
};
