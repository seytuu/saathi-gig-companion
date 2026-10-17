// @ts-check
import { card } from '../ui/card.js';
import { el, render } from '../ui/dom.js';
import { t } from '../i18n.js';

/**
 * @param {HTMLElement} panel
 * @param {string} lang
 * @param {string} label
 */
export function renderComingSoon(panel, lang, label) {
  render(
    panel,
    card({
      title: label,
      subtitle: t(lang, 'generic.comingSoon'),
      children: [
        el(
          'p',
          { class: 'muted' },
          'This module will be ready in the next milestone. The architecture already supports it — see src/modes/ in the repo.'
        ),
      ],
    })
  );
}
