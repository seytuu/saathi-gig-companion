// @ts-check
import { store } from '../store.js';
import { t } from '../i18n.js';
import { el, render } from '../ui/dom.js';
import { card } from '../ui/card.js';
import { emptyState } from '../ui/emptyState.js';

/**
 * @param {HTMLElement} panel
 * @param {(mode:string, opts?:any) => void} onNavigate
 */
export function renderHome(panel, onNavigate) {
  const s = store.get();
  const profile = s.profile;
  const lang = profile?.language || 'English';
  const name = profile?.name || '';

  const greeting = card({
    title: `${t(lang, 'home.greeting')}${name ? ', ' + name : ''}`,
    subtitle: profile ? `${profile.workType} • ${profile.platform} • ${profile.city}` : '',
    children: [el('p', { class: 'muted' }, t(lang, 'tagline'))],
  });

  const openGriev = s.grievances.filter((g) => g.status === 'open');
  const grievCard = card({
    title: t(lang, 'home.openGrievances'),
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

  const quick = card({
    title: 'Quick actions',
    children: [
      el('div', { class: 'actions' }, [
        actionBtn(t(lang, 'tabs.grievance'), () => onNavigate('grievance')),
        actionBtn(t(lang, 'tabs.schemes'), () => onNavigate('schemes')),
        actionBtn(t(lang, 'tabs.earnings'), () => onNavigate('earnings')),
        actionBtn(t(lang, 'tabs.safety'), () => onNavigate('safety')),
      ]),
    ],
  });

  render(panel, greeting, grievCard, quick, timeline);
}

function actionBtn(label, onClick) {
  const b = el('button', { type: 'button', class: 'secondary' }, label);
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
