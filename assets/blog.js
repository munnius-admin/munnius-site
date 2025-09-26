(() => {
  const feed = document.getElementById('blog-feed');
  if (!feed) return;

  const toolbar = document.getElementById('blog-toolbar');
  const searchInput = document.getElementById('blog-search');
  const tagsContainer = document.getElementById('tag-filters');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const resultsInfo = document.getElementById('results-count');
  const loadMoreBtn = document.getElementById('load-more');
  const noResults = document.getElementById('no-results');

  const INITIAL_BATCH = 9;
  const STEP = Number(loadMoreBtn?.dataset.step) || INITIAL_BATCH;
  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  let allPosts = [];
  let filteredPosts = [];
  let visiblePosts = INITIAL_BATCH;
  let searchTerm = '';
  const selectedTags = new Set();

  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const createCard = (post) => {
    const article = document.createElement('article');
    article.className = 'post-card';
    article.dataset.slug = post.slug;

    const meta = document.createElement('div');
    meta.className = 'post-meta';

    const time = document.createElement('time');
    time.dateTime = post.published;
    time.textContent = post.displayDate;

    const readTime = document.createElement('span');
    readTime.textContent = `Leitura de ${post.readingMinutes} min`;

    meta.append(time, readTime);

    const title = document.createElement('h3');
    const link = document.createElement('a');
    link.href = post.url || `/blog/${post.slug}.html`;
    link.textContent = post.title;
    title.append(link);

    const excerpt = document.createElement('p');
    excerpt.textContent = post.excerpt;

    article.append(meta, title, excerpt);

    if (post.tags?.length) {
      const list = document.createElement('ul');
      list.className = 'tag-list';
      list.setAttribute('aria-label', 'Tags do artigo');
      post.tags.forEach((tag) => {
        const item = document.createElement('li');
        item.textContent = tag;
        list.appendChild(item);
      });
      article.appendChild(list);
    }

    return article;
  };

  const syncTagButtons = () => {
    if (!tagsContainer) return;
    tagsContainer.querySelectorAll('.tag-button').forEach((btn) => {
      const tag = btn.getAttribute('data-tag');
      btn.setAttribute('aria-pressed', selectedTags.has(tag) ? 'true' : 'false');
    });
  };

  const updateResultsInfo = () => {
    if (!resultsInfo) return;
    if (!filteredPosts.length) {
      resultsInfo.textContent = searchTerm || selectedTags.size
        ? 'Nenhum artigo corresponde à sua busca.'
        : 'Nenhum artigo disponível no momento.';
      return;
    }

    const total = filteredPosts.length;
    const showing = Math.min(visiblePosts, total);
    if (showing === total) {
      resultsInfo.textContent = `Mostrando ${total} ${total === 1 ? 'artigo' : 'artigos'}.`;
    } else {
      resultsInfo.textContent = `Mostrando ${showing} de ${total} artigos.`;
    }
  };

  const renderFeed = () => {
    if (!filteredPosts.length) {
      if (allPosts.length) {
        feed.innerHTML = '';
        noResults?.removeAttribute('hidden');
        loadMoreBtn?.setAttribute('hidden', '');
      }
      updateResultsInfo();
      return;
    }

    feed.innerHTML = '';
    noResults?.setAttribute('hidden', '');

    const fragment = document.createDocumentFragment();
    filteredPosts.slice(0, visiblePosts).forEach((post) => {
      fragment.appendChild(createCard(post));
    });

    feed.appendChild(fragment);

    if (loadMoreBtn) {
      if (visiblePosts >= filteredPosts.length) {
        loadMoreBtn.setAttribute('hidden', '');
      } else {
        loadMoreBtn.removeAttribute('hidden');
      }
    }

    updateResultsInfo();
  };

  const toggleClearButton = () => {
    if (!clearFiltersBtn) return;
    if (searchTerm || selectedTags.size) {
      clearFiltersBtn.removeAttribute('disabled');
      clearFiltersBtn.removeAttribute('aria-disabled');
    } else {
      clearFiltersBtn.setAttribute('disabled', '');
      clearFiltersBtn.setAttribute('aria-disabled', 'true');
    }
  };

  const applyFilters = () => {
    const term = searchTerm.trim().toLowerCase();
    filteredPosts = allPosts.filter((post) => {
      const matchesTag = !selectedTags.size || post.tags.some((tag) => selectedTags.has(tag));
      if (!matchesTag) return false;
      if (!term) return true;
      return post.searchIndex.includes(term);
    });
    visiblePosts = INITIAL_BATCH;
    syncTagButtons();
    toggleClearButton();
    renderFeed();
  };

  const buildTagFilters = () => {
    if (!tagsContainer) return;
    const tags = Array.from(new Set(allPosts.flatMap((post) => post.tags))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (!tags.length) {
      tagsContainer.innerHTML = '<span class="toolbar-hint">Nenhuma tag disponível.</span>';
      return;
    }

    tagsContainer.innerHTML = '';
    tags.forEach((tag) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-button';
      btn.textContent = tag;
      btn.setAttribute('data-tag', tag);
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        if (selectedTags.has(tag)) {
          selectedTags.delete(tag);
        } else {
          selectedTags.add(tag);
        }
        applyFilters();
      });
      tagsContainer.appendChild(btn);
    });
  };

  const hydratePosts = (data) => data.map((post) => {
    const tags = Array.isArray(post.tags) ? post.tags : [];
    return {
      ...post,
      tags,
      displayDate: formatDate(post.published),
      searchIndex: [post.title, post.excerpt, tags.join(' ')].join(' ').toLowerCase(),
    };
  });

  const attachEvents = () => {
    searchInput?.addEventListener('input', (event) => {
      searchTerm = event.target.value;
      applyFilters();
    });

    clearFiltersBtn?.addEventListener('click', () => {
      searchTerm = '';
      selectedTags.clear();
      if (searchInput) searchInput.value = '';
      applyFilters();
    });

    loadMoreBtn?.addEventListener('click', () => {
      visiblePosts = Math.min(filteredPosts.length, visiblePosts + STEP);
      renderFeed();
    });
  };

  const enhance = () => {
    attachEvents();

    fetch('/blog/posts.json', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error('Falha ao carregar posts.json');
        return response.json();
      })
      .then((data) => {
        allPosts = hydratePosts(Array.isArray(data) ? data : []);
        if (!allPosts.length) {
          toolbar?.setAttribute('data-state', 'empty');
          renderFeed();
          return;
        }
        buildTagFilters();
        applyFilters();
      })
      .catch(() => {
        toolbar?.setAttribute('data-state', 'fallback');
      });
  };

  enhance();
})();
