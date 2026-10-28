export const SEEDLING_TRANSFORM = Object.freeze({ duration: 1.15, apex: 0.4, lift: 1.35 });

// Presentation height only; authoritative z, movement, food and combat never wait for this flourish.
export function seedlingTransformPose(age) {
    const { duration: DURATION, apex: APEX, lift: LIFT } = SEEDLING_TRANSFORM;
    if (age < APEX) {
        return { lift: LIFT * Math.sin((Math.max(0, age / APEX) * Math.PI) / 2), seedling: true };
    }
    const T = Math.max(0, Math.min(1, (age - APEX) / (DURATION - APEX)));
    return { lift: LIFT * (1 - T * T * (3 - 2 * T)), seedling: false };
}
