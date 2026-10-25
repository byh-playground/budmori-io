// Visual atmosphere only: themes never change terrain, collisions, movement or damage.
export const TOWER_THEMES = Object.freeze([
    Object.freeze({
        id: 'entrance',
        name: '성의 입구',
        floor: [112, 107, 118],
        wall: [65, 60, 77],
        accent: [255, 195, 120],
    }),
    Object.freeze({
        id: 'garden',
        name: '공중 정원',
        floor: [107, 128, 107],
        wall: [49, 78, 67],
        accent: [185, 237, 160],
    }),
    Object.freeze({
        id: 'armory',
        name: '무기고',
        floor: [101, 119, 133],
        wall: [43, 61, 78],
        accent: [157, 206, 235],
    }),
    Object.freeze({
        id: 'royal',
        name: '왕실 홀',
        floor: [130, 105, 126],
        wall: [76, 43, 73],
        accent: [250, 207, 132],
    }),
    Object.freeze({
        id: 'terrace',
        name: '별빛 테라스',
        floor: [111, 122, 153],
        wall: [48, 60, 95],
        accent: [203, 217, 255],
    }),
]);

export function towerTheme(floor) {
    return TOWER_THEMES[Math.min(TOWER_THEMES.length - 1, Math.max(0, Math.floor((floor - 1) / 20)))];
}
