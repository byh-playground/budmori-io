// Exact binomial variates with work that does not grow with the number of
// trials. Inversion handles small means; BTPE handles large means.
function checkedUniform(random) {
    const VALUE = random();
    if (!Number.isFinite(VALUE) || VALUE < 0 || VALUE >= 1) {
        throw new RangeError('Binomial random source must return values in [0, 1)');
    }
    return VALUE;
}

function inversion(trials, probability, random) {
    const FAILURE = 1 - probability;
    let mass = Math.exp(trials * Math.log1p(-probability)),
        cumulative = mass,
        successes = 0;
    const TARGET = checkedUniform(random);
    while (TARGET > cumulative && successes < trials) {
        successes++;
        mass *= ((trials - successes + 1) * probability) / (successes * FAILURE);
        cumulative += mass;
    }
    return successes;
}

function stirlingCorrection(value) {
    const SQUARE = value * value;
    return (13860 - (462 - (132 - (99 - 140 / SQUARE) / SQUARE) / SQUARE) / SQUARE) / value / 166320;
}

function btpe(trials, probability, random) {
    const R = probability,
        Q = 1 - R,
        FM = trials * R + R,
        M = Math.floor(FM),
        P1 = Math.floor(2.195 * Math.sqrt(trials * R * Q) - 4.6 * Q) + 0.5,
        XM = M + 0.5,
        XL = XM - P1,
        XR = XM + P1,
        C = 0.134 + 20.5 / (15.3 + M),
        A_LEFT = (FM - XL) / (FM - XL * R),
        LAMBDA_LEFT = A_LEFT * (1 + A_LEFT / 2),
        A_RIGHT = (XR - FM) / (XR * Q),
        LAMBDA_RIGHT = A_RIGHT * (1 + A_RIGHT / 2),
        P2 = P1 * (1 + 2 * C),
        P3 = P2 + C / LAMBDA_LEFT,
        P4 = P3 + C / LAMBDA_RIGHT;

    for (;;) {
        const U = checkedUniform(random) * P4;
        let v = checkedUniform(random),
            y;
        if (U <= P1) {
            return Math.floor(XM - P1 * v + U);
        }
        if (U <= P2) {
            const X = XL + (U - P1) / C;
            v = v * C + 1 - Math.abs(M - X + 0.5) / P1;
            if (v > 1 || v <= 0) {
                continue;
            }
            y = Math.floor(X);
        } else if (U <= P3) {
            y = Math.floor(XL + Math.log(v) / LAMBDA_LEFT);
            if (y < 0 || v === 0) {
                continue;
            }
            v *= (U - P2) * LAMBDA_LEFT;
        } else {
            y = Math.floor(XR - Math.log(v) / LAMBDA_RIGHT);
            if (y > trials || v === 0) {
                continue;
            }
            v *= (U - P3) * LAMBDA_RIGHT;
        }

        const DISTANCE = Math.abs(y - M);
        if (DISTANCE <= 20) {
            const S = R / Q,
                A = S * (trials + 1);
            let ratio = 1;
            if (M < y) {
                for (let index = M + 1; index <= y; index++) {
                    ratio *= A / index - S;
                }
            } else if (M > y) {
                for (let index = y + 1; index <= M; index++) {
                    ratio /= A / index - S;
                }
            }
            if (v <= ratio) {
                return y;
            }
            continue;
        }

        const X1 = y + 1,
            F1 = M + 1,
            Z = trials - M + 1,
            W = trials - y + 1,
            LOG_RATIO =
                (M + 0.5) * Math.log(F1 / X1) +
                (trials - M + 0.5) * Math.log(Z / W) +
                (y - M) * Math.log((W * R) / (X1 * Q)) +
                stirlingCorrection(F1) +
                stirlingCorrection(Z) -
                stirlingCorrection(X1) -
                stirlingCorrection(W);
        if (Math.log(v) <= LOG_RATIO) {
            return y;
        }
    }
}

export function sampleBinomial(trials, probability, random) {
    if (
        !Number.isSafeInteger(trials) ||
        trials < 0 ||
        !Number.isFinite(probability) ||
        probability < 0 ||
        probability > 1 ||
        typeof random !== 'function'
    ) {
        throw new RangeError('Binomial parameters are out of range');
    }
    if (trials === 0 || probability === 0) {
        return 0;
    }
    if (probability === 1) {
        return trials;
    }
    const REFLECT = probability > 0.5,
        SMALLER_PROBABILITY = Math.min(probability, 1 - probability),
        MEAN = trials * SMALLER_PROBABILITY,
        SUCCESS_COUNT =
            MEAN < 30 ? inversion(trials, SMALLER_PROBABILITY, random) : btpe(trials, SMALLER_PROBABILITY, random);
    return REFLECT ? trials - SUCCESS_COUNT : SUCCESS_COUNT;
}
