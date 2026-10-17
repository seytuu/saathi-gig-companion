// @ts-check
import { AppError } from '../errors.js';
import { logger } from '../utils/logger.js';

const PLACE_TYPES = {
  toilet: 'public_bathroom',
  hospital: 'hospital',
  police: 'police',
  pharmacy: 'pharmacy',
  petrol: 'gas_station',
  ev: 'electric_vehicle_charging_station',
  atm: 'atm',
};

/**
 * Server-side proxy for Places API (New) :searchNearby.
 * Query: ?category=hospital&lat=30.70&lng=76.73&radius=1500
 * Falls back to a Google Maps deep link when the key is missing or the
 * call fails, so the client always has something tappable.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function nearby(req, res) {
  const category = String(req.query.category || '').toLowerCase();
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Math.min(Number(req.query.radius) || 1500, 5000);

  if (!PLACE_TYPES[category]) throw AppError.badRequest('nearby category');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw AppError.badRequest('nearby coords');

  const key = process.env.GOOGLE_MAPS_API_KEY;
  const deepLink = `https://www.google.com/maps/search/${encodeURIComponent(category)}/@${lat},${lng},14z`;

  if (!key) {
    logger.info('nearby_fallback_nokey', { category });
    return res.json({ places: [], fallback: deepLink, source: 'fallback' });
  }

  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'places.displayName,places.formattedAddress,places.location,places.rating,places.googleMapsUri,places.currentOpeningHours.openNow',
      },
      body: JSON.stringify({
        includedTypes: [PLACE_TYPES[category]],
        maxResultCount: 10,
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius },
        },
      }),
    });
    if (!r.ok) {
      logger.warn('nearby_upstream_error', { status: r.status });
      return res.json({ places: [], fallback: deepLink, source: 'fallback' });
    }
    const data = await r.json();
    const places = (data.places || []).map((p) => ({
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      rating: p.rating,
      openNow: p.currentOpeningHours?.openNow,
      mapsUri: p.googleMapsUri,
    }));
    res.json({ places, fallback: deepLink, source: 'google' });
  } catch (err) {
    logger.warn('nearby_fetch_failed', { msg: /** @type {Error} */ (err).message });
    res.json({ places: [], fallback: deepLink, source: 'fallback' });
  }
}
