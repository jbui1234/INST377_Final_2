function getVisitorId() {
  let id = localStorage.getItem('visitorId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('visitorId', id);
  }
  return id;
}

document.addEventListener('DOMContentLoaded', () => {
  loadPopularDeals();
  loadTopGamesByPlatform();
  setupSearch();
  loadSavedGames();
});

function loadPopularDeals() {
  const container = document.getElementById('popular-games');
  fetch('https://www.cheapshark.com/api/1.0/deals?storeID=1&upperPrice=15')
    .then(res => res.json())
    .then(data => {
      if (!data.length) {
        container.innerHTML = '<p>No deals available at the moment.</p>';
        return;
      }
      container.innerHTML = data.slice(0, 8).map(deal => `
        <div class="game">
          <h3>${deal.title}</h3>
          <p>Price: $${deal.salePrice}</p>
        </div>
      `).join('');
    })
    .catch(err => console.error('Error loading popular deals:', err));
}

function loadTopGamesByPlatform() {
  const platforms = [
    { name: "Steam", id: 1 },
    { name: "Epic Games", id: 25 },
    { name: "GOG", id: 7 },
    { name: "Humble Bundle", id: 11 }
  ];

  const platformList = document.getElementById('platform-list');
  platformList.innerHTML = '';

  platforms.forEach(platform => {
    fetch(`https://www.cheapshark.com/api/1.0/deals?storeID=${platform.id}&upperPrice=15`)
      .then(res => res.json())
      .then(data => {
        const section = document.createElement('div');
        section.innerHTML = `
          <h3>${platform.name}</h3>
          <div class="platform-games">
            ${data.slice(0, 3).map(deal => `
              <div class="game">
                <h4>${deal.title}</h4>
                <p>$${deal.salePrice}</p>
              </div>
            `).join('')}
          </div>
        `;
        platformList.appendChild(section);
      })
      .catch(err => console.error(`Error loading games for ${platform.name}`, err));
  });
}

function setupSearch() {
  const searchBar = document.getElementById('search-bar');
  const results = document.getElementById('search-results');

  searchBar.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      const query = searchBar.value.trim();
      if (!query) return;

      fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
          results.innerHTML = '';
          if (!data.length) {
            results.innerHTML = `<p>No results found for "${query}".</p>`;
            return;
          }
          results.innerHTML = data.slice(0, 5).map(game => `
            <div class="game">
              <h3>${game.external}</h3>
              <p>Cheapest Price: $${game.cheapest}</p>
            </div>
          `).join('');
        })
        .catch(err => console.error('Error during search:', err));
    }
  });
}

function loadSavedGames() {
  const section = document.getElementById('saved-games-section');
  const visitorId = getVisitorId();

  fetch(`/api/saved_games?visitorId=${visitorId}`)
    .then(res => res.json())
    .then(games => {
      if (!games.length) {
        section.innerHTML = '<p>No saved games yet.</p>';
        return;
      }
      section.innerHTML = `
        <h2>Your Saved Games</h2>
        ${games.map(g => `
          <p><strong>${g.title}</strong> - $${parseFloat(g.price).toFixed(2)} at ${g.store}</p>
        `).join('')}
      `;
    })
    .catch(err => console.error('Error fetching saved games:', err));
}
