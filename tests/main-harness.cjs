const {engine}=require('./native-engine.cjs'),hook=require('./main-runtime-hook.cjs');
function session(file,html,{tickRate=10}={}){
 const program=require('./runtime-source.cjs').materialize(file,html);const e=engine(file,program.replace('/* MAIN_RUNTIME_TEST_HOOK */',hook));const messages=[];
 e.c.BLOOM_MAIN_TEST_MANUAL=true;e.c.localStorage={getItem(){return null},setItem(key,disk){messages.push({type:'disk',disk,tick:JSON.parse(disk).tick})}};
 e.run('bloomMainRuntime()');
 const request=async(type,data={})=>{e.c.qaType=type;e.c.qaData=data;return e.run('__budmoriTest.request(qaType,qaData)')};
 return{e,messages,request,get mirror(){return{state:e.run('state'),projectiles:e.run('projectiles')}},init(disk){return request('init',{tickRate,seed:12345,disk})},control(p={}){return request('control',{playing:true,paused:false,modalKind:'',input:{x:0,y:0,manual:true},...p})},read(expression){return request('__read',{expression})},fixture(source){return request('__fixture',{source})},tick(count=1){return request('testTicks',{count})},command(command){return request('command',{command})},close(){return request('close')}};
}
module.exports={session};
