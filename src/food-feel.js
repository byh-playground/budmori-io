const $=id=>document.getElementById(id);
  export class FoodFeel {
    constructor(requestFeed){
      this.button=$("feed");this.pips=[...this.button.querySelectorAll(".tap-pip")];
      this.completeUntil=0;this.pulseUntil=0;this.animations=new Map();this.voices=new Set();this.lastSound={};this.frameId=0;this.soundFrame={};this.muted=false;this.peakVoices=0;this.counts={manual:0,auto:0,complete:0,land:0,eat:0};this.reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
      try{this.muted=localStorage.getItem("budmori.food.muted")==="true"}catch{}
      this.updateSoundButton();$("sound").onclick=()=>{this.muted=!this.muted;this.unlock();this.silence();try{localStorage.setItem("budmori.food.muted",String(this.muted))}catch{}this.updateSoundButton()};
      const pointers=new Set();
      this.button.addEventListener("pointerdown",e=>{if(e.button!==0)return;e.preventDefault();this.unlock();pointers.add(e.pointerId);this.button.setPointerCapture(e.pointerId);this.animate(this.button,[{transform:"scale(1)"},{transform:this.reduced?"scale(1)":"scale(1.035,.94)"}],75);});
      this.button.addEventListener("pointerup",e=>{if(!pointers.delete(e.pointerId))return;e.preventDefault();const r=this.button.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)requestFeed();if(this.button.hasPointerCapture(e.pointerId))this.button.releasePointerCapture(e.pointerId);});
      const cancel=e=>pointers.delete(e.pointerId);this.button.addEventListener("pointercancel",cancel);this.button.addEventListener("lostpointercapture",cancel);
      window.addEventListener("blur",()=>{pointers.clear();this.silence()});document.addEventListener("visibilitychange",()=>{if(document.hidden){pointers.clear();this.silence()}});
      window.addEventListener("pagehide",()=>{this.silence();for(const a of this.animations.values())a.cancel();this.animations.clear();this.audio?.close().catch(()=>{})});
    }
    updateSoundButton(){const b=$("sound");b.textContent=this.muted?"♪̸":"♪";b.setAttribute("aria-pressed",!this.muted);b.setAttribute("aria-label",this.muted?"소리 켜기":"소리 끄기")}
    unlock(){if(this.muted)return;try{if(!this.audio){this.audio=new AudioContext();this.master=this.audio.createGain();this.master.gain.value=.22;this.master.connect(this.audio.destination)}if(this.audio.state==="suspended")this.audio.resume().catch(()=>{})}catch{}}
    silence(){for(const v of this.voices){try{v.o.stop()}catch{}}}
    sound(kind,step=0){
      if(this.muted||!this.audio||this.audio.state!=="running"||document.hidden)return;
      const now=this.audio.currentTime,gap=kind==="tap"?.025:kind==="complete"?.055:.09;
      if(this.soundFrame[kind]===this.frameId||now-(this.lastSound[kind]??-99)<gap||this.voices.size>=4)return;
      this.soundFrame[kind]=this.frameId;this.lastSound[kind]=now;
      const defs={tap:[340+step*65,420+step*65,.055,.14],complete:[520,1040,.12,.20],land:[240,150,.065,.10],eat:[740,990,.09,.09]},[hz,end,duration,gain]=defs[kind];
      const o=this.audio.createOscillator(),g=this.audio.createGain(),v={o,g};o.type=kind==="land"?"sine":"triangle";o.frequency.setValueAtTime(hz,now);o.frequency.exponentialRampToValueAtTime(end,now+duration);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(gain,now+.004);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(this.master);this.voices.add(v);this.peakVoices=Math.max(this.peakVoices,this.voices.size);o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(v)};o.start(now);o.stop(now+duration+.01);
    }
    animate(el,frames,duration){this.animations.get(el)?.cancel();const a=el.animate(frames,{duration,easing:"ease-out"});this.animations.set(el,a);a.onfinish=()=>{if(this.animations.get(el)===a)this.animations.delete(el)}}
    tap(source,complete,remainder){
      this.counts[source]++;const now=performance.now(),manual=source==="manual";
      if(complete){this.counts.complete++;this.completeUntil=now+(manual?190:100)}
      // Automatic ticks never replace a stronger active manual response.
      if(manual||now>this.pulseUntil){this.pulseUntil=now+(manual?150:55);this.button.dataset.impact=complete&&manual?"complete":manual?"manual":"auto";
        this.animate(this.button,[{transform:this.reduced||!manual?"scale(1)":complete?"translateY(3px) scale(1.06,.90)":"scale(1.025,.95)",filter:manual?"brightness(1.16)":"brightness(1.035)"},{transform:"translateY(0) scale(1)",filter:"brightness(1)"}],manual?(complete?210:125):70);
      }
      const pip=this.pips[complete?4:remainder-1];this.animate(pip,[{transform:this.reduced?"scale(1)":"scaleY(1.8)",background:"#fffbea"},{transform:"scaleY(1)",background:complete?"#fff1b9":"#fff1b9"}],manual?160:70);
      for(let i=0;i<5;i++)this.pips[i].classList.toggle("filled",complete||i<remainder);
      if(manual)this.sound(complete?"complete":"tap",remainder);
    }
    event(kind){if(kind==="food-land"||kind==="eat"){const key=kind==="eat"?"eat":"land";this.counts[key]++;this.sound(key)}}
    frame(now){this.frameId++;if(now>this.pulseUntil)this.button.dataset.impact=""}
  }
