// @ts-check
import { el } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { t } from '../i18n.js';

/**
 * Persistent SOS button. Hold 2s → tel:112 + share live location via
 * WhatsApp (or Web Share API) to a trusted contact set at first use.
 *
 * @param {() => string} getLang
 * @param {{ emergency?: string }} [opts]
 */
export function mountSos(getLang, opts = {}) {
  const btn = el(
    'button',
    {
      type: 'button',
      id: 'sos-btn',
      class: 'sos-btn',
      'aria-label': 'SOS',
    },
    'SOS'
  );
  document.body.appendChild(btn);

  let holdTimer = 0;
  const HOLD_MS = 2000;
  const emergency = opts.emergency || 'tel:112';

  function trigger() {
    const lang = getLang();
    toast(t(lang, 'sos.firing'));
    // 1) Dial emergency immediately.
    window.location.href = emergency;
    // 2) Share location (best-effort).
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => shareLocation(pos.coords.latitude, pos.coords.longitude, lang),
        () => {
          /* denied: nothing extra to share */
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
      );
    }
  }

  btn.addEventListener('pointerdown', () => {
    btn.classList.add('arm');
    holdTimer = window.setTimeout(() => {
      btn.classList.remove('arm');
      trigger();
    }, HOLD_MS);
  });
  const cancel = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = 0;
      btn.classList.remove('arm');
    }
  };
  btn.addEventListener('pointerup', cancel);
  btn.addEventListener('pointerleave', cancel);
  btn.addEventListener('pointercancel', cancel);

  return btn;
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {string} lang
 */
function shareLocation(lat, lng, lang) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const text = `${t(lang, 'sos.emergency')}\n${mapsUrl}`;

  // Trusted contacts: ask on first use.
  const contactsRaw = localStorage.getItem('saathi.contacts');
  let contacts = [];
  try {
    contacts = contactsRaw ? JSON.parse(contactsRaw) : [];
  } catch {
    contacts = [];
  }
  if (!contacts.length) {
    const num = prompt(t(lang, 'sos.askContact'));
    if (num && /^[+0-9]{8,15}$/.test(num.replace(/\s|-/g, ''))) {
      contacts = [num.replace(/\s|-/g, '')];
      localStorage.setItem('saathi.contacts', JSON.stringify(contacts));
    }
  }

  // Try Web Share first.
  if (navigator.share) {
    navigator.share({ title: 'Saathi SOS', text }).catch(() => fallbackWhatsapp(contacts, text));
    return;
  }
  fallbackWhatsapp(contacts, text);
}

/** @param {string[]} contacts @param {string} text */
function fallbackWhatsapp(contacts, text) {
  if (contacts.length) {
    for (const num of contacts) {
      window.open(`https://wa.me/${num.replace(/^\+/, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }
}
