// @ts-check
import { AppError } from '../errors.js';
import { logger } from '../utils/logger.js';

/**
 * Server-side proxy for weather + air quality + geocoding.
 * Query: ?lat=&lng=  or  ?city=Mohali
 * Primary: Google Weather API + Air Quality API + Geocoding API.
 * Fallback: Open-Meteo (weather) when the key is missing or Google fails.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function conditions(req, res) {
  let lat = Number(req.query.lat);
  let lng = Number(req.query.lng);
  const city = typeof req.query.city === 'string' ? req.query.city : '';
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && city) {
    const geo = await geocode(city, key).catch(() => null);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw AppError.badRequest('conditions: need lat/lng or city');
  }

  // Try Google first; fall back to Open-Meteo per-dimension.
  const [weather, air] = await Promise.all([googleWeather(lat, lng, key), googleAir(lat, lng, key)]);

  const w = weather || (await openMeteo(lat, lng).catch(() => null));
  if (!w) throw AppError.upstream('conditions unavailable');

  const tips = buildTips(w, air);
  res.json({
    source: { weather: weather ? 'google' : 'open-meteo', air: air ? 'google' : 'none' },
    weather: w,
    air,
    tips,
  });
}

/**
 * @param {string} city
 * @param {string|undefined} key
 */
async function geocode(city, key) {
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city + ', India')}&key=${key}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  const loc = data.results?.[0]?.geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lng: loc.lng };
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {string|undefined} key
 */
async function googleWeather(lat, lng, key) {
  if (!key) return null;
  try {
    const r = await fetch(
      `https://weather.googleapis.com/v1/currentConditions:lookup?key=${key}&location.latitude=${lat}&location.longitude=${lng}`
    );
    if (!r.ok) {
      logger.warn('weather_google_status', { status: r.status });
      return null;
    }
    const d = await r.json();
    return {
      tempC: d.temperature?.degrees,
      feelsLikeC: d.feelsLikeTemperature?.degrees,
      description: d.weatherCondition?.description?.text || d.weatherCondition?.type,
      humidity: d.relativeHumidity,
      precipitationProb: d.precipitation?.probability?.percent,
    };
  } catch (e) {
    logger.warn('weather_google_fail', { msg: /** @type {Error} */ (e).message });
    return null;
  }
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {string|undefined} key
 */
async function googleAir(lat, lng, key) {
  if (!key) return null;
  try {
    const r = await fetch(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: { latitude: lat, longitude: lng } }),
      }
    );
    if (!r.ok) {
      logger.warn('air_google_status', { status: r.status });
      return null;
    }
    const d = await r.json();
    const idx = (d.indexes || [])[0];
    return {
      aqi: idx?.aqi,
      category: idx?.category,
      dominantPollutant: idx?.dominantPollutant,
    };
  } catch (e) {
    logger.warn('air_google_fail', { msg: /** @type {Error} */ (e).message });
    return null;
  }
}

/**
 * @param {number} lat
 * @param {number} lng
 */
async function openMeteo(lat, lng) {
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,weather_code`
  );
  if (!r.ok) return null;
  const d = await r.json();
  const c = d.current || {};
  return {
    tempC: c.temperature_2m,
    feelsLikeC: c.apparent_temperature,
    description: codeToDesc(c.weather_code),
    humidity: c.relative_humidity_2m,
    precipitationProb: c.precipitation_probability,
  };
}

/** @param {number} code */
function codeToDesc(code) {
  if (code === 0) return 'Clear';
  if (code === 1 || code === 2) return 'Mostly clear';
  if (code === 3) return 'Cloudy';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 86) return 'Snow';
  if (code >= 95) return 'Thunderstorm';
  return 'Variable';
}

/**
 * Rule-based tips. No AI — safe to show immediately.
 * @param {{tempC?:number, description?:string, precipitationProb?:number}} w
 * @param {{aqi?:number}|null} air
 */
function buildTips(w, air) {
  const tips = [];
  if (typeof w.tempC === 'number' && w.tempC >= 40) {
    tips.push('🌡 Heatwave: carry water, take a break every hour, wear light clothes.');
  }
  if (typeof w.precipitationProb === 'number' && w.precipitationProb >= 50) {
    tips.push('🌧 Rain likely: carry a rain cover, slow down on wet roads.');
  }
  if ((w.description || '').toLowerCase().includes('fog')) {
    tips.push('🌫 Fog: use hazard lights, keep distance, avoid highways if visibility is low.');
  }
  if (air && typeof air.aqi === 'number' && air.aqi >= 200) {
    tips.push('😷 Air is unhealthy (AQI ' + air.aqi + '). Wear a mask; avoid long rides if you can.');
  }
  return tips;
}
