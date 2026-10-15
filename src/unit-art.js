  // budmori-art.js

  (function(global) {
    "use strict";
    const RangeUtil = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };
    class HashUtil {
      static hash(s) {
        s = String(s);
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) {
          h ^= s.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      }
    }
    const RALLY_ART_CONFIG = {
      provenance: {
        "commit": "f9d4c28289d7b452a51b70d818fcb657eb4f4d47",
        "sourceFile": "Rally Frontier index.html",
        "sourceSha256": "47c2007a95bc42f948de58a8474b6cdeac024d305eeba18d28481b5ecea3d244",
        "speciesFunctions": {
          "swordsman": {
            "start": 26499,
            "end": 26513,
            "sha256": "8454a5d50ae65126f54ea381f8a5aef45bd0ba4d31e10799e2bd683a2a22a823"
          },
          "archer": {
            "start": 26526,
            "end": 26540,
            "sha256": "9bcf8e09484d5c015b71f22ece1a89252598d3516c454645e1d45c2b27e16c05"
          },
          "dandelion": {
            "start": 26597,
            "end": 26605,
            "sha256": "a19e307073b8fdd436abae8494185d31a73c49b6ee527a9697e1bce9cabc790a"
          },
          "skirmisher": {
            "start": 26541,
            "end": 26556,
            "sha256": "978bf1db0e1ca39afe216e7764137a1656095884816c30e79dc0bcc35aa2e464"
          },
          "tank": {
            "start": 26615,
            "end": 26628,
            "sha256": "69bcfec6fe4f2709084fa3663e4584135b9cf054f00df61e4e57f98b218d612d"
          },
          "medic": {
            "start": 26678,
            "end": 26689,
            "sha256": "3d40268f620a48e8b9f7d34486edf666e5e2d825638bc25c7f651c5ed131376e"
          },
          "mage": {
            "start": 26645,
            "end": 26660,
            "sha256": "b34644c11a6a9a82fa15193e374e5ddd3b4ecb257edb5944cb8cd681125b539e"
          },
          "rogue": {
            "start": 26629,
            "end": 26644,
            "sha256": "2f5316d6d7f8ce0bfdb6373883b4603db7884daa62a7d11fd9f5d867f75a789b"
          },
          "guardshroom": {
            "start": 26746,
            "end": 26753,
            "sha256": "6b4116b8de79c16b513600ccd25c0f315e5bef65de85a4a25ad85f66c47a2fb7"
          },
          "siege": {
            "start": 26899,
            "end": 26936,
            "sha256": "d89886c87121ffcf915875e93e3124e4674618ff1130978a3aedb69c0b6fce48"
          },
          "shelltitan": {
            "start": 26781,
            "end": 26808,
            "sha256": "e33d0d586fa001af097d9755b14735dc4c454857cfe5179f450fd9bd889e7450"
          },
          "shellbug": {
            "start": 26575,
            "end": 26584,
            "sha256": "312b44f284ce755a6947da91e8cb8d5e06c4a16f2459fa5316a40d3248440a8e"
          },
          "pikeman": {
            "start": 26514,
            "end": 26525,
            "sha256": "1fb1c14877d09e52320f00f4d0ac8715fc61ffb0be494be52fdf7a08601ca5ee"
          },
          "stingbug": {
            "start": 26585,
            "end": 26596,
            "sha256": "8f85b4d76bc58147db54ba60208b50f369789e8b1f31b8415c37d0efbf4075da"
          },
          "fireant": {
            "start": 25900,
            "end": 25927,
            "sha256": "d2adc22497a1cfd45f0c65e6bfb18eff89bddeb408a31a6248fdbcd238e0dedd"
          },
          "kickhopper": {
            "start": 26557,
            "end": 26574,
            "sha256": "064dd7ee80df1d672d046b908cc02a969337fd32ec49a1ffebaa2385707f024d"
          },
          "rootstalker": {
            "start": 26730,
            "end": 26738,
            "sha256": "9f5c403986f4258051bfb4d2230c8cac9ff33de60f89134e523bd2fdfa27a747"
          },
          "pillbug": {
            "start": 26708,
            "end": 26729,
            "sha256": "4d763eeb446b5edc2e2d9b4a29a6e224897f6cf7d1c79c0865169eadf0971424"
          },
          "mantis": {
            "start": 26690,
            "end": 26707,
            "sha256": "6ab6be016b0a115689b8638a9b6502c06bd83b2154140dd152ab0d287c71d4bd"
          },
          "clawhunter": {
            "start": 26762,
            "end": 26773,
            "sha256": "2b4977b96e7b8212ad9f2efb28123a2dbbff9addf1faf8d934b9862c31760afe"
          },
          "chainflower": {
            "start": 26739,
            "end": 26745,
            "sha256": "528d257417bf0f740486d90c16ebc12c0f42e80573902bb97f00d92703087c57"
          },
          "rocket": {
            "start": 26937,
            "end": 26954,
            "sha256": "48970cc31f314d77c0769d594cf360b1a21937a27f1f296e6506c3c10cd231cb"
          },
          "flowerbee": {
            "start": 27036,
            "end": 27050,
            "sha256": "8122dccaf45496fdd28b12d0a3eb1115b2b5fc66aa211182c8015b1a589afdb0"
          },
          "sporemoth": {
            "start": 27085,
            "end": 27093,
            "sha256": "0b9b79abfe5cec3464e539774bd7aae13c780b7c32aca1dfa1b38a0a3b02d8ee"
          }
        },
        "definitions": "13661\u201313774",
        "primitiveGeometry": "28069\u201328134",
        "airComposition": "31163\u201331180",
        "commonBody": "31252\u201331259",
        "drawPipeline": "31312\u201331451"
      },
      types: ["swordsman", "archer", "dandelion", "skirmisher", "tank", "medic", "mage", "flowerbee", "rogue", "guardshroom", "siege", "shelltitan", "shellbug", "pikeman", "stingbug", "fireant", "kickhopper", "rootstalker", "pillbug", "sporemoth", "mantis", "clawhunter", "chainflower", "rocket"],
      palettes: {
        "friendly": {
          "body": [
            0.18,
            0.43,
            0.93,
            1
          ],
          "dark": [
            0.07,
            0.19,
            0.46,
            1
          ],
          "light": [
            0.48,
            0.68,
            1,
            1
          ],
          "ring": [
            0.32,
            0.58,
            1,
            0.58
          ]
        },
        "enemy": {
          "body": [
            0.89,
            0.28,
            0.28,
            1
          ],
          "dark": [
            0.48,
            0.08,
            0.1,
            1
          ],
          "light": [
            1,
            0.55,
            0.55,
            1
          ],
          "ring": [
            1,
            0.35,
            0.35,
            0.58
          ]
        },
        "neutral": {
          "body": [
            0.48,
            0.35,
            0.22,
            1
          ],
          "dark": [
            0.25,
            0.18,
            0.12,
            1
          ],
          "light": [
            0.72,
            0.57,
            0.34,
            1
          ],
          "ring": [
            0.76,
            0.61,
            0.28,
            0.46
          ]
        }
      },
      units: {
        "swordsman": {
          "family": "leafblade",
          "shape": "seed",
          "crest": "leaf",
          "weapon": "leafblade",
          "accent": [
            0.52,
            0.82,
            0.31,
            1
          ],
          "fx": "melee",
          "size": 15,
          "tier": 1,
          "name": "\uCE7C\uC78E \uC804\uC0AC",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "archer": {
          "family": "seedbow",
          "facing": "full",
          "shape": "bud",
          "crest": "leaf",
          "weapon": "seedbow",
          "accent": [
            0.42,
            0.76,
            0.34,
            1
          ],
          "fx": "pierce",
          "size": 15,
          "tier": 1,
          "name": "\uC528\uC557\uAD81\uC218",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "dandelion": {
          "family": "t1-runner",
          "shape": "vehicle",
          "crest": "tuft",
          "weapon": "body",
          "accent": [
            0.92,
            0.94,
            0.72,
            1
          ],
          "fx": "melee",
          "size": 10,
          "tier": 1,
          "name": "\uBBFC\uB4E4\uB808 \uC8FC\uC790",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "skirmisher": {
          "family": "spore-gunner",
          "facing": "full",
          "shape": "pod",
          "crest": "coil",
          "weapon": "spore-pod",
          "accent": [
            0.32,
            0.86,
            0.72,
            1
          ],
          "fx": "bullet",
          "size": 10,
          "tier": 1,
          "name": "\uD3EC\uC790\uC0AC\uC218",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "tank": {
          "family": "shell-guardian",
          "shape": "shell",
          "crest": "shield",
          "weapon": "shell",
          "accent": [
            0.58,
            0.76,
            0.34,
            1
          ],
          "fx": "guard",
          "size": 20,
          "tier": 2,
          "name": "\uAECD\uC9C8\uC218\uD638\uC790",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "medic": {
          "family": "dew-healer",
          "shape": "petal",
          "crest": "leaf",
          "weapon": "dew",
          "accent": [
            0.42,
            0.9,
            0.65,
            1
          ],
          "fx": "heal",
          "size": 10,
          "tier": 2,
          "name": "\uC774\uC2AC\uCE58\uC720\uC0AC",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "mage": {
          "family": "burst-flower",
          "shape": "petal",
          "crest": "orb",
          "weapon": "pollen",
          "accent": [
            0.82,
            0.46,
            0.88,
            1
          ],
          "fx": "magic",
          "size": 15,
          "tier": 2,
          "name": "\uD3ED\uBC1C\uAF43",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "flowerbee": {
          "family": "air-bee",
          "shape": "bug",
          "crest": "petal",
          "weapon": "sting",
          "accent": [
            0.96,
            0.72,
            0.24,
            1
          ],
          "fx": "air",
          "size": 10,
          "tier": 1,
          "name": "\uAF43\uBC8C",
          "layer": "AIR",
          "visualScale": 1.08
        },
        "lancer": {family:"stag-rider",facing:"full",shape:"beetle",crest:"horn",weapon:"mandible",accent:[.94,.64,.24,1],fx:"pierce",size:15,tier:2,name:"왕사슴 돌격대",layer:"GROUND",visualScale:1.08},
        "rogue": {
          "family": "shadow-flea",
          "facing": "full",
          "shape": "bug",
          "crest": "leaf",
          "weapon": "forelegs",
          "accent": [
            0.72,
            0.64,
            0.28,
            1
          ],
          "fx": "slash",
          "size": 10,
          "tier": 2,
          "name": "\uADF8\uB9BC\uC790\uBCBC\uB8E9",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "guardshroom": {
          "family": "support",
          "shape": "mushroom",
          "crest": "cap",
          "weapon": "aura",
          "accent": [
            0.72,
            0.48,
            0.92,
            1
          ],
          "fx": "guard",
          "size": 15,
          "tier": 2,
          "name": "\uC218\uD638\uBC84\uC12F",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "siege": {
          "family": "seed-artillery",
          "facing": "full",
          "shape": "rooted-pod",
          "crest": "seed",
          "weapon": "seed-cannon",
          "accent": [
            0.88,
            0.7,
            0.28,
            1
          ],
          "fx": "heavy",
          "size": 20,
          "tier": 3,
          "name": "\uCCA0\uAC11\uC528\uC557\uD3EC",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "shelltitan": {
          "family": "ancient-shell-colossus",
          "facing": "full",
          "shape": "massive-carapace",
          "crest": "small-head",
          "weapon": "body-slam",
          "accent": [
            0.78,
            0.64,
            0.34,
            1
          ],
          "fx": "heavy",
          "size": 35,
          "tier": 3,
          "name": "\uACE0\uB300\uAECD\uC9C8 \uAC70\uC2E0",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "shellbug": {
          "family": "t1-shell",
          "shape": "vehicle",
          "crest": "shell",
          "weapon": "body",
          "accent": [
            0.62,
            0.76,
            0.37,
            1
          ],
          "fx": "guard",
          "size": 15,
          "tier": 1,
          "name": "\uAECD\uC9C8\uB531\uC815\uBC8C\uB808",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "pikeman": {
          "family": "thorn-reed",
          "facing": "full",
          "shape": "sprout",
          "crest": "spear",
          "weapon": "thorn-stem",
          "accent": [
            0.72,
            0.88,
            0.42,
            1
          ],
          "fx": "pierce",
          "size": 15,
          "tier": 1,
          "name": "\uAC00\uC2DC\uCC3D\uD480",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "stingbug": {
          "family": "t1-sting",
          "shape": "vehicle",
          "crest": "stinger",
          "weapon": "stinger",
          "accent": [
            0.88,
            0.72,
            0.28,
            1
          ],
          "fx": "pierce",
          "size": 10,
          "tier": 1,
          "name": "\uCE68\uBC8C\uB808",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "fireant": {
          "commonGroundBody": false,
          "family": "fire-ant",
          "facing": "full",
          "shape": "bug",
          "crest": "antenna",
          "weapon": "acid-gland",
          "accent": [
            0.88,
            0.3,
            0.12,
            1
          ],
          "fx": "pierce",
          "size": 10,
          "tier": 1,
          "name": "\uBD88\uAC1C\uBBF8",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "kickhopper": {
          "family": "t1-kickhopper",
          "shape": "bug",
          "crest": "hopper",
          "weapon": "hindlegs",
          "accent": [
            0.76,
            0.88,
            0.3,
            1
          ],
          "fx": "melee",
          "size": 10,
          "tier": 1,
          "name": "\uBC29\uC544\uAE68\uBE44",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "rootstalker": {
          "family": "controller",
          "shape": "bulb",
          "crest": "root",
          "weapon": "spikes",
          "accent": [
            0.66,
            0.43,
            0.2,
            1
          ],
          "fx": "pierce",
          "size": 15,
          "tier": 2,
          "name": "\uBFCC\uB9AC\uAC00\uC2DC",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "pillbug": {
          "family": "controller",
          "shape": "round",
          "crest": "coil",
          "weapon": "bomb",
          "accent": [
            0.9,
            0.66,
            0.24,
            1
          ],
          "fx": "heavy",
          "size": 15,
          "tier": 2,
          "name": "\uD3ED\uB0AD \uCF69\uBC8C\uB808",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "sporemoth": {
          "family": "air-bomber",
          "shape": "petal",
          "crest": "spore",
          "weapon": "bomb",
          "accent": [
            0.72,
            0.52,
            0.84,
            1
          ],
          "fx": "air",
          "size": 15,
          "tier": 2,
          "name": "\uD3EC\uC790\uB098\uBC29",
          "layer": "AIR",
          "visualScale": 1.08
        },
        "mantis": {
          "family": "veil-mantis",
          "shape": "leaf",
          "crest": "mantis",
          "weapon": "scythes",
          "accent": [
            0.47,
            0.94,
            0.43,
            1
          ],
          "fx": "ambush",
          "size": 10,
          "tier": 2,
          "name": "\uBCA0\uC77C \uC0AC\uB9C8\uADC0",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "clawhunter": {
          "family": "controller",
          "shape": "round",
          "crest": "claw",
          "weapon": "claw",
          "accent": [
            0.94,
            0.58,
            0.28,
            1
          ],
          "fx": "pull",
          "size": 15,
          "tier": 2,
          "name": "\uC9D1\uAC8C\uC0AC\uB0E5\uAFBC",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "chainflower": {
          "family": "caster",
          "shape": "petal",
          "crest": "arc",
          "weapon": "chain",
          "accent": [
            0.62,
            0.86,
            1,
            1
          ],
          "fx": "magic",
          "size": 15,
          "tier": 2,
          "name": "\uC5F0\uC1C4\uAF43",
          "layer": "GROUND",
          "visualScale": 1.08
        },
        "rocket": {
          "family": "firework-flower",
          "facing": "full",
          "shape": "flower-pod",
          "crest": "bloom",
          "weapon": "firework-seeds",
          "accent": [
            1,
            0.5,
            0.3,
            1
          ],
          "fx": "heavy",
          "size": 20,
          "tier": 3,
          "name": "\uB2E4\uC5F0\uBC1C \uBD09\uC120\uD654",
          "layer": "GROUND",
          "visualScale": 1.08
        }
      },
      limits: { thumbnailCacheEntries: 96, meshCacheMeshes: 384, meshCacheBytes: 24 * 1024 * 1024 },
      commonBody: { ink: [0.07, 0.1, 0.13, 1], outerRadius: 0.78, outerY: 0.12, bodyRadius: 0.68, bodyY: 0.08, highlightRadius: 0.25, highlightX: -0.18, highlightY: -0.04 },
      deployment: { deployMs: 900, undeployMs: 450 }
    };
    const UNIT_VISUAL_RENDER_FNS = Object.freeze({
  "lancer":(rdr,ctx)=>{
    const {sc,x,y,r,team,teamDark,accent,attack,dir}=ctx;
    {
        // 왕사슴 돌격대: 실제 사슴벌레 몸체와 거대한 집게턱이 실루엣의 대부분.
        rdr.circle(x,y+r*.14,r*.80,[.20,.16,.12,1],13);
        rdr.poly([[x-r*.66,y-r*.06],[x,y-r*.58],[x+r*.66,y-r*.06],[x+r*.52,y+r*.48],[x-r*.52,y+r*.48]],teamDark);
        rdr.circle(x,y-r*.50,r*.34,[.31,.22,.12,1],10);
        const charge=attack?r*.34:0;
        rdr.line(x-r*.18,y-r*.66,x-r*.58,y+dir*(r*1.55+charge),Math.max(2,3.4*sc),accent);
        rdr.line(x+r*.18,y-r*.66,x+r*.58,y+dir*(r*1.55+charge),Math.max(2,3.4*sc),accent);
        rdr.crestTriangle(x-r*.60,y+dir*(r*1.62+charge),r*.20,accent,dir<0?-Math.PI/2:Math.PI/2);
        rdr.crestTriangle(x+r*.60,y+dir*(r*1.62+charge),r*.20,accent,dir<0?-Math.PI/2:Math.PI/2);
        // 작은 씨앗 기수.
        rdr.circle(x,y-r*.88,r*.22,team,9);
      
    }
  },

      "swordsman": (rdr, ctx) => {
        const { sc, x, y, r, attack, dir } = ctx;
        {
          const slash = attack ? r * 0.32 : 0;
          rdr.petalRing(x - r * 0.48, y + r * 0.05, r * 0.26, 3, [0.38, 0.68, 0.28, 1], -0.3, 0.58);
          rdr.poly([
            [x + r * 0.28, y + r * 0.12],
            [x + r * 0.7, y + dir * r * 0.18],
            [x + r * 1.34, y + dir * (r * 0.82 + slash)],
            [x + r * 0.92, y + dir * (r * 0.95 + slash)],
            [x + r * 0.4, y + dir * r * 0.22]
          ], [0.48, 0.8, 0.32, 1]);
          rdr.line(x + r * 0.44, y + dir * r * 0.18, x + r * 1.14, y + dir * (r * 0.72 + slash), Math.max(1, 1.6 * sc), [0.24, 0.52, 0.2, 1]);
        }
      },
      "archer": (rdr, ctx) => {
        const { sc, x, y, r, attack, dir } = ctx;
        {
          rdr.poly([[x + r * 0.35, y - r * 0.68], [x + r * 0.83, y - r * 0.36], [x + r * 0.63, y - r * 0.06], [x + r * 0.28, y - r * 0.28]], [0.36, 0.66, 0.28, 1]);
          rdr.poly([[x + r * 0.35, y + r * 0.68], [x + r * 0.83, y + r * 0.36], [x + r * 0.63, y + r * 0.06], [x + r * 0.28, y + r * 0.28]], [0.36, 0.66, 0.28, 1]);
          rdr.line(x + r * 0.8, y - r * 0.34, x + r * 0.8, y + r * 0.34, Math.max(1, 1.4 * sc), [0.78, 0.84, 0.55, 1]);
          rdr.circle(x + r * 0.76, y, r * 0.1, [0.74, 0.58, 0.25, 1], 8);
          if (attack) {
            rdr.line(x + r * 0.78, y, x + r * 1.48, y + dir * r * 0.06, Math.max(1.1, 1.6 * sc), [0.53, 0.39, 0.18, 1]);
            rdr.circle(x + r * 1.52, y + dir * r * 0.06, r * 0.09, [0.82, 0.65, 0.3, 1], 8);
          }
        }
      },
      "dandelion": (rdr, ctx) => {
        const { sc, x, y, r, team, accent, motion } = ctx;
        {
          rdr.circle(x, y + r * 0.16, r * 0.4, team, 10);
          rdr.part("spokes", () => {
            for (let k = 0; k < 9; k++) {
              const a = k * Math.PI * 2 / 9;
              rdr.line(x, y - r * 0.3, x + Math.cos(a) * r * 0.72, y - r * 0.3 + Math.sin(a) * r * 0.72, Math.max(1, 1.3 * sc), [0.94, 0.95, 0.82, 0.9]);
            }
          }, motion.parts.spokes);
          rdr.circle(x, y - r * 0.3, r * 0.13, accent, 8);
        }
      },
      "skirmisher": (rdr, ctx) => {
        const { x, y, r, accent, attack, dir } = ctx;
        {
          rdr.circle(x - r * 0.38, y - r * 0.08, r * 0.38, [0.3, 0.64, 0.48, 1], 11);
          rdr.circle(x - r * 0.48, y - r * 0.2, r * 0.13, [0.68, 0.92, 0.6, 1], 8);
          rdr.circle(x - r * 0.28, y + r * 0.12, r * 0.11, [0.68, 0.92, 0.6, 1], 8);
          rdr.poly([[x + r * 0.25, y - r * 0.15], [x + r * 0.92, y - r * 0.22], [x + r * 1.18, y], [x + r * 0.92, y + r * 0.22], [x + r * 0.25, y + r * 0.15]], [0.28, 0.58, 0.42, 1]);
          rdr.circle(x + r * 1.2, y, r * 0.12, accent, 8);
          if (attack) {
            rdr.circle(x + r * 1.5, y + dir * r * 0.04, r * 0.14, [0.62, 1, 0.72, 0.5], 8);
            rdr.circle(x + r * 1.72, y + dir * r * 0.06, r * 0.07, [0.82, 1, 0.86, 0.7], 7);
          }
        }
      },
      "tank": (rdr, ctx) => {
        const { x, y, r, team, teamDark } = ctx;
        {
          rdr.circle(x, y + r * 0.06, r * 0.92, [0.24, 0.34, 0.18, 1], 14);
          for (let k = -2; k <= 2; k++) {
            const ox = k * r * 0.24;
            rdr.poly([[x + ox - r * 0.2, y - r * 0.66], [x + ox + r * 0.2, y - r * 0.66], [x + ox + r * 0.28, y + r * 0.46], [x + ox - r * 0.28, y + r * 0.46]], k % 2 ? teamDark : [0.48, 0.62, 0.3, 1]);
          }
          rdr.circle(x, y - r * 0.3, r * 0.28, team, 10);
          rdr.circle(x + r * 0.08, y - r * 0.35, r * 0.07, [0.9, 0.94, 0.66, 1], 7);
        }
      },
      "medic": (rdr, ctx) => {
        const { sc, x, y, r, team } = ctx;
        {
          rdr.petalRing(x, y + r * 0.04, r * 0.55, 6, [0.42, 0.76, 0.48, 1], Math.PI / 6, 0.7);
          rdr.circle(x, y - r * 0.34, r * 0.38, team, 11);
          rdr.circle(x + r * 0.56, y - r * 0.3, r * 0.25, [0.52, 0.96, 0.82, 0.62], 10);
          rdr.circle(x + r * 0.49, y - r * 0.39, r * 0.08, [0.9, 1, 0.96, 0.85], 8);
          rdr.line(x + r * 0.28, y - r * 0.12, x + r * 0.48, y - r * 0.26, Math.max(1.4, 2.1 * sc), [0.28, 0.62, 0.44, 1]);
        }
      },
      "mage": (rdr, ctx) => {
        const { x, y, r, team, attack, motion } = ctx;
        {
          rdr.petalRing(x, y - r * 0.08, r * 0.72, 8, [0.68, 0.35, 0.78, 1], Math.PI / 8, 0.76);
          rdr.circle(x, y - r * 0.08, r * 0.36, team, 12);
          const orb = r * (attack ? 0.34 : 0.22);
          rdr.circle(x, y - r * 0.12, orb, [0.92, 0.62, 1, 1], 10);
          rdr.circle(x, y - r * 0.12, orb * 1.9, [0.86, 0.46, 1, 0.14], 12);
          for (let k = 0; k < 4; k++) {
            rdr.part("orb-" + k, () => rdr.circle(x, y - r * 0.08, r * 0.07, [0.94, 0.78, 1, 0.6], 7), motion.parts["orb-" + k]);
          }
        }
      },
      "rogue": (rdr, ctx) => {
        const { sc, x, y, r, teamDark, accent, attack, dir } = ctx;
        {
          rdr.circle(x, y + r * 0.06, r * 0.5, teamDark, 11);
          rdr.circle(x, y - r * 0.4, r * 0.3, [0.24, 0.28, 0.18, 1], 9);
          rdr.line(x - r * 0.26, y + r * 0.22, x - r * 0.92, y + r * 0.74, Math.max(2, 3.2 * sc), teamDark);
          rdr.line(x + r * 0.26, y + r * 0.22, x + r * 0.92, y + r * 0.74, Math.max(2, 3.2 * sc), teamDark);
          const stab = attack ? r * 0.3 : 0;
          rdr.line(x - r * 0.2, y - r * 0.2, x - r * 0.9, y + dir * (r * 0.7 + stab), Math.max(1.5, 2.4 * sc), accent);
          rdr.line(x + r * 0.2, y - r * 0.2, x + r * 0.9, y + dir * (r * 0.7 + stab), Math.max(1.5, 2.4 * sc), accent);
          rdr.circle(x - r * 0.11, y - r * 0.44, r * 0.055, [0.9, 0.82, 0.28, 1], 6);
          rdr.circle(x + r * 0.11, y - r * 0.44, r * 0.055, [0.9, 0.82, 0.28, 1], 6);
        }
      },
      "guardshroom": (rdr, ctx) => {
        const { x, y, r, accent } = ctx;
        {
          rdr.circle(x, y + r * 0.28, r * 0.58, [0.72, 0.67, 0.54, 1], 12);
          rdr.circle(x, y - r * 0.34, r * 0.8, accent, 14);
          rdr.circle(x - r * 0.24, y - r * 0.42, r * 0.12, [1, 0.92, 0.78, 0.55], 8);
          rdr.circle(x + r * 0.18, y - r * 0.18, r * 0.1, [1, 0.92, 0.78, 0.45], 8);
          // Portrait adaptation: expose the existing stem and reuse RallyArt paired dot eyes.
        }
      },
      "siege": (rdr, ctx) => {
        const { sc, x, y, r, teamDark, accent, attack, motion } = ctx;
        const ease = motion.ease, drop = r * 0.3 * ease;
        const cannonAngle = -Math.PI / 2, anchorBase = cannonAngle + Math.PI / 3;
        for (let i = 0; i < 3; i++) {
          const a = anchorBase + i * Math.PI * 2 / 3, ca = Math.cos(a), sa = Math.sin(a), rootR = r * (0.42 + 0.08 * ease), footR = r * (0.68 + 0.82 * ease), sx = x + ca * rootR, sy = y - drop + sa * rootR * 0.72, ex = x + ca * footR, ey = y - drop + sa * footR * 0.72;
          rdr.part("hull-leg-" + i, () => {
            rdr.line(sx, sy, ex, ey, Math.max(2.8, 4.5 * sc), [0.25, 0.31, 0.15, 1]);
            rdr.circle(ex, ey, r * (0.12 + 0.17 * ease), [0.31, 0.22, 0.1, 1], 10);
          }, motion.parts["hull-leg-" + i]);
          rdr.part("hull-detail-" + i, () => {
            const tx = -sa, ty = ca * 0.72;
            rdr.line(ex, ey, ex + tx * r * 0.25, ey + ty * r * 0.25, Math.max(1.4, 2.2 * sc), [0.38, 0.25, 0.11, 0.88]);
            rdr.line(ex, ey, ex - tx * r * 0.25, ey - ty * r * 0.25, Math.max(1.4, 2.2 * sc), [0.38, 0.25, 0.11, 0.88]);
          }, motion.parts["hull-detail-" + i]);
        }
        rdr.part("hull-body", () => {
          rdr.circle(x, y + r * 0.08 - drop, r * (0.76 + 0.1 * ease), [0.32, 0.36, 0.2, 1], 14);
          rdr.circle(x, y - r * 0.05 - drop, r * 0.54, teamDark, 12);
        }, motion.parts["hull-body"]);
        const turretPivotX = x, turretPivotY = y - r * 0.08 - drop;
        rdr.part("turret", () => {
          const cx = turretPivotX, cy = turretPivotY;
          rdr.circle(cx, cy, r * 0.6, [0.46, 0.48, 0.22, 1], 14);
          rdr.circle(cx, cy, r * 0.34, [0.3, 0.34, 0.17, 1], 12);
          rdr.poly([[cx - r * 0.48, cy + r * 0.14], [cx - r * 0.34, cy - r * 0.4], [cx + r * 0.34, cy - r * 0.4], [cx + r * 0.48, cy + r * 0.14]], [0.39, 0.43, 0.2, 1]);
          rdr.circle(cx - r * 0.34, cy - r * 0.1, r * 0.15, [0.7, 0.58, 0.25, 1], 9);
          rdr.circle(cx + r * 0.34, cy - r * 0.1, r * 0.15, [0.7, 0.58, 0.25, 1], 9);
          rdr.poly([[cx - r * 0.32, cy + r * 0.16], [cx - r * 0.25, cy + r * 0.54], [cx + r * 0.25, cy + r * 0.54], [cx + r * 0.32, cy + r * 0.16]], [0.29, 0.34, 0.17, 1]);
          const kick = attack ? r * 0.22 : 0, barrelLen = r * (1.5 + 1.05 * ease) - kick;
          rdr.line(cx, cy - r * 0.12, cx, cy - barrelLen, Math.max(3.2, 5.6 * sc), [0.34, 0.54, 0.23, 1]);
          rdr.circle(cx, cy - r * (1.02 + 1.02 * ease), r * 0.22, [0.7, 0.58, 0.25, 1], 10);
          rdr.circle(cx, cy - barrelLen, r * 0.2, accent, 10);
        }, motion.parts.turret);
        rdr.part("deployment-halo", () => rdr.outlineCircle(x, y + r * 0.22, r * (0.7 + 0.78 * ease), Math.max(1.4, 2.2 * sc), [0.48, 0.32, 0.14, 0.48], 20, 1), motion.parts["deployment-halo"]);
      },
      "shelltitan": (rdr, ctx) => {
        const { sc, x, y, r, attack, motion } = ctx;
        {
          const shell = [0.47, 0.38, 0.23, 1], shellDark = [0.27, 0.25, 0.17, 1], ridge = [0.67, 0.55, 0.31, 1], head = [0.63, 0.51, 0.29, 1], antenna = [0.76, 0.63, 0.35, 1];
          rdr.circle(x, y + r * 0.1, r * 1.04, shellDark, 18);
          rdr.poly([[x, y - r * 0.86], [x - r * 0.48, y - r * 0.75], [x - r * 0.82, y - r * 0.43], [x - r * 0.96, y + r * 0.04], [x - r * 0.78, y + r * 0.55], [x - r * 0.36, y + r * 0.84], [x, y + r * 0.92], [x + r * 0.36, y + r * 0.84], [x + r * 0.78, y + r * 0.55], [x + r * 0.96, y + r * 0.04], [x + r * 0.82, y - r * 0.43], [x + r * 0.48, y - r * 0.75]], shell);
          rdr.line(x, y - r * 0.72, x, y + r * 0.72, Math.max(1.6, 2.6 * sc), shellDark);
          for (const [ox, oy, sz] of [[-0.4, -0.34, 0.085], [0.4, -0.34, 0.085], [-0.46, 0.02, 0.095], [0.46, 0.02, 0.095], [-0.36, 0.4, 0.075], [0.36, 0.4, 0.075]]) {
            rdr.circle(x + ox * r, y + oy * r, r * sz, ridge, 8);
          }
          rdr.poly([[x, y - r * 0.78], [x - r * 0.2, y - r * 0.72], [x - r * 0.25, y - r * 0.94], [x, y - r * 1.16], [x + r * 0.25, y - r * 0.94], [x + r * 0.2, y - r * 0.72]], head);
          rdr.line(x - r * 0.11, y - r * 1.02, x - r * 0.27, y - r * 1.24, Math.max(1.1, 1.7 * sc), antenna);
          rdr.line(x + r * 0.11, y - r * 1.02, x + r * 0.27, y - r * 1.24, Math.max(1.1, 1.7 * sc), antenna);
          rdr.circle(x - r * 0.28, y - r * 1.26, r * 0.05, antenna, 7);
          rdr.circle(x + r * 0.28, y - r * 1.26, r * 0.05, antenna, 7);
          if (attack) {
            rdr.part("attack-aura", () => rdr.circle(x, y + r * 0.08, r * (1.02 + 0.13 * motion.attackPhase), [1, 0.76, 0.3, 0.09], 20), motion.parts["attack-aura"]);
          }
        }
      },
      "shellbug": (rdr, ctx) => {
        const { sc, x, y, r, teamDark, accent } = ctx;
        {
          rdr.circle(x, y + r * 0.1, r * 0.82, [0.34, 0.45, 0.22, 1], 12);
          rdr.poly([[x - r * 0.72, y - r * 0.1], [x - r * 0.42, y - r * 0.62], [x, y - r * 0.78], [x + r * 0.42, y - r * 0.62], [x + r * 0.72, y - r * 0.1], [x + r * 0.52, y + r * 0.4], [x - r * 0.52, y + r * 0.4]], teamDark);
          rdr.line(x, y - r * 0.68, x, y + r * 0.3, Math.max(1.3, 2 * sc), accent);
        }
      },
      "pikeman": (rdr, ctx) => {
        const { sc, x, y, r, accent, attack, dir } = ctx;
        {
          const thrust = attack ? r * 0.38 : 0;
          rdr.line(x + r * 0.08, y + r * 0.12, x + r * 0.08, y + dir * (r * 2.18 + thrust), Math.max(2, 3.2 * sc), [0.3, 0.55, 0.22, 1]);
          rdr.poly([[x - r * 0.02, y + dir * r * 0.86], [x - r * 0.35, y + dir * r * 0.58], [x - r * 0.08, y + dir * r * 0.42]], accent);
          rdr.poly([[x + r * 0.18, y + dir * r * 1.28], [x + r * 0.48, y + dir * r * 1.02], [x + r * 0.18, y + dir * r * 0.9]], accent);
          rdr.crestTriangle(x + r * 0.08, y + dir * (r * 2.34 + thrust), r * 0.25, [0.78, 0.88, 0.55, 1], dir < 0 ? -Math.PI / 2 : Math.PI / 2);
        }
      },
      "stingbug": (rdr, ctx) => {
        const { sc, x, y, r, team, teamDark, accent, attack, dir } = ctx;
        {
          rdr.circle(x - r * 0.12, y + r * 0.1, r * 0.54, team, 11);
          rdr.circle(x + r * 0.44, y - r * 0.04, r * 0.32, teamDark, 9);
          rdr.line(x - r * 0.18, y + r * 0.3, x - r * 0.78, y + r * 0.62, Math.max(1.2, 1.8 * sc), teamDark);
          rdr.line(x + r * 0.14, y + r * 0.3, x + r * 0.74, y + r * 0.62, Math.max(1.2, 1.8 * sc), teamDark);
          const jab = attack ? r * 0.3 : 0;
          rdr.line(x + r * 0.58, y, x + r * 1.38 + jab, y + dir * r * 0.06, Math.max(1.5, 2.3 * sc), accent);
          rdr.crestTriangle(x + r * 1.46 + jab, y + dir * r * 0.06, r * 0.18, accent, 0);
        }
      },
      "fireant": (rdr, ctx) => {
        const { sc, x, y, r, ownStealthAlpha, teamDark, teamLight, dir } = ctx;
        {
          const antDark = [0.2, 0.055, 0.025, ownStealthAlpha], antBody = [0.66, 0.12, 0.045, ownStealthAlpha], antHot = [1, 0.34, 0.07, ownStealthAlpha], antGlow = [1, 0.72, 0.18, 0.72 * ownStealthAlpha];
          const facing = dir, headY = y + facing * r * 0.54, thoraxY = y, abdY = y - facing * r * 0.58;
          rdr.circle(x, abdY, r * 0.48, antDark, 11);
          rdr.circle(x, abdY, r * 0.39, antBody, 11);
          rdr.circle(x, thoraxY, r * 0.34, teamDark, 10);
          rdr.circle(x, thoraxY, r * 0.27, antBody, 10);
          rdr.circle(x, headY, r * 0.31, antDark, 10);
          rdr.circle(x, headY, r * 0.24, antBody, 10);
          for (const side of [-1, 1]) {
            rdr.line(x + side * r * 0.16, y + facing * r * 0.18, x + side * r * 0.72, y + facing * r * 0.42, Math.max(1, 1.45 * sc), antDark);
            rdr.line(x + side * r * 0.18, y, x + side * r * 0.78, y - facing * r * 0.02, Math.max(1, 1.45 * sc), antDark);
            rdr.line(x + side * r * 0.14, y - facing * r * 0.22, x + side * r * 0.68, y - facing * r * 0.48, Math.max(1, 1.45 * sc), antDark);
            rdr.line(x + side * r * 0.12, headY + facing * r * 0.12, x + side * r * 0.45, headY + facing * r * 0.55, Math.max(1, 1.15 * sc), antDark);
          }
          rdr.circle(x, abdY - facing * r * 0.08, r * 0.16, antHot, 8);
          rdr.circle(x, abdY - facing * r * 0.08, r * 0.08, antGlow, 7);
          rdr.outlineCircle(x, thoraxY, r * 0.39, Math.max(1, 1.5 * sc), teamLight, 12, 1);
        }
      },
      "kickhopper": (rdr, ctx) => {
        const { sc, x, y, r, teamLight, accent, attack, dir } = ctx;
        {
          rdr.circle(x, y + r * 0.02, r * 0.58, [0.46, 0.62, 0.2, 1], 12);
          rdr.circle(x, y - r * 0.42, r * 0.32, teamLight, 10);
          rdr.line(x - r * 0.2, y + r * 0.26, x - r * 0.72, y + r * 0.74, Math.max(2, 3.2 * sc), [0.38, 0.5, 0.16, 1]);
          rdr.line(x + r * 0.2, y + r * 0.26, x + r * 0.72, y + r * 0.74, Math.max(2, 3.2 * sc), [0.38, 0.5, 0.16, 1]);
          const kick = attack ? r * 0.52 : 0;
          rdr.line(x - r * 0.72, y + r * 0.74, x - r * 1.1, y + dir * (r * 0.58 + kick), Math.max(2.2, 3.8 * sc), accent);
          rdr.line(x + r * 0.72, y + r * 0.74, x + r * 1.1, y + dir * (r * 0.58 + kick), Math.max(2.2, 3.8 * sc), accent);
          rdr.circle(x - r * 1.12, y + dir * (r * 0.6 + kick), r * 0.11, [0.92, 0.96, 0.58, 1], 8);
          rdr.circle(x + r * 1.12, y + dir * (r * 0.6 + kick), r * 0.11, [0.92, 0.96, 0.58, 1], 8);
          rdr.line(x - r * 0.16, y - r * 0.58, x - r * 0.42, y - r * 0.88, Math.max(1, 1.5 * sc), [0.3, 0.4, 0.15, 1]);
          rdr.line(x + r * 0.16, y - r * 0.58, x + r * 0.42, y - r * 0.88, Math.max(1, 1.5 * sc), [0.3, 0.4, 0.15, 1]);
        }
      },
      "rootstalker": (rdr, ctx) => {
        const { sc, x, y, r, ownStealthAlpha, accent } = ctx;
        {
          rdr.circle(x, y + r * 0.14, r * 0.72, [0.43, 0.31, 0.18, 1], 12);
          for (let k = 0; k < 5; k++) {
            const a = -Math.PI * 0.85 + k * 0.42;
            rdr.line(x, y + r * 0.15, x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, Math.max(1.5, 2.2 * sc), [0.36, 0.23, 0.12, 1]);
          }
          rdr.circle(x, y - r * 0.34, r * 0.32, [0.5, 0.34, 0.18, ownStealthAlpha], 10);
          rdr.crestTriangle(x, y - r * 0.82, r * 0.2, accent, -Math.PI / 2);
        }
      },
      "pillbug": (rdr, ctx) => {
        const { sc, x, y, r, team, teamDark, accent, attack, dir, motion } = ctx;
        {
          rdr.circle(x, y, r * 0.88, [0.13, 0.16, 0.18, 1], 14);
          rdr.circle(x, y, r * 0.76, team, 14);
          rdr.part("radial", () => {
            for (let k = 0; k < 6; k++) {
              const a = k * Math.PI / 3;
              rdr.line(
                x + Math.cos(a) * r * 0.18,
                y + Math.sin(a) * r * 0.18,
                x + Math.cos(a) * r * 0.72,
                y + Math.sin(a) * r * 0.72,
                Math.max(1.3, 2.2 * sc),
                teamDark
              );
            }
          }, motion.parts.radial);
          rdr.part("pulse", () => rdr.circle(x + r * 0.62, y + dir * r * 0.14, r * 0.26, accent, 10), motion.parts.pulse);
          rdr.circle(x + r * 0.68, y + dir * r * 0.1, r * 0.1, [1, 0.94, 0.72, 1], 8);
          if (attack) rdr.circle(x, y, r * 1.08, [1, 0.66, 0.22, 0.12], 16);
        }
      },
      "mantis": (rdr, ctx) => {
        const { own, sc, x, y, r, cloaked, accent, attack, dir } = ctx;
        {
          rdr.poly([
            [x - r * 0.88, y + r * 0.42],
            [x - r * 0.42, y - r * 0.38],
            [x, y - r * 0.78],
            [x + r * 0.42, y - r * 0.38],
            [x + r * 0.88, y + r * 0.42],
            [x, y + r * 0.7]
          ], [0.26, 0.58, 0.28, own && cloaked ? 0.24 : 1]);
          const cut = attack ? r * 0.34 : 0;
          rdr.line(x - r * 0.3, y - r * 0.02, x - r * 1.14, y + dir * (r * 0.7 + cut), Math.max(1.8, 2.8 * sc), accent);
          rdr.line(x + r * 0.3, y - r * 0.02, x + r * 1.14, y + dir * (r * 0.7 + cut), Math.max(1.8, 2.8 * sc), accent);
          rdr.crestTriangle(x - r * 1.2, y + dir * (r * 0.78 + cut), r * 0.18, accent, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
          rdr.crestTriangle(x + r * 1.2, y + dir * (r * 0.78 + cut), r * 0.18, accent, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
        }
      },
      "clawhunter": (rdr, ctx) => {
        const { sc, x, y, r, ownStealthAlpha, team, accent, attack, dir } = ctx;
        {
          rdr.circle(x, y + r * 0.08, r * 0.72, team, 12);
          rdr.circle(x, y - r * 0.38, r * 0.36, [0.48, 0.25, 0.12, ownStealthAlpha], 10);
          const reach = attack ? r * 0.32 : 0;
          rdr.line(x - r * 0.3, y, x - r * 1.15, y + dir * (r * 0.36 + reach), Math.max(2, 3.4 * sc), accent);
          rdr.line(x + r * 0.3, y, x + r * 1.15, y + dir * (r * 0.36 + reach), Math.max(2, 3.4 * sc), accent);
          rdr.crestTriangle(x - r * 1.2, y + dir * (r * 0.4 + reach), r * 0.24, accent, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
          rdr.crestTriangle(x + r * 1.2, y + dir * (r * 0.4 + reach), r * 0.24, accent, dir < 0 ? -Math.PI / 2 : Math.PI / 2);
        }
      },
      "chainflower": (rdr, ctx) => {
        const { x, y, r, team, accent } = ctx;
        {
          rdr.petalRing(x, y, r * 0.58, 7, accent, Math.PI / 7, 0.72);
          rdr.circle(x, y - r * 0.12, r * 0.36, team, 12);
          rdr.circle(x, y - r * 0.12, r * 0.16, [0.86, 0.96, 1, 1], 10);
        }
      },
      "rocket": (rdr, ctx) => {
        const { sc, x, y, r, teamDark, attack } = ctx;
        rdr.petalRing(x, y + r * 0.16, r * 0.86, 7, [0.38, 0.48, 0.24, 1], Math.PI / 7, 0.72);
        rdr.circle(x, y + r * 0.12, r * 0.6, teamDark, 12);
        const pods = [[-0.48, -0.18], [0.48, -0.18], [-0.28, -0.72], [0.28, -0.72]];
        for (let i = 0; i < 4; i++) {
          const [ox, oy] = pods[i], px = x + ox * r, py = y + oy * r;
          const pulse = attack ? 0.06 + (i + 1) * 0.025 : 0;
          rdr.circle(px, py, r * (0.25 + pulse), [0.58, 0.66, 0.25, 1], 10);
          rdr.petalRing(px, py - r * 0.02, r * (0.18 + pulse), 4, [1, 0.48, 0.3, 1], Math.PI / 4, 0.48);
          rdr.circle(px, py - r * 0.08, r * 0.09, [1, 0.86, 0.38, 1], 8);
          rdr.line(px, py - r * 0.08, px, py - r * (0.42 + (attack ? 0.08 : 0)), Math.max(1.8, 2.7 * sc), [0.42, 0.58, 0.24, 1]);
        }
        if (attack) rdr.circle(x, y - r * 0.28, r * 1.08, [1, 0.52, 0.24, 0.08], 16);
      }
    });
    const AIR_UNIT_VISUAL_RENDER_FNS = Object.freeze({
      "flowerbee": (rdr, c) => {
        const { r, accent, attack, sc, pt, linePts, fastFlap, wingBright, wingSoft, body, bodyDark, motion } = c;
        const flap = 0.78 + 0.28 * fastFlap;
        rdr.part("wings", () => {
          for (const side of [-1, 1]) {
            const root = pt(0.02, side * 0.2), outer = pt(-0.08, side * 0.92 * flap), rear2 = pt(-0.42, side * 0.7 * flap);
            rdr.poly([root, outer, rear2, pt(-0.28, side * 0.18)], wingBright);
            rdr.poly([pt(0.15, side * 0.15), pt(0.32, side * 0.74 * flap), pt(0.02, side * 0.62 * flap), pt(-0.04, side * 0.13)], wingSoft);
          }
        }, motion.parts.wings);
        const rear = pt(-0.4, 0), mid = pt(0.02, 0), head = pt(0.43, 0), sting = pt(-0.86, 0);
        rdr.circle(rear[0], rear[1], r * 0.48, [0.78, 0.54, 0.16, 1], 11);
        rdr.circle(mid[0], mid[1], r * 0.46, body, 11);
        rdr.circle(head[0], head[1], r * 0.32, bodyDark, 9);
        for (const f of [-0.58, -0.38, -0.18]) {
          const a = pt(f, -0.31), b = pt(f, 0.31);
          linePts(a, b, Math.max(1.2, 1.9 * sc), [0.22, 0.16, 0.08, 0.92]);
        }
        linePts(pt(-0.62, 0), sting, Math.max(1.2, 1.8 * sc), accent);
        if (attack) {
          const a = pt(0.5, 0), b = pt(1.12, 0);
          linePts(a, b, Math.max(1.6, 2.5 * sc), [1, 0.86, 0.34, 0.88]);
          rdr.circle(b[0], b[1], r * 0.11, [1, 0.93, 0.54, 0.72], 7);
        }
      },
      "sporemoth": (rdr, c) => {
        const { r, attack, pt, slowFlap, wingSoft, body, bodyDark, motion } = c;
        const flap = 0.86 + 0.15 * slowFlap;
        rdr.part("wings", () => {
          for (const side of [-1, 1]) rdr.poly([pt(0.18, side * 0.12), pt(0.02, side * 0.98 * flap), pt(-0.54, side * 0.82 * flap), pt(-0.68, side * 0.28), pt(-0.2, side * 0.08)], wingSoft);
        }, motion.parts.wings);
        rdr.circle(...pt(-0.06, 0), r * 0.48, bodyDark, 11);
        rdr.circle(...pt(0.32, 0), r * 0.27, body, 9);
        const sac = pt(-0.48, 0);
        rdr.part("sac", () => {
          rdr.circle(sac[0], sac[1], r * 0.34, [0.67, 0.4, 0.82, 0.98], 11);
          rdr.circle(sac[0], sac[1], r * 0.17, [0.88, 0.72, 1, 0.86], 9);
        }, motion.parts.sac);
        if (attack) rdr.circle(sac[0], sac[1], r * 0.62, [0.72, 0.5, 0.92, 0.1], 14);
      }
    });
    const polygonTemplates = /* @__PURE__ */ new Map(), colorCache = /* @__PURE__ */ new Map();
    function css(c) {
      const key = c.join(",");
      if (colorCache.has(key)) return colorCache.get(key);
      const value = `rgba(${Math.round(RangeUtil.clamp(c[0], 0, 1) * 255)},${Math.round(RangeUtil.clamp(c[1], 0, 1) * 255)},${Math.round(RangeUtil.clamp(c[2], 0, 1) * 255)},${RangeUtil.clamp(c[3] ?? 1, 0, 1)})`;
      colorCache.set(key, value);
      return value;
    }
    function directions(n, rot = 0) {
      const key = n + "|" + rot;
      if (polygonTemplates.has(key)) return polygonTemplates.get(key);
      const pts = Array.from({ length: n }, (_, i) => [Math.cos(rot + i / n * Math.PI * 2), Math.sin(rot + i / n * Math.PI * 2)]);
      polygonTemplates.set(key, pts);
      return pts;
    }
    class UnitArtPainter extends globalThis.BloomGamekitRendering.PrimitivePainter {
      constructor(ctx) {
        super(ctx);
        this.ctx = ctx;
        this._partTransform = null;
        this._unitRenderAlphaMul = 1;
        this.alphaMultiplier = () => this._unitRenderAlphaMul;
      }
      point(x, y) {
        const m = this._partTransform;
        if (m) {
          const px = x;
          x = m[0] * px + m[2] * y + m[4];
          y = m[1] * px + m[3] * y + m[5];
        }
        return [x, y];
      }
      part(name, paint, options = {}) {
        if (options.visible === false) return;
        const previous = this._partTransform;
        this._partTransform = options.transform || null;
        try {
          return paint();
        } finally {
          this._partTransform = previous;
        }
      }
      outlineCircle(x, y, r, w, c, segments = 56, dashEvery = 0) {
        const pts = directions(segments);
        for (let i = 0; i < segments; i++) {
          if (dashEvery > 0 && i % dashEvery !== 0) continue;
          const j = (i + 1) % segments;
          this.line(x + pts[i][0] * r, y + pts[i][1] * r, x + pts[j][0] * r, y + pts[j][1] * r, w, c);
        }
      }
      petalRing(x, y, r, count, c, rot = 0, stretch = 0.62) {
        const dirs = directions(count, rot), ca = Math.cos(Math.PI * 0.48), sa = Math.sin(Math.PI * 0.48), rr = r * 0.42;
        for (let i = 0; i < count; i++) {
          const [dx, dy] = dirs[i], cx = x + dx * r, cy = y + dy * r;
          const ppx = dx * ca - dy * sa, ppy = dx * sa + dy * ca, pmx = dx * ca + dy * sa, pmy = -dx * sa + dy * ca;
          this.quad(cx + dx * rr, cy + dy * rr * stretch, cx + ppx * rr * 0.62, cy + ppy * rr * 0.62, cx - dx * rr * 0.72, cy - dy * rr * 0.72 * stretch, cx + pmx * rr * 0.62, cy + pmy * rr * 0.62, c);
        }
      }
      crestTriangle(x, y, r, c, angle = -Math.PI / 2) {
        this.tri(x + Math.cos(angle) * r, y + Math.sin(angle) * r, x + Math.cos(angle + 2.35) * r * 0.72, y + Math.sin(angle + 2.35) * r * 0.72, x + Math.cos(angle - 2.35) * r * 0.72, y + Math.sin(angle - 2.35) * r * 0.72, c);
      }
    }
    function normalizeTeam(team) {
      return team === "enemy" || team === 1 || team === "red" ? "enemy" : team === "neutral" ? "neutral" : "friendly";
    }
    function assertType(type) {
      if (!RALLY_ART_CONFIG.units[type]) throw new RangeError("Unknown Rally unit: " + type);
      return RALLY_ART_CONFIG.units[type];
    }
    function makeCanvas(w, h = w) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
    }
    function attackValue(opts) {
      return opts.attack ? { progress: opts.attackProgress ?? 0.5 } : false;
    }
    function rotationAbout(angle, x, y) {
      const c = Math.cos(angle), s = Math.sin(angle);
      return [c, s, -s, c, x - c * x + s * y, y - s * x - c * y];
    }
    function scaleAbout(scale, x, y) {
      return [scale, 0, 0, scale, x * (1 - scale), y * (1 - scale)];
    }
    function rotationAboutInto(out, angle, x, y) {
      const c = Math.cos(angle), s = Math.sin(angle);
      out[0] = c;
      out[1] = s;
      out[2] = -s;
      out[3] = c;
      out[4] = x - c * x + s * y;
      out[5] = y - s * x - c * y;
      return out;
    }
    function scaleAboutInto(out, scale, x, y) {
      out[0] = scale;
      out[1] = 0;
      out[2] = 0;
      out[3] = scale;
      out[4] = x * (1 - scale);
      out[5] = y * (1 - scale);
      return out;
    }
    function motionPart(parts, name) {
      return parts[name] || (parts[name] = {});
    }
    function motionTransform(parts, name) {
      const part = motionPart(parts, name);
      return part.transform || (part.transform = new Array(6));
    }
    function motionMorph(parts, name, first, second = 0, visible) {
      const part = motionPart(parts, name), morph = part.morph || (part.morph = [0, 0]);
      morph[0] = first;
      morph[1] = second;
      if (visible !== void 0) part.visible = visible;
      return part;
    }
    function artMotion(type, x, y, r, timeMs, opts, target = null) {
      const parts = target?.parts || {}, pose = opts.meshPose, hash = artTypeHashes[type], seed = hash % 997 * 0.017, motion = target || { parts };
      motion.parts = parts;
      motion.fastFlap = pose ?? 0.5 + 0.5 * Math.sin(timeMs * 0.026 + seed);
      motion.slowFlap = pose ?? opts.slowFlap ?? 0.5 + 0.5 * Math.sin(timeMs * 0.01 + seed);
      if (type === "dandelion") rotationAboutInto(motionTransform(parts, "spokes"), timeMs * 5e-4, x, y - r * 0.3);
      else if (type === "mage") for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + timeMs * 15e-4, m = motionTransform(parts, "orb-" + k);
        m[0] = 1;
        m[1] = 0;
        m[2] = 0;
        m[3] = 1;
        m[4] = Math.cos(a) * r * 0.72;
        m[5] = Math.sin(a) * r * 0.72;
      }
      else if (type === "pillbug") {
        rotationAboutInto(motionTransform(parts, "radial"), timeMs * 0.012 + hash % 997 * 0.01, x, y);
        scaleAboutInto(motionTransform(parts, "pulse"), 0.82 + 0.18 * Math.sin(timeMs * 0.012 + hash % 17), x + r * 0.62, y - r * 0.14);
      } else if (type === "flowerbee") motionMorph(parts, "wings", motion.fastFlap);
      else if (type === "sporemoth") {
        motionMorph(parts, "wings", motion.slowFlap);
        scaleAboutInto(motionTransform(parts, "sac"), opts.attack ? 1.22 : 0.94 + 0.08 * Math.sin(timeMs * 7e-3 + seed), x, y + r * 0.48);
      } else if (type === "shelltitan") {
        motion.attackPhase = pose ?? Math.sin(Math.min(1, Number(opts.attackProgress) || 0.5) * Math.PI);
        motionMorph(parts, "attack-aura", motion.attackPhase);
      } else if (type === "siege") {
        const deploying = opts.deployProgress != null && opts.deployProgress < 1, q = deploying ? RangeUtil.clamp(opts.deployProgress, 0, 1) : opts.deployed ? 1 : 0;
        const ease = motion.ease = pose ?? q * q * (3 - 2 * q), hull = motion.hullTransform || (motion.hullTransform = new Array(6));
        rotationAboutInto(hull, (opts.hullFacing ?? -Math.PI / 2) + Math.PI / 2, x, y);
        const common = motionPart(parts, "common-body");
        common.transform = rotationAboutInto(motionTransform(parts, "common-body"), (opts.commonFacing ?? opts.hullFacing ?? -Math.PI / 2) + Math.PI / 2, x, y);
        parts.feedback = common;
        for (let i = 0; i < 3; i++) {
          motionMorph(parts, "hull-leg-" + i, ease).transform = hull;
          motionMorph(parts, "hull-detail-" + i, ease, 0, ease > 0.3).transform = hull;
        }
        motionMorph(parts, "hull-body", ease).transform = hull;
        rotationAboutInto(motionTransform(parts, "turret"), (opts.turretFacing ?? -Math.PI / 2) + Math.PI / 2, x, y - r * 0.08 - r * 0.3 * ease);
        motionMorph(parts, "turret", ease);
        motionMorph(parts, "deployment-halo", ease, 0, deploying && ease > 0);
      }
      return motion;
    }
    class MeshArtCompiler extends UnitArtPainter {
      constructor() {
        super(new globalThis.BloomGamekitRendering.MeshBuilder());
        this.parts = [];
        this.baseIndex = 0;
      }
      flushPart(name) {
        if (this.ctx.vertices.length) this.parts.push({ name, builder: this.ctx });
        this.ctx = new globalThis.BloomGamekitRendering.MeshBuilder();
        this.context = this.ctx;
      }
      part(name, paint) {
        this.flushPart("base-" + this.baseIndex++);
        paint();
        this.flushPart(name);
      }
      finish() {
        this.flushPart("base-" + this.baseIndex++);
        return this.parts;
      }
    }
    const meshArtCaches = /* @__PURE__ */ new WeakMap(), meshArtTotals = { meshes: 0, bytes: 0, hits: 0, misses: 0, evictions: 0 };
    const morphedUnitArt = /* @__PURE__ */ new Set(["flowerbee", "sporemoth", "siege", "shelltitan"]);
    const staticMeshPart = Object.freeze({});
    const artTypeHashes = Object.freeze(Object.fromEntries(Object.keys(RALLY_ART_CONFIG.units).map((type) => [type, HashUtil.hash(type)])));
    const artPaletteIds = /* @__PURE__ */ new WeakMap();
    let nextArtPaletteId = 1;
    function artPaletteId(palette) {
      if (!palette || typeof palette !== "object") return 0;
      let id = artPaletteIds.get(palette);
      if (!id) {
        id = nextArtPaletteId++;
        artPaletteIds.set(palette, id);
      }
      return id;
    }
    function dropMeshArt(ctx, cache, key) {
      const entry = cache.entries.get(key);
      if (!entry) return;
      ctx.deleteMesh(entry.mesh);
      cache.entries.delete(key);
      cache.meshes--;
      cache.bytes -= entry.bytes;
      meshArtTotals.meshes--;
      meshArtTotals.bytes -= entry.bytes;
    }
    function disposeMeshes(ctx) {
      const cache = meshArtCaches.get(ctx);
      if (!cache) return;
      for (const key of cache.entries.keys()) dropMeshArt(ctx, cache, key);
      meshArtCaches.delete(ctx);
    }
    function meshArtEntry(ctx, type, team, r, opts, fast = false, angle = 0, rotation = 0) {
      let cache = meshArtCaches.get(ctx);
      if (!cache) {
        cache = { entries: /* @__PURE__ */ new Map(), meshes: 0, bytes: 0, clock: 0 };
        meshArtCaches.set(ctx, cache);
      }
      const palette = opts.factionPalette || RALLY_ART_CONFIG.palettes[team];
      const key = type + "|" + team + "|" + r + "|" + artPaletteId(palette) + "|" + (Number(!!opts.attack) | Number(!!opts.hit) << 1 | Number(!!(fast ? false : opts.cloaked)) << 2);
      let entry = cache.entries.get(key);
      if (entry) {
        meshArtTotals.hits++;
        entry.lastUsed = ++cache.clock;
      } else {
        meshArtTotals.misses++;
        let buildOpts = opts;
        if (fast) {
          buildOpts = cache.buildOptions || (cache.buildOptions = {});
          for (const name of Object.keys(buildOpts)) delete buildOpts[name];
          Object.assign(buildOpts, opts);
          buildOpts.cloaked = false;
          if (type === "siege") {
            buildOpts.hullFacing = opts.hullFacing ?? angle;
            buildOpts.turretFacing = opts.turretFacing ?? angle;
            buildOpts.commonFacing = angle;
          }
          if (Number.isFinite(opts.hullFacing)) buildOpts.hullFacing = opts.hullFacing - rotation;
          if (Number.isFinite(opts.turretFacing)) buildOpts.turretFacing = opts.turretFacing - rotation;
        }
        const first = new MeshArtCompiler(buildOpts), needsMorph = morphedUnitArt.has(type), second = needsMorph ? new MeshArtCompiler(buildOpts) : null;
        composeRecipe(first, type, team, 0, 0, r, 0, { ...buildOpts, meshPose: 0 });
        if (second) composeRecipe(second, type, team, 0, 0, r, 0, { ...buildOpts, meshPose: 1 });
        const a = first.finish(), b = second ? second.finish() : a;
        if (a.length !== b.length) throw new Error("Rally mesh part topology differs: " + type);
        const data = a.map((part, i) => {
          if (part.name !== b[i].name) throw new Error("Rally mesh part order differs: " + type);
          return { name: part.name, geometry: part.builder.build({ morphs: needsMorph ? [b[i].builder] : [] }) };
        });
        const geometry = globalThis.BloomGamekitRendering.MeshBuilder.combine(data.map((part) => part.geometry));
        const bytes = geometry.vertices.byteLength, limits = RALLY_ART_CONFIG.limits;
        if (limits.meshCacheMeshes < 1 || bytes > limits.meshCacheBytes) throw new RangeError("Rally unit mesh exceeds retained cache budget");
        while (cache.entries.size && (cache.meshes + 1 > limits.meshCacheMeshes || cache.bytes + bytes > limits.meshCacheBytes)) {
          let oldestKey = null, oldestUse = Infinity;
          for (const [candidateKey, candidate] of cache.entries) if (candidate.lastUsed < oldestUse) {
            oldestKey = candidateKey;
            oldestUse = candidate.lastUsed;
          }
          if (oldestKey === null) throw new Error("Rally mesh cache eviction candidate missing");
          dropMeshArt(ctx, cache, oldestKey);
          meshArtTotals.evictions++;
        }
        entry = { mesh: ctx.createMesh(geometry), parts: data.map((part) => part.name), bytes, lastUsed: ++cache.clock };
        cache.entries.set(key, entry);
        cache.meshes++;
        cache.bytes += bytes;
        meshArtTotals.meshes++;
        meshArtTotals.bytes += bytes;
      }
      return entry;
    }
    function retainedArt(ctx, type, team, x, y, r, timeMs, opts) {
      const entry = opts.meshArtEntry || meshArtEntry(ctx, type, team, r, opts);
      const sample = opts.meshArtSample || meshArtSample(entry, artMotion(type, 0, 0, r, timeMs, opts));
      if (x || y) {
        ctx.save();
        ctx.translate(x, y);
      }
      try {
        ctx.drawMesh(entry.mesh, sample);
      } finally {
        if (x || y) ctx.restore();
      }
    }
    function meshArtSample(entry, motion) {
      let sample = entry.sample;
      if (!sample) sample = entry.sample = { parts: new Array(entry.parts.length) };
      for (let i = 0; i < entry.parts.length; i++) {
        const name = entry.parts[i];
        sample.parts[i] = motion.parts[name] || staticMeshPart;
      }
      return sample;
    }
    function drawRetainedFast(ctx, type, team, x, y, radius, facing, timeMs, opts) {
      assertType(type);
      team = normalizeTeam(team);
      timeMs = (Number(timeMs) || 0) + (Number(opts.phaseOffsetMs) || 0);
      const outerAlpha = ctx.globalAlpha ?? 1, stealth = team === "friendly" && opts.cloaked ? 0.3 : 1, alpha = outerAlpha * RangeUtil.clamp(opts.alpha ?? 1, 0, 1) * stealth;
      if (alpha <= 0) return;
      const angle = resolvedAngle(type, team, facing, opts), rotation = type === "siege" ? 0 : angle + Math.PI / 2, theta = rotation + (opts.poseTilt || 0), stretch = RangeUtil.clamp(opts.poseStretch || 1, 0.55, 1.65), sx = (opts.feedbackX || 1) * stretch, sy = (opts.feedbackY || 1) / stretch, c = Math.cos(theta), s = Math.sin(theta), a = c * sx, b = s * sx, cc = -s * sy, d = c * sy;
      const entry = meshArtEntry(ctx, type, team, radius, opts, true, angle, rotation), localOpts = entry.motionOptionsScratch || (entry.motionOptionsScratch = {});
      localOpts.meshPose = opts.meshPose;
      localOpts.slowFlap = opts.slowFlap;
      localOpts.attack = opts.attack;
      localOpts.attackProgress = opts.attackProgress;
      localOpts.deployProgress = opts.deployProgress;
      localOpts.deployed = opts.deployed;
      localOpts.cloaked = false;
      localOpts.hullFacing = type === "siege" ? opts.hullFacing ?? angle : Number.isFinite(opts.hullFacing) ? opts.hullFacing - rotation : void 0;
      localOpts.commonFacing = type === "siege" ? angle : void 0;
      localOpts.turretFacing = type === "siege" ? opts.turretFacing ?? angle : Number.isFinite(opts.turretFacing) ? opts.turretFacing - rotation : void 0;
      const motion = entry.motionScratch || (entry.motionScratch = { parts: {} }), sample = meshArtSample(entry, artMotion(type, 0, 0, radius, timeMs, localOpts, motion)), grouped = alpha < 0.999999;
      if (grouped) {
        ctx.beginGroup(alpha, ctx.groupBounds(x, y, radius * 4.4));
        ctx.globalAlpha = 1;
      }
      let saved = false;
      try {
        ctx.save();
        saved = true;
        if (opts.whiteFlash) ctx.filter = "brightness(0) invert(1)";
        ctx.transform(a, b, cc, d, x, y);
        if (opts.gradeOutline) ctx.drawMeshSilhouette(entry.mesh, { parts: sample.parts, color: opts.gradeOutline, width: Math.max(1, radius * 0.085), radius: 128 });
        else ctx.drawMesh(entry.mesh, { parts: sample.parts });
      } finally {
        if (saved) ctx.restore();
        if (grouped) {
          ctx.endGroup();
          ctx.globalAlpha = outerAlpha;
        }
      }
    }
    function composeOutlined(ctx, type, team, x, y, r, timeMs, opts) {
      if (ctx.isBloomWebGL) {
        const entry = opts.meshArtEntry || meshArtEntry(ctx, type, team, r, opts), sample = opts.meshArtSample || meshArtSample(entry, artMotion(type, 0, 0, r, timeMs, opts));
        return ctx.drawMeshSilhouette(entry.mesh, { parts: sample.parts, color: opts.gradeOutline, width: Math.max(1, r * 0.085), radius: 128 });
      }
      const size = Math.ceil(r * 6 + 12), half = size / 2, body = makeCanvas(size), b = body.getContext("2d");
      compose(b, type, team, half, half, r, timeMs, { ...opts, gradeOutline: null });
      const mask = makeCanvas(size), m = mask.getContext("2d");
      m.drawImage(body, 0, 0);
      m.globalCompositeOperation = "source-in";
      m.fillStyle = opts.gradeOutline;
      m.fillRect(0, 0, size, size);
      const width = Math.max(1, r * 0.085);
      ctx.save();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.drawImage(mask, x - half + Math.cos(a) * width, y - half + Math.sin(a) * width);
      }
      ctx.drawImage(body, x - half, y - half);
      ctx.restore();
    }
    function compose(ctx, type, team, x, y, r, timeMs, opts = {}) {
      if (opts.gradeOutline) return composeOutlined(ctx, type, team, x, y, r, timeMs, opts);
      if (ctx.isBloomWebGL) return retainedArt(ctx, type, team, x, y, r, timeMs, opts);
      return composeRecipe(new UnitArtPainter(ctx, opts), type, team, x, y, r, timeMs, opts);
    }
    function composeRecipe(rdr, type, team, x, y, r, timeMs, opts) {
      const d = assertType(type), own = team === "friendly", palette = opts.factionPalette || RALLY_ART_CONFIG.palettes[team];
      const ownStealthAlpha = own && opts.cloaked ? 0.3 : 1;
      const tint = (c2) => ownStealthAlpha < 1 ? [...c2.slice(0, 3), ownStealthAlpha] : c2;
      const body = tint(palette.body), teamDark = tint(palette.dark), teamLight = tint(palette.light);
      const accent = d.accent || teamLight, attack = attackValue(opts), sc = r / (d.size * 1.56 * d.visualScale);
      const u = { id: type, type, side: own ? 0 : 1 };
      rdr._unitRenderAlphaMul = ownStealthAlpha;
      const motion = artMotion(type, x, y, r, timeMs, opts);
      const c = { u, own, d, sc, neutral: team === "neutral", x, y, r, airUnit: d.layer === "AIR", ownStealthAlpha, cloaked: !!opts.cloaked, team: body, teamDark, teamLight, factionPalette: palette, accent, attack, hit: !!opts.hit, dir: -1, motion };
      if (d.layer === "AIR") {
        const fx = 0, fy = -1, sx = 1, sy = 0;
        const pt = (forward = 0, side = 0) => [x + fx * forward * r + sx * side * r, y + fy * forward * r + sy * side * r];
        const linePts = (a, b, w, color2) => rdr.line(a[0], a[1], b[0], b[1], w, color2);
        const now = timeMs, seed = HashUtil.hash(u.id) % 997 * 0.017;
        const { fastFlap, slowFlap } = motion;
        const wingBright = [Math.min(1, accent[0] + 0.18), Math.min(1, accent[1] + 0.18), Math.min(1, accent[2] + 0.18), 0.72];
        const wingSoft = [Math.min(1, accent[0] + 0.12), Math.min(1, accent[1] + 0.12), Math.min(1, accent[2] + 0.12), 0.42];
        AIR_UNIT_VISUAL_RENDER_FNS[type](rdr, { ...c, fx, fy, sx, sy, pt, linePts, now, seed, fastFlap, slowFlap, wingBright, wingSoft, body, bodyDark: teamDark, delta: { x: 0, y: 0 } });
      } else {
        if (d.commonGroundBody !== false) {
          const b = RALLY_ART_CONFIG.commonBody;
          const paintBody = () => {
            rdr.circle(x, y + r * b.outerY, r * b.outerRadius, b.ink, 12);
            rdr.circle(x, y + r * b.bodyY, r * b.bodyRadius, body, 12);
            rdr.circle(x + r * b.highlightX, y + r * b.highlightY, r * b.highlightRadius, teamLight, 10);
          };
          if (type === "siege") rdr.part("common-body", paintBody, motion.parts["common-body"]);
          else paintBody();
        }
        UNIT_VISUAL_RENDER_FNS[type](rdr, c);
      }
      const paintFeedback = () => {
        if (opts.hit) rdr.circle(x, y, r * 1.42, [1, 0.94, 0.75, 0.18], 12);
        if (attack) rdr.circle(x, y, r * 1.22, [1, 0.73, 0.22, 0.07], 10);
      };
      if (type === "siege") rdr.part("feedback", paintFeedback, motion.parts.feedback);
      else paintFeedback();
    }
    const thumbnails = /* @__PURE__ */ new Map();
    function clearCache() {
      thumbnails.clear();
    }
    function resolvedAngle(type, team, facing, opts) {
      const d = RALLY_ART_CONFIG.units[type];
      if (Number.isFinite(facing) && (!opts.respectOriginalFacing || d.facing === "full" || d.layer === "AIR")) return facing;
      return d.facing === "full" || d.layer === "AIR" ? team === "enemy" ? Math.PI / 2 : -Math.PI / 2 : -Math.PI / 2;
    }
    const visualExtentRadius = Object.freeze({ lancer:2.1, swordsman: 1.8, archer: 1.7, dandelion: 1.3, skirmisher: 1.9, tank: 1.3, medic: 1.3, mage: 1.3, flowerbee: 1.5, rogue: 1.7, guardshroom: 1.3, siege: 3.5, shelltitan: 1.7, shellbug: 1.3, pikeman: 3.1, stingbug: 2.1, fireant: 1.5, kickhopper: 2.5, rootstalker: 1.4, pillbug: 1.3, sporemoth: 1.3, mantis: 2.1, clawhunter: 1.9, chainflower: 1.3, rocket: 1.8 });
    function visualExtent(type) {
      assertType(type);
      return visualExtentRadius[type];
    }
    function draw(ctx, type, team, x, y, radius, facing, timeMs = 0, opts = {}) {
      if (!ctx || !Number.isFinite(radius) || radius <= 0) return;
      if (ctx.isBloomWebGL && !opts.shadow && typeof ctx.transform === "function") return drawRetainedFast(ctx, type, team, x, y, radius, facing, timeMs, opts);
      assertType(type);
      team = normalizeTeam(team);
      timeMs = (Number(timeMs) || 0) + (Number(opts.phaseOffsetMs) || 0);
      const outerAlpha = ctx.globalAlpha ?? 1, stealth = team === "friendly" && opts.cloaked ? 0.3 : 1, alpha = outerAlpha * RangeUtil.clamp(opts.alpha ?? 1, 0, 1) * stealth;
      if (ctx.isBloomWebGL && alpha <= 0) return;
      if (ctx.isBloomWebGL && alpha < 0.999999) {
        ctx.beginGroup(alpha, ctx.groupBounds(x, y, radius * 4.4));
        ctx.globalAlpha = 1;
      }
      const angle = resolvedAngle(type, team, facing, opts), rotation = type === "siege" ? 0 : angle + Math.PI / 2;
      ctx.save();
      if (opts.whiteFlash) ctx.filter = "brightness(0) invert(1)";
      ctx.translate(x, y);
      ctx.rotate(rotation + (opts.poseTilt || 0));
      ctx.scale(opts.feedbackX || 1, opts.feedbackY || 1);
      if (!ctx.isBloomWebGL) ctx.globalAlpha *= RangeUtil.clamp(opts.alpha ?? 1, 0, 1);
      if (opts.shadow) {
        ctx.save();
        ctx.rotate(-rotation);
        ctx.fillStyle = "rgba(4,13,9,.24)";
        ctx.beginPath();
        ctx.ellipse(0, radius * 0.45, radius * 0.84, radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const stretch = RangeUtil.clamp(opts.poseStretch || 1, 0.55, 1.65);
      ctx.scale(stretch, 1 / stretch);
      const localOpts = { ...opts };
      if (ctx.isBloomWebGL && opts.cloaked) localOpts.cloaked = false;
      if (type === "siege") {
        localOpts.hullFacing = opts.hullFacing ?? angle;
        localOpts.turretFacing = opts.turretFacing ?? angle;
        localOpts.commonFacing = angle;
      }
      if (Number.isFinite(opts.hullFacing)) localOpts.hullFacing = opts.hullFacing - rotation;
      if (Number.isFinite(opts.turretFacing)) localOpts.turretFacing = opts.turretFacing - rotation;
      if (ctx.isBloomWebGL) {
        localOpts.meshArtEntry = meshArtEntry(ctx, type, team, radius, localOpts);
        localOpts.meshArtSample = meshArtSample(localOpts.meshArtEntry, artMotion(type, 0, 0, radius, timeMs, localOpts));
      }
      compose(ctx, type, team, 0, 0, radius, timeMs, localOpts);
      ctx.restore();
      if (ctx.isBloomWebGL && alpha < 0.999999) {
        ctx.endGroup();
        ctx.globalAlpha = outerAlpha;
      }
    }
    function canvas(type, team = "friendly", opts = {}) {
      const size = Math.max(16, Math.round(opts.size || 128)), c = makeCanvas(size), ctx = c.getContext("2d");
      if (opts.radius != null) {
        draw(ctx, type, team, size / 2, size / 2, opts.radius, opts.facing ?? -Math.PI / 2, opts.timeMs ?? 0, { ...opts, direct: true });
        return c;
      }
      const work = makeCanvas(256), wc = work.getContext("2d");
      draw(wc, type, team, 128, 128, 32, opts.facing ?? -Math.PI / 2, opts.timeMs ?? 0, { ...opts, direct: true });
      const pixels = wc.getImageData(0, 0, 256, 256).data;
      let left = 256, top = 256, right = -1, bottom = -1;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (pixels[(y * 256 + x) * 4 + 3] > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
      if (right < left) return c;
      const w = right - left + 1, h = bottom - top + 1, pad = opts.padding ?? size * 0.085, scale = (size - pad * 2) / Math.max(w, h), dw = w * scale, dh = h * scale;
      ctx.drawImage(work, left, top, w, h, (size - dw) / 2, (size - dh) / 2, dw, dh);
      return c;
    }
    function thumbnail(type, team = "friendly", opts = {}) {
      const key = type + "|" + team + "|" + JSON.stringify(opts);
      if (thumbnails.has(key)) return thumbnails.get(key);
      const result = canvas(type, team, opts).toDataURL("image/png");
      if (thumbnails.size >= RALLY_ART_CONFIG.limits.thumbnailCacheEntries) thumbnails.clear();
      thumbnails.set(key, result);
      return result;
    }
    function stats2() {
      return { backend: "retained-mesh", thumbnails: thumbnails.size, meshes: { ...meshArtTotals } };
    }
    RALLY_ART_CONFIG.renderers = { ground: UNIT_VISUAL_RENDER_FNS, air: AIR_UNIT_VISUAL_RENDER_FNS };
    global.RALLY_ART_CONFIG = RALLY_ART_CONFIG;
    global.RallyArt = { draw, visualExtent, thumbnail, canvas, clearCache, disposeMeshes, stats: stats2, config: RALLY_ART_CONFIG, types: RALLY_ART_CONFIG.types };
  })(typeof window !== "undefined" ? window : globalThis);
  var BudmoriArt = globalThis.RallyArt;


export {BudmoriArt};
