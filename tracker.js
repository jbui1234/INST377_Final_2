let chartInstance = null;
const storeMap = {};

function getVisitorId(){
  let id = localStorage.getItem('visitorId');
  if(!id){
    id = crypto.randomUUID();
    localStorage.setItem('visitorId',id);
  }
  return id;
}
const visitorId = getVisitorId();

document.addEventListener('DOMContentLoaded',()=>{
  loadStores();
  setupAutocomplete();
  document.getElementById('store-select').addEventListener('change',searchGame);
  initSavedGamesSection();
  loadSavedGames();
});

function loadStores(){
  fetch('https://www.cheapshark.com/api/1.0/stores')
    .then(res=>res.json())
    .then(stores=>{
      const select=document.getElementById('store-select');
      stores.forEach(store=>{
        storeMap[store.storeID]=store.storeName;
        const opt=document.createElement('option');
        opt.value=store.storeID;
        opt.textContent=store.storeName;
        select.appendChild(opt);
      });
    })
    .catch(console.error);
}

function setupAutocomplete(){
  const input=document.getElementById('game-search');
  const suggestionBox=document.getElementById('suggestions');
  input.addEventListener('input',()=>{
    const q=input.value.trim();
    suggestionBox.innerHTML='';
    suggestionBox.style.display='none';
    if(q.length<2) return;
    fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(q)}`)
      .then(r=>r.json())
      .then(data=>{
        suggestionBox.innerHTML=data.slice(0,5)
          .map(g=>`<li onclick="selectSuggestion('${g.external.replace(/'/g,"\\'")}')">${g.external}</li>`)
          .join('');
        suggestionBox.style.display='block';
      })
      .catch(console.error);
  });
  document.addEventListener('click',e=>{
    if(!suggestionBox.contains(e.target)&&e.target!==input) suggestionBox.style.display='none';
  });
}

function selectSuggestion(name){
  document.getElementById('game-search').value=name;
  document.getElementById('suggestions').style.display='none';
  searchGame();
}

function searchGame(){
  const title=document.getElementById('game-search').value.trim();
  if(!title) return;
  fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(title)}`)
    .then(r=>r.json())
    .then(matches=>{
      if(!matches.length) return;
      return fetch(`https://www.cheapshark.com/api/1.0/games?id=${matches[0].gameID}`)
        .then(r=>r.json())
        .then(game=>({game,title}));
    })
    .then(result=>{
      if(!result) return;
      const {game,title} = result;
      const allDeals=getLowestDealPerStore(game.deals);
      updateStoreFilter(allDeals);
      const filter=document.getElementById('store-select').value;
      const deals=filter?allDeals.filter(d=>d.storeID===filter):allDeals;
      showDeals(deals,title);
      drawChart(deals);
    })
    .catch(console.error);
}

function getLowestDealPerStore(deals){
  const best={};
  deals.forEach(d=>{
    if(!best[d.storeID]||parseFloat(d.price)<parseFloat(best[d.storeID].price)) best[d.storeID]=d;
  });
  return Object.values(best);
}

function updateStoreFilter(deals){
  const sel=document.getElementById('store-select');
  sel.innerHTML='<option value="">All Stores</option>';
  Array.from(new Set(deals.map(d=>d.storeID))).forEach(id=>{
    const opt=document.createElement('option');
    opt.value=id;
    opt.textContent=storeMap[id];
    sel.appendChild(opt);
  });
}

function showDeals(deals,title){
  const cont=document.getElementById('deal-results');
  let html=`<button id="save-game-btn">Save This Game</button>`;
  html+=deals.map(d=>{
    const name=storeMap[d.storeID];
    const price=parseFloat(d.price).toFixed(2);
    const save=parseFloat(d.savings).toFixed(0);
    return `<p><strong>${name}:</strong> $${price} (${save}%)</p>`;
  }).join('');
  cont.innerHTML=html;
  document.getElementById('save-game-btn').addEventListener('click',()=>saveGame({title,deals}));
}

function initSavedGamesSection(){
  const main=document.querySelector('main');
  const sec=document.createElement('section');
  sec.id='saved-games';
  sec.innerHTML='<h2>Saved Games</h2><ul id="saved-games-list"></ul>';
  main.appendChild(sec);
}

function loadSavedGames(){
  fetch(`/api/saved_games?visitorId=${visitorId}`)
    .then(r=>r.json())
    .then(data=>{
      const ul=document.getElementById('saved-games-list');
      ul.innerHTML=data.map(g=>`<li>${g.title} (${g.store} - $${parseFloat(g.price).toFixed(2)})</li>`).join('');
    })
    .catch(console.error);
}

function saveGame({title,deals}){
  const {storeID,price} = deals[0];
  fetch('/api/save_game',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({visitorId,title,store:storeMap[storeID],price})
  })
    .then(r=>{if(!r.ok)throw new Error(r.statusText);return r.json();})
    .then(_=>loadSavedGames())
    .catch(console.error);
}

function drawChart(deals){
  const canvas=document.getElementById('priceChart');
  if(!canvas||!deals.length) return;
  const ctx=canvas.getContext('2d');
  if(chartInstance) chartInstance.destroy();
  const labels=deals.map(d=>storeMap[d.storeID]);
  const data=deals.map(d=>parseFloat(d.price));
  chartInstance=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[{label:'Best Price ($)',data}]},
    options:{responsive:true,plugins:{legend:{display:false}}}
  });
}
