import {Garden,Unit,AttackCycle,FarmProgress,CONFIG,TREE_NODES} from './farm-model.js';
// A value snapshot contains all authoritative state; class owners are rehydrated once.
export function snapshot(g){return JSON.parse(JSON.stringify(g,function(key,value){return key==='owner'&&this instanceof AttackCycle?undefined:value instanceof Set?[...value]:value}))}
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function assert(ok){if(!ok)throw new TypeError('올바른 농장 저장 데이터가 아닙니다.')}
function finiteTree(v,depth=0){assert(depth<18);if(typeof v==='number')assert(Number.isFinite(v)&&Math.abs(v)<1e13);else if(Array.isArray(v)){assert(v.length<=1024);v.forEach(x=>finiteTree(x,depth+1))}else if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){assert(!['__proto__','constructor','prototype'].includes(k));finiteTree(x,depth+1)}}else assert(v===null||typeof v==='boolean'||typeof v==='string'&&v.length<256)}
function shape(v,t){assert(v!==null&&typeof v==='object'&&!Array.isArray(v));assert(Object.keys(v).length===Object.keys(t).length);for(const[k,x]of Object.entries(t)){assert(Object.hasOwn(v,k));if(x===null)continue;if(Array.isArray(x)){assert(Array.isArray(v[k]));continue}if(typeof x==='object')shape(v[k],x);else assert(typeof v[k]===typeof x)}}
export function restore(raw){
 finiteTree(raw);const g=new Garden();shape(raw,snapshot(g));assert(integer(raw.seed,0,0xffffffff)&&integer(raw.rng.state,0,0xffffffff));
 assert(['farm','raid'].includes(raw.scene)&&['breed','merge'].includes(raw.mode));assert(raw.units.length<=CONFIG.cap&&raw.food.length<=140&&raw.projectiles.length<=CONFIG.cap);
 assert(integer(raw.nextId,1,1e9)&&integer(raw.foodTaps.remainder,0,4)&&raw.foodTaps.autoClock>=0&&raw.foodTaps.autoClock<.51);
 const ids=new Set();for(const u of raw.units){shape(u,snapshot(new Unit(1,0,1,0,0)));assert(integer(u.id,1,raw.nextId-1)&&!ids.has(u.id));ids.add(u.id);assert(integer(u.species,0,2)&&integer(u.tier,1,4)&&['idle','windup','active','recover'].includes(u.ability.phase));if(u.ability.action){const a=u.ability.action;assert(integer(a.id,1,raw.attackSerial)&&typeof a.hit==='boolean'&&a.target&&Number.isFinite(a.target.x)&&Number.isFinite(a.target.y));assert(typeof a.manual==='boolean'&&a.power>=0&&a.power<=1);if(a.path)validatePath(a.path)}if(u.ability.phase==='active'||u.ability.phase==='windup')assert(u.ability.action!==null);if(u.ability.phase==='active')validatePath(u.ability.action.path)}
 for(const f of raw.food){assert(['flight','bounce','grounded'].includes(f.phase));for(const k of ['x','y','z','vx','vy','vz','tx','ty'])assert(Number.isFinite(f[k]))}
 for(const p of raw.projectiles){validatePath(p.path);assert(integer(p.owner,1,raw.nextId-1));assert(integer(p.species,0,2)&&integer(p.tier,1,4)&&typeof p.hit==='boolean')}
 for(const n of TREE_NODES)assert(integer(raw.progress.levels[n.id],0,4));for(const v of Object.values(raw.progress.records))assert(integer(v,0,1e12));
 assert(['idle','rest','windup','sweep','recover','resting'].includes(raw.boss.phase)&&raw.boss.hp>=0&&raw.boss.hp<=raw.boss.maxHp);
 if(raw.cast){assert(raw.cast.origin&&raw.cast.aim&&Array.isArray(raw.cast.ids)&&typeof raw.cast.owner==='string');assert(raw.cast.ids.every(id=>ids.has(id))&&['mouse','touch'].includes(raw.cast.pointerType)&&raw.cast.radius>0&&raw.cast.radius<=2.5);for(const p of [raw.cast.origin,raw.cast.aim])assert(Number.isFinite(p.x)&&Number.isFinite(p.y));assert(Number.isFinite(raw.cast.elapsed)&&raw.cast.elapsed>=0)}
 Object.assign(g,structuredClone(raw));g.rng=new globalThis.BloomGamekitDeterministic.SeededPRNG(raw.rng.state);g.progress=Object.assign(new FarmProgress(),structuredClone(raw.progress));g.boss.hit=new Set(raw.boss.hit);
 g.units=raw.units.map(data=>{const u=Object.assign(new Unit(data.id,data.species,data.tier,data.x,data.y),structuredClone(data));u.ability=Object.assign(new AttackCycle(u),structuredClone(data.ability));return u});return g;
}
function validatePath(p){assert(p&&p.from&&p.to&&p.duration>0&&Number.isFinite(p.height));for(const k of ['x','y'])assert(Number.isFinite(p.from[k])&&Number.isFinite(p.to[k]));assert(Number.isFinite(p.from.z))}
