// Profil-Symbole (24×24, Strichzeichnung) als Alternative zum Anfangsbuchstaben.

export const AVATARS = {
  dart: ['Dart', '<path d="M15.8 8.2 20.5 3.5M12.2 11.8 7 17"/><path d="M16.7 9.2 14.9 7.3 11.3 10.9 13.2 12.7z"/><path d="M8.5 15.5 3 14l2 5zM8.5 15.5 10 21l-5-2z"/>'],
  target: ['Scheibe', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'],
  crosshair: ['Fadenkreuz', '<circle cx="12" cy="12" r="7"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>'],
  flame: ['Flamme', '<path d="M12 22c3.9 0 7-2.9 7-7 0-4.2-3.2-6.4-4.3-10.5C12.6 6.3 11.8 8.4 12 10.6 10.8 9.7 10 8.4 10 6.8 7.3 9 5 11.8 5 15c0 4.1 3.1 7 7 7z"/>'],
  bolt: ['Blitz', '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'],
  crown: ['Krone', '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>'],
  trophy: ['Pokal', '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'],
  star: ['Stern', '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9z"/>'],
  skull: ['Totenkopf', '<path d="M12 3a8 8 0 0 0-5 14.2V21h10v-3.8A8 8 0 0 0 12 3z"/><circle cx="9" cy="11.5" r="1.7"/><circle cx="15" cy="11.5" r="1.7"/><path d="M10.5 21v-2.5M13.5 21v-2.5"/>'],
  rocket: ['Rakete', '<path d="M12 2c3 2.2 5 6 5 10l-2 4H9l-2-4c0-4 2-7.8 5-10z"/><circle cx="12" cy="10" r="2"/><path d="M9 16l-3 4M15 16l3 4M12 16v5"/>'],
  beer: ['Bier', '<path d="M5 8h10v12H5z"/><path d="M15 11h2.5a2.5 2.5 0 0 1 0 5H15"/><path d="M5 8a3 3 0 0 1 5-2.3A3 3 0 0 1 15 8"/><path d="M8.5 11.5v5M11.5 11.5v5"/>'],
  ghost: ['Geist', '<path d="M5 21V10a7 7 0 0 1 14 0v11l-2.3-1.8-2.3 1.8-2.4-1.8-2.4 1.8-2.3-1.8z"/><circle cx="9.5" cy="10" r="1.1"/><circle cx="14.5" cy="10" r="1.1"/>'],
  paw: ['Pfote', '<circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><circle cx="17.5" cy="10" r="1.8"/><path d="M12 12c-3 0-5 3-5 5.5 0 2 2.2 2.6 5 1.6 2.8 1 5 .4 5-1.6 0-2.5-2-5.5-5-5.5z"/>'],
  shield: ['Schild', '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'],
  heart: ['Herz', '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>'],
  music: ['Musik', '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'],
  eye: ['Adlerauge', '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'],
  sun: ['Sonne', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'],
};

const svg = path => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

export function avatarSvg(key) {
  return AVATARS[key] ? svg(AVATARS[key][1]) : '';
}

/** Avatar-Kachel: Symbol, falls gewählt, sonst Anfangsbuchstabe. */
export function avatar(p, cls = '') {
  const letter = String(p.name || '?').trim().charAt(0).toUpperCase() || '?';
  const inner = p.icon && AVATARS[p.icon] ? avatarSvg(p.icon) : letter.replace(/[&<>"']/g, '');
  return `<span class="avatar ${cls}" style="--c:${p.color}" aria-hidden="true">${inner}</span>`;
}
