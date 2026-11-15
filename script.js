const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const roomPlan = document.querySelector('.room');
const { width: roomWidth, depth: roomDepth, zones, equipment, descriptions } = capsuleLayout;
roomPlan.style.aspectRatio = roomWidth + ' / ' + roomDepth;

function placeOnPlan(element, { x, z, width, depth }) {
  element.style.left = (0.5 - (x + width / 2) / roomWidth) * 100 + '%';
  element.style.top = (1 - (z + depth / 2) / roomDepth) * 100 + '%';
  element.style.width = width / roomWidth * 100 + '%';
  element.style.height = depth / roomDepth * 100 + '%';
}

for (const [name, bounds] of Object.entries(zones)) {
  placeOnPlan(roomPlan.querySelector('.zone-' + name), bounds);
}
for (const [name, bounds] of Object.entries(equipment)) {
  placeOnPlan(roomPlan.querySelector('.' + name), bounds);
}
placeOnPlan(roomPlan.querySelector('.door'), {
  x: zones.entry.x, z: 0, width: zones.entry.width, depth: .12,
});

const zoneButtons = document.querySelectorAll('[data-zone]');
const zoneCopy = document.querySelector('#zone-copy');
document.querySelector('.zone-strength').classList.add('is-active');
for (const button of zoneButtons) {
  button.addEventListener('click', () => {
    const zone = button.dataset.zone;
    for (const choice of zoneButtons) {
      const active = choice === button;
      choice.setAttribute('aria-pressed', String(active));
      document.querySelector('.zone-' + choice.dataset.zone).classList.toggle('is-active', active);
    }
    zoneCopy.textContent = descriptions[zone];
  });
}

const scheduler = document.querySelector('#scheduler');
const scheduleRange = document.querySelector('#range');
const confirmation = document.querySelector('#confirmation');

function selectedRange() {
  const start = scheduler.elements.slot.value;
  const end = String(Number(start.slice(0, 2)) + 1).padStart(2, '0');
  return start + '–' + end + ':00';
}

scheduler.addEventListener('change', () => {
  scheduleRange.textContent = selectedRange() + ' · 60 мин';
});
scheduler.addEventListener('submit', (event) => {
  event.preventDefault();
  document.querySelector('#confirmed').textContent = selectedRange() + ' · 60 минут';
  confirmation.showModal();
});

if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  }, { threshold: .12 });
  for (const section of document.querySelectorAll('.format-heading, .layout, .booking-grid, .pilot')) {
    section.classList.add('reveal');
    observer.observe(section);
  }
}
