/* ============ STUDY ENGINE (shared by index.html + additional.html) ============ */

const $ = s=>document.querySelector(s);
const $$ = s=>document.querySelectorAll(s);
let deck=[], idx=0, flipped=false, starred=new Set(), starredOnly=false;

/* This page's content comes from STUDY_CARDS / STUDY_QUESTIONS (set by the page before app.js loads). */
function curCards(){return STUDY_CARDS;}
function curQs(){return STUDY_QUESTIONS;}

function buildCatFilter(){
  const C=curCards();
  const cats=[...new Set(C.map(c=>c[0]))];
  const sel=$('#catFilter');
  sel.innerHTML='<option value="__all">All categories ('+C.length+')</option>'+
    cats.map(c=>{const n=C.filter(x=>x[0]===c).length;return `<option value="${c}">${c} (${n})</option>`}).join('');
}
function currentSource(){
  let src=curCards().map((c,i)=>({cat:c[0],term:c[1],def:c[2],id:i}));
  const cat=$('#catFilter').value;
  if(cat&&cat!=='__all') src=src.filter(c=>c.cat===cat);
  if(starredOnly) src=src.filter(c=>starred.has(c.id));
  return src;
}
function loadDeck(shuffle){
  deck=currentSource();
  if(shuffle){for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}}
  idx=0; render();
}
function render(){
  const inner=$('#fcInner');
  flipped=false; inner.classList.remove('flipped');
  if(deck.length===0){
    $('#fcCat').textContent=''; $('#fcTerm').textContent='No cards here';
    $('#fcTermBack').textContent=''; $('#fcDef').textContent='Try removing the “Starred only” filter or pick another category.';
    $('#cardCount').textContent='0 / 0'; $('#cardBar').style.width='0%';
    updateStarUI(); return;
  }
  if(idx>=deck.length) idx=deck.length-1;
  const c=deck[idx];
  $('#fcCat').textContent=c.cat;
  $('#fcTerm').textContent=c.term;
  $('#fcTermBack').textContent=c.term;
  $('#fcDef').textContent=c.def;
  $('#cardCount').textContent=(idx+1)+' / '+deck.length;
  $('#cardBar').style.width=((idx+1)/deck.length*100)+'%';
  updateStarUI();
}
function updateStarUI(){
  $('#starCount').textContent=starred.size+' ⭐';
  const c=deck[idx];
  const btn=$('#starCard');
  if(c&&starred.has(c.id)){btn.innerHTML='<span class="star">★</span> Starred';}
  else{btn.innerHTML='<span class="star">☆</span> Star';}
}
$('#fcInner').addEventListener('click',()=>{flipped=!flipped;$('#fcInner').classList.toggle('flipped',flipped);});
$('#nextCard').onclick=()=>{if(idx<deck.length-1){idx++;render();}};
$('#prevCard').onclick=()=>{if(idx>0){idx--;render();}};
function flashHint(msg){
  let t=$('#toast');
  if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=msg; t.classList.add('show');
  clearTimeout(flashHint._t); flashHint._t=setTimeout(()=>t.classList.remove('show'),2800);
}
function setStarredBtn(on){
  const b=$('#starredBtn');
  b.classList.toggle('active',on);
  b.style.background=on?'linear-gradient(90deg,var(--accent),var(--accent2))':'';
  b.style.color=on?'#fff':'';
}
$('#starCard').onclick=(e)=>{e.stopPropagation();const c=deck[idx];if(!c)return;
  const wasStarred=starred.has(c.id);
  if(wasStarred)starred.delete(c.id);else starred.add(c.id);
  if(starredOnly && wasStarred){
    // just un-starred while filtering to starred — drop it from the view
    deck=currentSource();
    if(deck.length===0){ starredOnly=false; setStarredBtn(false); loadDeck(false); flashHint('No starred cards left — showing all.'); return; }
    if(idx>=deck.length) idx=deck.length-1;
    render();
  } else { updateStarUI(); }
};
$('#shuffleBtn').onclick=()=>loadDeck(true);
$('#catFilter').onchange=()=>loadDeck(false);
$('#starredBtn').onclick=function(){
  if(!starredOnly){
    // about to turn ON — make sure there's actually something starred to show
    starredOnly=true; const n=currentSource().length; starredOnly=false;
    if(n===0){
      flashHint(starred.size===0
        ? '⭐ Star a few cards first (press “Star”), then filter to just those.'
        : '⭐ No starred cards in this category — switch to “All categories.”');
      return;
    }
  }
  starredOnly=!starredOnly;
  setStarredBtn(starredOnly);
  loadDeck(false);
};
$('#resetCards').onclick=()=>{starred.clear();starredOnly=false;
  setStarredBtn(false);$('#catFilter').value='__all';loadDeck(false);};

