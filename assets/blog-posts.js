(async function renderBlogPosts() {
  const homeContainer = document.getElementById('blog-posts-home');
  const allContainer = document.getElementById('blog-posts-all');
  const filterButtons = document.querySelectorAll('[data-filter]');
  const searchInput = document.getElementById('blog-search');
  if (!homeContainer && !allContainer) return;

  const fallback = (container) => {
    if (!container) return;
    container.innerHTML = '<article class="post-item"><span class="data-categoria">Blog</span><h3>Posts em breve</h3><p>Novos conteúdos serão publicados em breve.</p></article>';
  };

  const monthMap = {
    jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
    jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
  };

  const parseDate = (value) => {
    if (!value) return 0;
    const [day, month, year] = value.trim().toLowerCase().split(/\s+/);
    const monthIndex = monthMap[month];
    if (!day || monthIndex === undefined || !year) return 0;
    return new Date(Number(year), monthIndex, Number(day)).getTime();
  };

  const buildPostHref = (post) => {
    const rawSlug = String(post?.slug || '').trim();
    const normalizedSlug = rawSlug.replace(/^\/?blog\//, '').replace(/^\//, '');
    if (!normalizedSlug) return '';
    return `/blog/${normalizedSlug}`;
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  const filterExistingPosts = async (posts) => {
    const checks = await Promise.all(posts.map(async (post) => {
      const href = buildPostHref(post);
      if (!href) return null;
      try {
        const exists = await fetch(href, { method: 'HEAD', cache: 'no-store' });
        if (!exists.ok) return null;
        return { ...post, href };
      } catch (error) {
        return null;
      }
    }));
    return checks.filter(Boolean);
  };

  const buildHtml = (post) => `
    <article class="post-item reveal">
      <span class="data-categoria">${post.data} · ${post.categoria}${post.readTime ? ` · ${post.readTime}` : ''}</span>
      <h3>${escapeHtml(post.titulo)}</h3>
      <p>${escapeHtml(post.excerpt)}</p>
      <a href="${escapeHtml(post.href || buildPostHref(post))}">Ler artigo</a>
    </article>
  `;

  const syncReveal = () => {
    document.querySelectorAll('.post-item.reveal').forEach((element) => {
      requestAnimationFrame(() => element.classList.add('is-visible'));
    });
  };

  try {
    const response = await fetch('/blog/posts.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Falha ao carregar posts.json');
    const data = await response.json();
    const posts = Array.isArray(data)
      ? data.slice().sort((a, b) => parseDate(b.data) - parseDate(a.data))
      : [];
    const safePosts = await filterExistingPosts(posts);

    if (!safePosts.length) {
      fallback(homeContainer);
      fallback(allContainer);
      return;
    }

    if (homeContainer) homeContainer.innerHTML = safePosts.slice(0, 3).map(buildHtml).join('');
    if (allContainer) {
      let activeFilter = 'Todos';
      const renderAll = () => {
        const term = (searchInput?.value || '').trim().toLowerCase();
        const visiblePosts = safePosts.filter((post) => {
          const matchesFilter = activeFilter === 'Todos' || post.categoria === activeFilter;
          const haystack = `${post.titulo} ${post.categoria} ${post.excerpt}`.toLowerCase();
          return matchesFilter && (!term || haystack.includes(term));
        });

        allContainer.innerHTML = visiblePosts.length
          ? visiblePosts.map(buildHtml).join('')
          : '<div class="blog-empty">Nenhum artigo encontrado para esse filtro.</div>';
        syncReveal();
      };

      filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
          activeFilter = button.dataset.filter || 'Todos';
          filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));
          renderAll();
        });
      });
      searchInput?.addEventListener('input', renderAll);
      renderAll();
    }

    syncReveal();
  } catch (error) {
    fallback(homeContainer);
    fallback(allContainer);
  }
})();
