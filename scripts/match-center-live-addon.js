/* =========================================================
   MARIOBOLA MATCH CENTER — LIVE SCORE ADD-ON
   Append this block to the END of the existing script.js.
   HOME is not touched.
   ========================================================= */

const MARIO_LIVE = {
  api: '/api/live-scores',
  fallback: 'data/live-scores.json',
  pollMs: 20000
};

const mbNorm = v => String(v || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/&/g,' and ')
  .replace(/[^a-z0-9]+/g,' ')
  .replace(/\b(fc|cf|sc|afc|ac|bc|club|football|futbol|calcio)\b/g,' ')
  .replace(/\s+/g,' ')
  .trim();

const MB_ALIASES = {
  'manchester united':['manchester united','man utd','man united'],
  'manchester city':['manchester city','man city'],
  'tottenham hotspur':['tottenham hotspur','tottenham','spurs'],
  'newcastle united':['newcastle united','newcastle'],
  'west ham united':['west ham united','west ham'],
  'wolverhampton wanderers':['wolverhampton wanderers','wolverhampton','wolves'],
  'brighton hove albion':['brighton hove albion','brighton'],
  'nottingham forest':['nottingham forest','nottingham'],
  'real betis':['real betis','betis'],
  'atletico madrid':['atletico madrid','atletico'],
  'inter milan':['inter milan','internazionale','inter'],
  'ac milan':['ac milan','milan'],
  'paris saint germain':['paris saint germain','psg']
};

function mbVariants(name){
  const n = mbNorm(name);
  const set = new Set([n]);
  for(const aliases of Object.values(MB_ALIASES)){
    const a = aliases.map(mbNorm);
    if(a.includes(n)) a.forEach(x=>set.add(x));
  }
  return [...set];
}

function mbSimilarity(a,b){
  const av = mbVariants(a), bv = mbVariants(b);
  let best = 0;
  for(const x of av) for(const y of bv){
    if(!x || !y) continue;
    if(x===y) best = Math.max(best,1);
    else if(x.includes(y)||y.includes(x)) best = Math.max(best,.88);
    else {
      const ax=new Set(x.split(' ')), by=new Set(y.split(' '));
      const overlap=[...ax].filter(w=>by.has(w));
      const union=new Set([...ax,...by]);
      if(union.size) best=Math.max(best,overlap.length/union.size);
    }
  }
  return best;
}

function mbEvents(payload){
  if(Array.isArray(payload)) return payload;
  return payload?.liveMatches || payload?.events || payload?.matches || [];
}

function mbLiveTeam(event,side){
  if(side==='home') return String(event.home?.name || event.homeTeam || event.competitions?.[0]?.competitors?.find(x=>x.homeAway==='home')?.team?.displayName || '');
  return String(event.away?.name || event.awayTeam || event.competitions?.[0]?.competitors?.find(x=>x.homeAway==='away')?.team?.displayName || '');
}

