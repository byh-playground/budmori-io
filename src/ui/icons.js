// The one icon set for every screen: a 24×24 grid drawn with round 2px strokes in currentColor (see .icon in
// base.css), so an icon takes its size from the font size and its colour from the text of the button it sits in.
// Skill and passive card icons use the card id as their name; stat cards name theirs in the card list.
const ICON_SHAPES = Object.freeze({
    home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
    sprout: '<path d="M12 21V11M12 14C5 14 3 9 3 4c6 0 9 3 9 8m0-2c0-5 3-8 9-8 0 6-3 10-9 10"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 10.5v7M12 6.5h.01"/>',
    settings:
        '<path d="M19.42 10.37L21.92 10.75L21.92 13.25L19.42 13.63A7.6 7.6 0 0 1 18.4 16.1L19.9 18.13L18.13 19.9L16.1 18.4A7.6 7.6 0 0 1 13.63 19.42L13.25 21.92L10.75 21.92L10.37 19.42A7.6 7.6 0 0 1 7.9 18.4L5.87 19.9L4.1 18.13L5.6 16.1A7.6 7.6 0 0 1 4.58 13.63L2.08 13.25L2.08 10.75L4.58 10.37A7.6 7.6 0 0 1 5.6 7.9L4.1 5.87L5.87 4.1L7.9 5.6A7.6 7.6 0 0 1 10.37 4.58L10.75 2.08L13.25 2.08L13.63 4.58A7.6 7.6 0 0 1 16.1 5.6L18.13 4.1L19.9 5.87L18.4 7.9A7.6 7.6 0 0 1 19.42 10.37Z"/><circle cx="12" cy="12" r="3"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4.6c0 2.1-2.7 2.3-2.7 4.2"/><path d="M12 17.2h.01"/>',
    upgrade: '<path d="m6 12 6-6 6 6"/><path d="m6 18 6-6 6 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    giant: '<circle cx="5" cy="13.5" r="2"/><path d="M1.8 20.5a3.2 3.2 0 0 1 6.4 0"/><circle cx="15.5" cy="7" r="4"/><path d="M9 20.5a6.5 6.5 0 0 1 13 0"/>',
    lightning: '<path d="M13.5 2.5 5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
    meteor: '<circle cx="8.5" cy="15.5" r="5"/><path d="M12 12 20.5 3.5M14.6 15.4l5.4-5.4M8.6 9.4 14 4"/>',
    'meteor-shower':
        '<circle cx="4" cy="14" r="2" fill="currentColor"/><path d="M5.5 12.5 10 8"/><circle cx="10" cy="20" r="2" fill="currentColor"/><path d="M11.5 18.5 17 13"/><circle cx="14" cy="10" r="2" fill="currentColor"/><path d="M15.5 8.5 20.5 3.5"/>',
    copy: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0"/><path d="M15 4.7a3.5 3.5 0 0 1 0 6.6M18 14.5a6.5 6.5 0 0 1 3.5 6" stroke-dasharray="2.4 2.4"/>',
    'healing-rain':
        '<path d="M7 15.5a4.5 4.5 0 0 1-.5-9 5.5 5.5 0 0 1 10.6 1.6A3.7 3.7 0 0 1 17.5 15.5z"/><path d="M12 8.6v4M10 10.6h4"/><path d="M8 18.5v2M12 18.5v2M16 18.5v2"/>',
    hammer: '<path d="m13 3.5 7.5 7.5-3 3L10 6.5z"/><path d="M12.5 10 4 18.5 5.5 20 14 11.5"/>',
    ufo: '<path d="M7.5 9.5a4.5 4.5 0 0 1 9 0"/><ellipse cx="12" cy="11.5" rx="9.5" ry="3"/><path d="m9 15.5-2.5 5M15 15.5l2.5 5"/>',
    'storm-cloud':
        '<path d="M7 14.5a4.5 4.5 0 0 1-.5-9 5.5 5.5 0 0 1 10.6 1.6A3.7 3.7 0 0 1 17.5 14.5z"/><path d="M12.5 14.5 10.5 18h3l-2 3.5"/>',
    'arrow-right': '<path d="M4 12h16M14 6l6 6-6 6"/>',
    attack: '<path d="M20.5 3.5 20 8l-9.5 9.5-4-4L16 4z"/><path d="m4.5 12 7.5 7.5M7 17l-3.5 3.5"/>',
    hp: '<path d="M12 20.5S3.5 15.6 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 6-8.5 10.9-8.5 10.9z"/>',
    regen: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 3.5V8h-4.5"/><path d="M12 9v6M9 12h6"/>',
    armor: '<path d="M12 3 19.5 6v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z"/>',
    'attack-speed': '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5 15 10.5M10 2.5h4M12 2.5V6"/>',
    'move-speed': '<path d="m4 6 6 6-6 6M12 6l6 6-6 6"/>',
    'crit-chance':
        '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
    'crit-damage':
        '<path d="m12 2.5 2.2 5.6 5.9-1.6-3.3 5.1 4.7 3.9-6 .7.4 6-3.9-4.5-3.9 4.5.4-6-6-.7 4.7-3.9-3.3-5.1 5.9 1.6z"/>',
    lifesteal:
        '<path d="M12 3c3.6 4.4 6.2 7.8 6.2 10.8a6.2 6.2 0 0 1-12.4 0C5.8 10.8 8.4 7.4 12 3z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
    'last-stand': '<path d="M5 21V3.5M5 4h13l-3 4 3 4H5"/>',
    resolve: '<path d="M2.5 19.5 9 8.5l4.5 7 2.5-3.5 5.5 7.5z"/>',
    vengeance:
        '<path d="M12 21.5c-4 0-6.7-2.7-6.7-6.2 0-3.6 3-5.6 3.6-9.3 2.3 1.4 3.2 3.4 3.2 5.2 1-1 1.6-2.4 1.6-3.8 2.7 2.1 5 4.8 5 7.9 0 3.5-2.7 6.2-6.7 6.2z"/>',
    opening: '<path d="M4.5 4v16M9 5l10.5 7L9 19z"/>',
    helper: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0"/><path d="M18.5 8v6M15.5 11h6"/>',
    undying:
        '<path d="M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4s3.6-4 5.5-4a4 4 0 0 1 0 8c-1.9 0-3.5-1.3-5.5-4z"/>',
});

export function iconSvg(name) {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_SHAPES[name]}</svg>`;
}

// Static markup names its icon with data-icon; this draws them all once the page loads.
export function mountIcons(root = document) {
    for (const ELEMENT of root.querySelectorAll('[data-icon]')) {
        ELEMENT.innerHTML = iconSvg(ELEMENT.dataset.icon);
    }
}
