// @ts-check
import { store } from '../store.js';
import { t } from '../i18n.js';
import { el, render } from '../ui/dom.js';
import { card } from '../ui/card.js';
import { emptyState } from '../ui/emptyState.js';
import { renderConditionsCard } from './conditions.js';
import { helplinesCard } from './safety.js';
import { openBolo } from './bolo.js';

/**
 * @param {HTMLElement} panel
 * @param {(mode:string, opts?:any) => void} onNavigate
 * @param {{helplines?: any[]}} [publicConfig]
 */
export function renderHome(panel, onNavigate, publicConfig) {
  const s = store.get();
  const profile = s.profile;
  const lang = profile?.language || 'English';
  const name = profile?.name || '';

  const greeting = card({
    title: `${t(lang, 'home.greeting')}${name ? ', ' + name : ''}`,
    subtitle: profile ? `${profile.workType} • ${profile.platform} • ${profile.city}` : '',
    children: [el('p', { class: 'muted' }, t(lang, 'tagline'))],
  });

  // Weekly earnings quick stat
  const weekly = weeklyNet(s.ledger);
  const earnCard = card({
    title: '💰 ' + t(lang, 'tabs.earnings'),
    children: [
      s.ledger.length === 0
        ? emptyState(t(lang, 'earnings.ledgerEmpty'))
        : el('div', { class: 'kv' }, [
            kv(t(lang, 'earnings.weekSoFar'), '₹' + weekly.net.toLocaleString('en-IN'), true),
            kv(t(lang, 'earnings.col.orders'), String(weekly.orders)),
          ]),
    ],
    actions: [
      actionBtn(t(lang, 'earnings.title'), () => onNavigate('earnings'), 'primary'),
    ],
  });

  const openGriev = s.grievances.filter((g) => g.status === 'open');
  const grievCard = card({
    title: '✉️ ' + t(lang, 'home.openGrievances'),
    children: openGriev.length === 0
      ? [emptyState('—')]
      : openGriev.map((g) =>
          el('div', { class: 'item' }, [
            el('div', { class: 'item-label' }, g.subject || 'Grievance'),
            el(
              'div',
              { class: 'muted' },
              new Date(g.createdAt).toLocaleDateString()
            ),
          ])
        ),
  });

  const quick = card({
    title: t(lang, 'home.quick'),
    children: [
      el('div', { class: 'actions' }, [
        actionBtn('🛟 ' + t(lang, 'tabs.safety'), () => onNavigate('safety')),
        actionBtn('📍 ' + t(lang, 'nearby.title'), () => onNavigate('nearby')),
        actionBtn('🚫 ' + t(lang, 'scam.title'), () => onNavigate('scam')),
        actionBtn('🪪 ' + t(lang, 'tabs.schemes'), () => onNavigate('schemes')),
        actionBtn('📄 ' + t(lang, 'tabs.document'), () => onNavigate('document')),
      ]),
    ],
  });

  const timeline = card({
    title: t(lang, 'home.recent'),
    children: s.timeline.length === 0
      ? [emptyState(t(lang, 'home.empty'))]
      : s.timeline.slice(0, 8).map((ev) =>
          el('div', { class: 'item' }, [
            el('div', { class: 'item-label' }, labelFor(ev.kind)),
            el('div', { class: 'muted' }, new Date(ev.at).toLocaleString()),
          ])
        ),
  });

  // Primary CTA: big Bolo button so voice is the first thing users see.
  const boloBtn = el(
    'button',
    { type: 'button', class: 'bolo-primary', 'aria-label': t(lang, 'bolo.primaryAria') },
    [el('span', { class: 'bolo-primary-icon', 'aria-hidden': 'true' }, '🎤'), el('span', { class: 'bolo-primary-label' }, t(lang, 'bolo.primary'))]
  );
  boloBtn.addEventListener('click', () => openBolo(onNavigate));
  const boloCard = card({ children: [boloBtn, el('p', { class: 'muted', style: 'text-align:center;margin:8px 0 0' }, t(lang, 'bolo.primaryHint'))] });

  const nodes = [greeting, boloCard];
  if (profile) nodes.push(renderConditionsCard(profile));
  nodes.push(earnCard, grievCard, quick);
  if (publicConfig?.helplines?.length) {
    nodes.push(helplinesCard(publicConfig.helplines, lang));
  }
  nodes.push(timeline);
  render(panel, ...nodes);
}

function kv(k, v, strong) {
  return el('div', { class: 'kv-row' }, [
    el('div', { class: 'kv-k' }, k),
    el('div', { class: 'kv-v' + (strong ? ' kv-strong' : '') }, v),
  ]);
}

/** @param {any[]} ledger */
function weeklyNet(ledger) {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let net = 0;
  let orders = 0;
  for (const e of ledger) {
    const ts = Date.parse(e.date) || e.createdAt || Date.now();
    if (ts < since) continue;
    net += Number(e.net) || 0;
    orders += Number(e.orders) || 0;
  }
  return { net, orders };
}

function actionBtn(label, onClick, cls = 'secondary') {
  const b = el('button', { type: 'button', class: cls }, label);
  b.addEventListener('click', onClick);
  return b;
}

function labelFor(kind) {
  const map = {
    profile_saved: 'Profile saved',
    grievance_created: 'Grievance drafted',
    grievance_updated: 'Grievance updated',
    scheme_saved: 'Scheme saved',
    document_added: 'Document added',
    ledger_added: 'Earnings logged',
  };
  return map[kind] || kind;
}
