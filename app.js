// The Hindu RSS Reader (Browser only)

const feeds = [
  { name: 'Main', category: 'main', url: 'https://www.thehindu.com/feeder/default.rss' },
  { name: 'National', category: 'national', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { name: 'International', category: 'international', url: 'https://www.thehindu.com/news/international/feeder/default.rss' },
  { name: 'Business', category: 'business', url: 'https://www.thehindu.com/business/feeder/default.rss' },
  { name: 'Sports', category: 'sports', url: 'https://www.thehindu.com/sport/feeder/default.rss' },
  { name: 'Opinion', category: 'opinion', url: 'https://www.thehindu.com/opinion/feeder/default.rss' },
  { name: 'Entertainment', category: 'entertainment', url: 'https://www.thehindu.com/entertainment/feeder/default.rss' },
];

// AllOrigins returns JSON: { contents, status }
const PROXY = 'https://api.allorigins.win/get?url=';

const els = {
  categorySelect: document.getElementById('categorySelect'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  refreshBtn: document.getElementById('refreshBtn'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  count: document.getElementById('count'),
  container: document.getElementById('articlesContainer'),
};

let allArticles = [];
let currentCategory = localStorage.getItem('preferredCategory') || 'main';

function setLoading(on) {
  els.loading.hidden = !on;
  if (on) els.error.hidden = true;
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}

function setCount(n) {
  els.count.textContent = `${n} articles`;
  els.count.hidden = false;
}

async function fetchRSS(rssUrl) {
  const url = `${PROXY}${encodeURIComponent(rssUrl)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json(); // AllOrigins JSON wrapper
  const xmlDoc = new DOMParser().parseFromString(data.contents, 'text/xml');

  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('Invalid XML in RSS feed');
  }

  const items = Array.from(xmlDoc.querySelectorAll('item'));
  return items.map((item) => {
    const title = item.querySelector('title')?.textContent?.trim() || '';
    const description = item.querySelector('description')?.textContent?.trim() || '';
    const link = item.querySelector('link')?.textContent?.trim() || '';
    const pubDate = new Date(item.querySelector('pubDate')?.textContent || '');
    const author =
      item.querySelector('author')?.textContent?.trim() ||
      item.querySelector('dc\\:creator')?.textContent?.trim() ||
      '';

    return { title, description, link, pubDate, author };
  });
}

function render(articles) {
  els.container.innerHTML = articles
    .map(
      (a) => `
    <article class="card">
      <h3><a href="${a.link}" target="_blank" rel="noopener noreferrer">${a.title}</a></h3>
      <div class="meta">
        ${isNaN(a.pubDate) ? '' : a.pubDate.toLocaleString()}${a.author ? ' • ' + a.author : ''}
      </div>
      <div class="desc">${a.description}</div>
    </article>`
    )
    .join('');
  setCount(articles.length);
}

function applyFilters() {
  const q = els.searchInput.value.trim().toLowerCase();
  const sort = els.sortSelect.value;
  let list = [...allArticles];

  if (q) {
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => (sort === 'newest' ? b.pubDate - a.pubDate : a.pubDate - b.pubDate));
  render(list);
}

async function load(category) {
  setLoading(true);
  try {
    const feed = feeds.find((f) => f.category === category) || feeds;
    allArticles = await fetchRSS(feed.url);
    applyFilters();
    localStorage.setItem('preferredCategory', category);
  } catch (e) {
    showError(e.message);
  } finally {
    setLoading(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  els.categorySelect.value = currentCategory;

  els.categorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    load(currentCategory);
  });

  els.searchInput.addEventListener('input', applyFilters);
  els.sortSelect.addEventListener('change', applyFilters);
  els.refreshBtn.addEventListener('click', () => load(currentCategory));

  load(currentCategory);
});
