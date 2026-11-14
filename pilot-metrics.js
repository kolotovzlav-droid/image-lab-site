(() => {
  const key = 'imagelab-pilot-metrics-v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(key)) ?? {}; }
    catch { return {}; }
  }

  const dashboard = document.querySelector('#pilot-report');
  if (dashboard) {
    const totals = read();
    for (const [variant, label] of [['plain', 'Без цены'], ['price', 'С ориентиром']]) {
      const sample = totals[variant] ?? {};
      const visits = sample.visits ?? 0;
      const bookings = sample.bookings ?? 0;
      const demos = sample.demos ?? 0;
      const row = dashboard.insertRow();
      for (const value of [label, visits, bookings, visits ? Math.round(bookings / visits * 100) + '%' : '—', demos]) {
        row.insertCell().textContent = value;
      }
      const blocks = Object.entries(sample.blocks ?? {}).map(([name, count]) => name + ' — ' + count);
      document.querySelector('#blocks-' + variant).textContent = blocks.join(' · ') || 'Пока нет данных';
    }
    return;
  }

  const variant = document.documentElement.dataset.heroVariant;
  if (!variant) return;

  function record(update) {
    try {
      const totals = read();
      const sample = totals[variant] ??= { visits: 0, bookings: 0, demos: 0, blocks: {} };
      update(sample);
      localStorage.setItem(key, JSON.stringify(totals));
    } catch {
      // Browsing and demo booking remain available with storage disabled.
    }
  }

  let booked = false;
  let demo = false;
  let lastBlock;
  const sectionNames = {
    hero: 'Первый экран', how: 'Как это работает', inside: 'Что внутри',
    limits: 'Чего нет', price: 'Цена', coach: 'С тренером', help: 'Помощь',
    faq: 'FAQ', location: 'Адрес', booking: 'Бронирование',
  };
  const sections = [...document.querySelectorAll('[data-pilot-section]')];
  record((sample) => { sample.visits += 1; });

  document.addEventListener('click', (event) => {
    if (!booked && event.target.closest('a[href="#booking"]')) {
      booked = true;
      record((sample) => { sample.bookings += 1; });
    }
  });
  document.querySelector('#scheduler').addEventListener('submit', () => {
    if (!demo) {
      demo = true;
      record((sample) => { sample.demos += 1; });
    }
  });

  function recordBlock() {
    const marker = innerHeight * .56;
    const visible = sections.find((section) => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= marker && bounds.bottom > marker;
    });
    const name = sectionNames[visible?.dataset.pilotSection];
    if (!name || name === lastBlock) return;
    record((sample) => {
      if (lastBlock && sample.blocks[lastBlock] > 0) sample.blocks[lastBlock] -= 1;
      sample.blocks[name] = (sample.blocks[name] ?? 0) + 1;
    });
    lastBlock = name;
  }

  let frame = 0;
  addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; recordBlock(); });
  }, { passive: true });
  addEventListener('pagehide', recordBlock);
  recordBlock();
})();