document.addEventListener('keydown',e=>{
  if(!$('#view-cards').classList.contains('active'))return;
  if(e.key==='ArrowRight')$('#nextCard').click();
  else if(e.key==='ArrowLeft')$('#prevCard').click();
  else if(e.key===' '){e.preventDefault();$('#fcInner').click();}
  else if(e.key==='ArrowUp'){e.preventDefault();$('#starCard').click();}
});

/* ============ TABS ============ */
$$('.tab').forEach(t=>t.onclick=()=>{
  $$('.tab').forEach(x=>x.classList.remove('active'));
  $$('.view').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  $('#view-'+t.dataset.view).classList.add('active');
  if(t.dataset.view==='history') renderHistory();
});

/* ============ TEST LOGIC ============ */
let quiz=[], qi=0, answers=[], timerInt=null, startMs=0, elapsedMs=0;
function shuffleArr(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* category + count selectors */
function poolForCat(){
  const Q=curQs();
  const c=$('#qCatSel').value;
  return (c&&c!=='__all')?Q.filter(q=>q.cat===c):Q.slice();
}
function buildQCatSel(){
  const Q=curQs();
  const cats=[...new Set(Q.map(q=>q.cat))];
  $('#qCatSel').innerHTML='<option value="__all">All topics ('+Q.length+')</option>'+
    cats.map(c=>{const n=Q.filter(q=>q.cat===c).length;return '<option value="'+c+'">'+c+' ('+n+')</option>';}).join('');
}
function buildQCountSel(){
  const total=poolForCat().length;
  const sizes=[10,15,20,30,40,50].filter(n=>n<total);
  $('#qCountSel').innerHTML='<option value="0">All '+total+' questions</option>'+
    sizes.map(n=>'<option value="'+n+'">'+n+' questions</option>').join('');
}
$('#qCatSel').onchange=buildQCountSel;

/* timer */
function fmt(ms){const s=Math.max(0,Math.floor(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function startTimer(){clearInterval(timerInt);startMs=Date.now();$('#qTimer').textContent='⏱ 00:00';
  timerInt=setInterval(()=>{$('#qTimer').textContent='⏱ '+fmt(Date.now()-startMs);},1000);}
function stopTimer(){clearInterval(timerInt);elapsedMs=Date.now()-startMs;}

/* build + start (baseList = array of question objects {cat,q,opts,a,why}) */
function makeQuizItem(base){
  const correctText=base.opts[base.a];
  const opts=shuffleArr(base.opts);
  return {cat:base.cat, q:base.q, opts, a:opts.indexOf(correctText), why:base.why};
}
function startQuiz(baseList){
  quiz=shuffleArr(baseList).map(makeQuizItem);
  answers=new Array(quiz.length).fill(null);
  qi=0;
  $('#quizArea').style.display='block';
  $('#quizResults').style.display='none';
  $('#startBtn').textContent='Restart test';
  startTimer();
  buildDots(); renderQ();
  window.scrollTo({top:0,behavior:'smooth'});
}
$('#startBtn').onclick=()=>{
  let pool=poolForCat();
  const n=parseInt($('#qCountSel').value,10)||0;
  if(n>0) pool=shuffleArr(pool).slice(0,n);
  startQuiz(pool);
};

function buildDots(){
  const d=$('#qDots'); d.innerHTML='';
  quiz.forEach((_,i)=>{const b=document.createElement('button');b.className='dot';b.onclick=()=>{qi=i;renderQ();};d.appendChild(b);});
}
function updateDots(){
  $$('#qDots .dot').forEach((b,i)=>{
    b.classList.toggle('answered',answers[i]!==null);
    b.classList.toggle('current',i===qi);
  });
}
function renderQ(){
  const item=quiz[qi];
  $('#qProgress').textContent='Question '+(qi+1)+' of '+quiz.length;
  $('#qAnswered').textContent=answers.filter(a=>a!==null).length+' answered';
  $('#qBar').style.width=((qi+1)/quiz.length*100)+'%';
  $('#qNum').textContent='Q'+(qi+1)+' · '+item.cat;
  $('#qText').textContent=item.q;
  const wrap=$('#qOpts'); wrap.innerHTML='';
  const keys=['A','B','C','D','E'];
  item.opts.forEach((o,i)=>{
    const b=document.createElement('button');
    b.className='opt'+(answers[qi]===i?' selected':'');
    b.innerHTML='<span class="key">'+keys[i]+'</span><span>'+o+'</span>';
    b.onclick=()=>{answers[qi]=i;renderQ();};
    wrap.appendChild(b);
  });
  $('#qPrev').disabled=(qi===0);
  $('#qNext').textContent=(qi===quiz.length-1)?'Finish ✓':'Next →';
  $('#qNext').classList.toggle('primary',true);
  updateDots();
}
$('#qPrev').onclick=()=>{if(qi>0){qi--;renderQ();}};
$('#qNext').onclick=()=>{
  if(qi<quiz.length-1){qi++;renderQ();return;}
  // finishing
  const unanswered=answers.filter(a=>a===null).length;
  if(unanswered>0 && !confirm(unanswered+' question(s) are unanswered and will be marked wrong. Submit anyway?'))return;
  stopTimer();
  showResults();
};

function gradeText(p){
  if(p>=90)return['A','Outstanding — you know this material cold. 🎯'];
  if(p>=80)return['B','Strong work. Drill the misses and you’re solid. 💪'];
  if(p>=70)return['C','Passing — review the missed cards and retake. 📚'];
  if(p>=60)return['D','Getting there. Star the misses and run flashcards. 🔁'];
  return['F','Early days — work the flashcards, then come back. 🌱'];
}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}

/* snapshot the finished test into a plain record (used live + saved to history) */
function computeRec(){
  let correct=0; quiz.forEach((it,i)=>{if(answers[i]===it.a)correct++;});
  const total=quiz.length;
  const catVal=$('#qCatSel').value;
  return {
    ts:Date.now(),
    catLabel:(catVal&&catVal!=='__all')?catVal:'All topics',
    correct, total, pct:Math.round(correct/total*100), elapsedMs,
    quiz:quiz.map(it=>({cat:it.cat,q:it.q,opts:it.opts,a:it.a,why:it.why})),
    answers:answers.slice()
  };
}

/* build the results breakdown from a record. live=true shows test actions; false shows a Back button */
function resultsMarkup(rec, live){
  const keys=['A','B','C','D','E'];
  const [g,msg]=gradeText(rec.pct);
  const idx=rec.quiz.map((item,i)=>({item,i}));
  const misses=idx.filter(x=>rec.answers[x.i]!==x.item.a);
  const hits=idx.filter(x=>rec.answers[x.i]===x.item.a);
  let html='';
  html+='<div class="score-hero">';
  html+='<div class="ring" style="--p:'+rec.pct+'"><div><span class="pct">'+rec.pct+'%</span><span class="frac">'+rec.correct+' / '+rec.total+' correct</span></div></div>';
  html+='<div class="grade">Grade: '+g+'</div>';
  html+='<p class="msg">'+(live?msg:esc(rec.catLabel))+'</p>';
  html+='<div class="timestat">⏱ Total '+fmt(rec.elapsedMs)+' · avg '+fmt(Math.round(rec.elapsedMs/rec.total))+' / question</div>';
  html+='<div class="score-actions">';
  if(live){
    html+='<button class="btn primary" id="retakeBtn">↻ New test</button>';
    if(misses.length)html+='<button class="btn" id="missAgainBtn">🔁 Retake '+misses.length+' missed</button>';
  }else{
    html+='<button class="btn primary" id="backToHist">← Back to history</button>';
  }
  html+='</div></div>';

  html+='<div class="review-h">'+(misses.length?('❌ Missed ('+misses.length+')'):'✅ Perfect score — nothing missed!')+'</div>';
  misses.forEach(({item,i})=>{
    const you=rec.answers[i]===null?'<i>(left blank)</i>':keys[rec.answers[i]]+'. '+esc(item.opts[rec.answers[i]]);
    html+='<div class="rev miss">';
    html+='<div class="rq">Q'+(i+1)+'. '+esc(item.q)+'</div>';
    html+='<div class="line"><span class="tag you">Your answer:</span><span>'+you+'</span></div>';
    html+='<div class="line"><span class="tag ans">Correct:</span><span>'+keys[item.a]+'. '+esc(item.opts[item.a])+'</span></div>';
    html+='<div class="why">💡 '+esc(item.why)+'</div>';
    html+='</div>';
  });
  if(hits.length){
    html+='<div class="review-h">✅ Correct ('+hits.length+')</div>';
    hits.forEach(({item,i})=>{
      html+='<div class="rev hit">';
      html+='<div class="rq">Q'+(i+1)+'. '+esc(item.q)+'</div>';
      html+='<div class="line"><span class="tag ans">Answer:</span><span>'+keys[item.a]+'. '+esc(item.opts[item.a])+'</span></div>';
      html+='</div>';
    });
  }
  return {html, misses};
}

function showResults(){
  const rec=computeRec();
  saveHistory(rec);
  const {html,misses}=resultsMarkup(rec,true);
  const box=$('#quizResults');
  box.innerHTML=html;
  $('#quizArea').style.display='none';
  box.style.display='block';
  window.scrollTo({top:0,behavior:'smooth'});
  $('#retakeBtn').onclick=()=>$('#startBtn').click();
  const ma=$('#missAgainBtn');
  // Retake ONLY the missed questions (re-shuffled) — loop until you get them all right.
  if(ma)ma.onclick=()=>startQuiz(misses.map(x=>x.item));
}

/* ============ TEST HISTORY (last 3, saved on this device) ============ */
const HKEY=(typeof STUDY_HISTORY_KEY!=='undefined')?STUDY_HISTORY_KEY:'fbla_test_history_v1';
function loadHistory(){try{return JSON.parse(localStorage.getItem(HKEY)||'[]');}catch(e){return [];}}
function saveHistory(rec){try{let h=loadHistory();h.unshift(rec);h=h.slice(0,3);localStorage.setItem(HKEY,JSON.stringify(h));}catch(e){}}
function fmtDate(ts){try{return new Date(ts).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}catch(e){return '';}}
function renderHistory(){
  $('#histReview').style.display='none';
  const list=$('#histList'); list.style.display='block';
  const h=loadHistory();
  if(!h.length){list.innerHTML='<div class="empty">No tests yet. Take a test and your last 3 results — with full answers — will be saved here to review.</div>';return;}
  let html='';
  h.forEach((rec,i)=>{
    html+='<div class="hist-card">';
    html+='<div class="hist-top">';
    html+='<span class="hist-pct">'+rec.pct+'%</span>';
    html+='<span class="hist-meta">'+rec.correct+' / '+rec.total+' correct</span>';
    html+='<span class="hist-badge">'+esc(rec.catLabel)+'</span>';
    html+='</div>';
    html+='<div class="hist-sub">'+fmtDate(rec.ts)+' · ⏱ '+fmt(rec.elapsedMs)+'</div>';
    html+='<button class="btn" data-hist="'+i+'">Review answers →</button>';
    html+='</div>';
  });
  list.innerHTML=html;
  list.querySelectorAll('[data-hist]').forEach(b=>b.onclick=()=>reviewHistory(parseInt(b.dataset.hist,10)));
}
function reviewHistory(i){
  const rec=loadHistory()[i]; if(!rec)return;
  const {html}=resultsMarkup(rec,false);
  const rv=$('#histReview'); rv.innerHTML=html;
  $('#histList').style.display='none'; rv.style.display='block';
  $('#backToHist').onclick=renderHistory;
  window.scrollTo({top:0,behavior:'smooth'});
}
$('#clearHist').onclick=()=>{if(confirm('Clear all saved test results?')){try{localStorage.removeItem(HKEY);}catch(e){}renderHistory();}};

/* init */
buildCatFilter();
loadDeck(false);
buildQCatSel();
buildQCountSel();