function mbLiveScore(event,side){
  const n = side==='home'
    ? event.score?.home ?? event.homeScore ?? event.home?.score
    : event.score?.away ?? event.awayScore ?? event.away?.score;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

function mbLiveState(event){
  const s = String(event.status?.state || event.status?.type?.state || event.state || '').toLowerCase();
  const t = `${event.status?.type?.name||''} ${event.status?.type?.detail||''} ${event.status?.detail||''}`.toLowerCase();
  if(s==='in' || s.includes('live') || s.includes('progress') || t.includes('live')) return 'LIVE';
  if(s==='post' || s.includes('finish') || s.includes('final') || s.includes('complete') || t.includes('final')) return 'FINISHED';
  return 'UPCOMING';
}

function mbLiveClock(event){
  return String(event.status?.clock || event.status?.displayClock || event.status?.type?.shortDetail || event.status?.type?.detail || '');
}

function mbFindEvent(match,events){
  const h=match.homeTeam, a=match.awayTeam;
  let best=null, score=0;
  for(const e of events){
    const eh=mbLiveTeam(e,'home'), ea=mbLiveTeam(e,'away');
    const hs=mbSimilarity(h,eh), as=mbSimilarity(a,ea);
    if(hs>=.70 && as>=.70 && (hs+as)/2>score){ best=e; score=(hs+as)/2; }
  }
  return best;
}

async function mbGetLivePayload(){
  try{
    const r=await fetch(MARIO_LIVE.api,{cache:'no-store'});
    if(r.ok) return await r.json();
  }catch(e){ console.warn('[MarioBola LIVE]',e); }
  try{
    const r=await fetch(MARIO_LIVE.fallback,{cache:'no-store'});
    if(r.ok) return await r.json();
  }catch(e){ console.warn('[MarioBola LIVE fallback]',e); }
  return null;
}

async function mbRefreshLiveScore(){
  if(!Array.isArray(allMatches) || !allMatches.length) return;

  const payload=await mbGetLivePayload();
  if(!payload) return;

  const events=mbEvents(payload);
  const matched=new Set();
  const base=allMatches.map(m=>({ ...m, liveData:null }));

  for(const m of base){
    const e=mbFindEvent(m,events);
    if(!e) continue;

    const home=mbLiveScore(e,'home');
    const away=mbLiveScore(e,'away');
    const state=mbLiveState(e);
    const eid=String(e.eventId || e.id || '');

    if(eid) matched.add(eid);

    m.homeScore = home ?? m.homeScore;
    m.awayScore = away ?? m.awayScore;
    m.actualStatus = state;
    m.liveData = {
      state,
      clock: mbLiveClock(e),
      homeScore: home,
      awayScore: away,
      eventId: eid
    };
    m.status = dynamicStatus(m);
  }

  /* Add LIVE events that are not present in schedule.json. */
  for(const e of events){
    if(mbLiveState(e)!=='LIVE') continue;
    const eid=String(e.eventId || e.id || '');
    if(eid && matched.has(eid)) continue;

    const home=mbLiveTeam(e,'home'), away=mbLiveTeam(e,'away');
    if(!home || !away) continue;

    const kickoff=e.kickoff || e.date || e.startDate || '';
    let date='', time='';
    if(kickoff){
      const d=new Date(kickoff);
      date=d.toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
      time=d.toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hour12:false});
    }

    base.push({
      id:`auto-live-${eid || `${mbNorm(home)}-${mbNorm(away)}`}`,
      competition:e.league?.name || e.leagueName || 'LIVE',
      homeTeam:home,
      awayTeam:away,
      homeCrest:e.home?.logo || '',
      awayCrest:e.away?.logo || '',
      handicap:null,
      prediction:null,
      date,
      time,
      actualStatus:'LIVE',
      homeScore:mbLiveScore(e,'home'),
      awayScore:mbLiveScore(e,'away'),
      liveData:{
        state:'LIVE',
        clock:mbLiveClock(e),
        homeScore:mbLiveScore(e,'home'),
        awayScore:mbLiveScore(e,'away'),
        eventId:eid
      },
      status:'LIVE'
    });
  }

  allMatches=base.sort((a,b)=>matchDateTime(a)-matchDateTime(b)).map(decorate);

  const current=activeMatchId ? allMatches.find(x=>x.id===activeMatchId) : null;
  const featured=current || allMatches.find(x=>x.status==='LIVE') || allMatches.find(x=>x.status==='UPCOMING') || allMatches[0];

  if(featured){
    renderFeatured(featured);
    renderNextSchedule(featured);
  }

  renderPreview(currentFilter);
  renderPredictionBoard();

  const live=allMatches.find(x=>x.status==='LIVE');
  if(live){
    $('#liveEmptyLabel').innerHTML=`LIVE NOW<br><b>${esc(live.homeTeam)} ${live.homeScore??0} - ${live.awayScore??0} ${esc(live.awayTeam)}</b>`;
  }
}

/* Wrap the existing loadData without changing HOME. */
const marioOriginalLoadData = loadData;
loadData = async function(){
  await marioOriginalLoadData();
  await mbRefreshLiveScore();
};

/* Refresh live score every 20 seconds. */
setInterval(mbRefreshLiveScore,MARIO_LIVE.pollMs);

/* First live-score refresh after the existing initial load. */
setTimeout(mbRefreshLiveScore,1500);
