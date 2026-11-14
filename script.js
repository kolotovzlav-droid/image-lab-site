const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const format = new Map([
  ['strength', 'Справа от входа — блочный тренажёр, стойка со скамьёй и гантели.'],
  ['floor', 'Слева от входа — коврик для разминки и велотренажёр у дальней стены.'],
  ['entry', 'Две стеклянные створки разъезжаются от центра. За ними — проход между зонами.'],
]);

const roomPlan = document.querySelector('.room');
const { width: roomWidth, depth: roomDepth, zones, equipment } = capsuleLayout;
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
    zoneCopy.textContent = format.get(zone);
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

const canvas = document.querySelector('#barbell');
const context = canvas.getContext('2d');
const lift = document.querySelector('#lift');
const counter = document.querySelector('#reps');

if (context) {
  const rig = canvas.closest('.rig');
  const weights = rig.querySelector('.weights');
  const steel = [174, 180, 169];
  const rubber = [57, 60, 53];
  const lime = [224, 244, 83];
  const segments = 48;
  let mesh = [];
  let width = 0;
  let height = 0;
  let pointer = 0;
  let camera = 0;
  let scale = 0;
  let animationFrame = 0;
  let liftStart = null;
  let repetitions = 0;
  let lastTime = 0;
  let ambientStart = null;
  let active = true;

  function buildBarbell(load) {
    const faces = [];

    function cylinder(start, end, radius, side, cap, inner = 0) {
      for (let index = 0; index < segments; index++) {
        const angle = index / segments * Math.PI * 2;
        const next = (index + 1) / segments * Math.PI * 2;
        const radial = (x, size, theta) => [x, Math.cos(theta) * size, Math.sin(theta) * size];
        const surface = [radial(start, radius, angle), radial(end, radius, angle),
          radial(end, radius, next), radial(start, radius, next)];
        const mid = (angle + next) / 2;
        faces.push({ points: surface, normal: [0, Math.cos(mid), Math.sin(mid)], color: side });
        for (const [edge, direction] of [[start, -1], [end, 1]]) {
          faces.push({
            points: [radial(edge, inner, angle), radial(edge, radius, angle),
              radial(edge, radius, next), radial(edge, inner, next)],
            normal: [direction, 0, 0],
            color: cap,
          });
        }
      }
    }

    cylinder(-2.48, 2.48, .066, steel, steel);
    for (const end of [-1, 1]) {
      const piece = (a, b, radius, side, cap, inner) => {
        const bounds = [a * end, b * end].sort((left, right) => left - right);
        cylinder(...bounds, radius, side, cap, inner);
      };
      piece(1.36, 2.54, .112, steel, steel);
      piece(1.31, 1.43, .174, rubber, steel);
      const plates = (load - 20) / 20;
      for (let index = 0; index < plates; index++) {
        const offset = 1.46 + index * .25;
        const radius = .79 + index * .025;
        const face = index === plates - 1 ? lime : rubber;
        piece(offset, offset + .15, radius, rubber, face, .112);
        piece(offset + .15, offset + .185, radius * .93, face, face, .112);
        piece(offset + .185, offset + .203, radius * .85, rubber, rubber, .112);
        piece(offset + .203, offset + .210, radius * .68, rubber, face, .112);
        piece(offset + .210, offset + .218, radius * .55, rubber, rubber, .112);
        piece(offset + .218, offset + .231, radius * .22, rubber, steel, .112);
      }
      const collar = 1.46 + plates * .25;
      piece(collar, collar + .10, .185, rubber, steel);
      piece(2.50, 2.57, .126, steel, rubber);
    }
    return faces;
  }

  function colorOf(color, normal, yaw, pitch) {
    const side = Math.sin(yaw) * normal[0] + Math.cos(yaw) * normal[2];
    const up = normal[1] * Math.cos(pitch);
    const brightness = .54 + .48 * Math.max(0, .43 * side + .83 * up - .26 * normal[0]);
    return 'rgb(' + color.map((channel) => Math.round(channel * brightness)).join(' ') + ')';
  }

  function draw(time) {
    animationFrame = 0;
    if (!width || !height) return;
    const dt = Math.min(32, time - (lastTime || time));
    lastTime = time;
    camera += (pointer - camera) * Math.min(1, dt / 105);
    ambientStart ??= time;
    const age = time - ambientStart;
    const elapsed = liftStart === null ? null : (time - liftStart) / 1050;
    const lifting = elapsed !== null && elapsed < 1;
    const stroke = lifting ? Math.sin(Math.PI * Math.pow(elapsed, .82)) ** 1.55 : 0;
    const shownStroke = reducedMotion.matches ? 0 : stroke;
    const intro = reducedMotion.matches ? 0 : Math.max(0, 1 - age / 1200) ** 3;
    const yaw = .64 + camera * .28 + intro * .72;
    const pitch = .28 + camera * .08;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const centerX = width * .5;
    const centerY = height * (.47 - .17 * shownStroke);
    const sceneScale = scale * (1 - intro * .18);

    context.clearRect(0, 0, width, height);
    const shadow = context.createRadialGradient(width * .49, 0, 0, width * .49, 0, width * .39);
    shadow.addColorStop(0, 'rgba(0, 0, 0, .56)');
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.save();
    context.translate(0, height * .77);
    context.scale(1, .16 + shownStroke * .05);
    context.fillStyle = shadow;
    context.fillRect(0, -width, width, width * 2);
    context.restore();

    const projected = mesh.flatMap((face) => {
      const [nx, ny, nz] = face.normal;
      const facing = (nx * sinYaw + nz * cosYaw) * cosPitch + ny * sinPitch;
      if (facing < -.015) return [];
      const points = face.points.map(([x, y, z]) => {
        const depth = x * sinYaw + z * cosYaw;
        const distance = depth * cosPitch + y * sinPitch;
        const perspective = 1 + distance * .085;
        return [
          centerX + (x * cosYaw - z * sinYaw) * sceneScale * perspective,
          centerY + (depth * sinPitch - y * cosPitch) * sceneScale * perspective,
        ];
      });
      // The pieces share one axle. Order them along it so a nearby cap
      // covers the far barrel even when the plate spans a wide depth range.
      const depth = (face.points[0][0] + face.points[1][0]) * sinYaw / 2;
      return [{ points, depth, color: colorOf(face.color, face.normal, yaw, pitch) }];
    });

    for (const { points, color } of projected.sort((a, b) => a.depth - b.depth)) {
      context.beginPath();
      context.moveTo(points[0][0], points[0][1]);
      for (const [x, y] of points.slice(1)) context.lineTo(x, y);
      context.closePath();
      context.fillStyle = color;
      context.strokeStyle = color;
      context.lineWidth = .6;
      context.stroke();
      context.fill();
    }

    if (shownStroke > .18) {
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(236, 253, 88,' + shownStroke * .45 + ')';
      for (const offset of [-.25, -.17, .19, .25]) {
        const x = centerX + width * offset;
        context.beginPath();
        context.moveTo(x, height * .68);
        context.lineTo(x, height * (.68 - shownStroke * .12));
        context.stroke();
      }
    }

    if (liftStart !== null && !lifting) {
      liftStart = null;
      counter.value = String(++repetitions).padStart(2, '0');
      lift.removeAttribute('aria-disabled');
    }
    if (lifting || (active && (intro > 0 || Math.abs(pointer - camera) > .003))) render();
  }

  function render() {
    if (!animationFrame) animationFrame = requestAnimationFrame(draw);
  }

  new ResizeObserver(() => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    const pixelRatio = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    scale = Math.min(width / 5.3, height / 2.85);
    render();
  }).observe(canvas);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) render();
    }).observe(canvas);
  }

  mesh = buildBarbell(Number(weights.querySelector('input:checked').value));
  weights.addEventListener('change', (event) => {
    mesh = buildBarbell(Number(event.target.value));
    render();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
    pointer = (event.clientX - canvas.getBoundingClientRect().left) / width * 2 - 1;
    render();
  });
  canvas.addEventListener('pointerleave', () => {
    pointer = 0;
    render();
  });
  reducedMotion.addEventListener('change', () => {
    pointer = 0;
    camera = 0;
    render();
  });
  lift.addEventListener('click', () => {
    if (liftStart !== null) return;
    if (reducedMotion.matches) {
      counter.value = String(++repetitions).padStart(2, '0');
      return;
    }
    liftStart = performance.now();
    lift.setAttribute('aria-disabled', 'true');
    render();
  });
} else {
  lift.disabled = true;
  document.querySelector('.weights').disabled = true;
}
