(() => {
  const tour = document.querySelector('.tour');
  const stage = tour.querySelector('.tour-stage');
  const canvas = tour.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.classList.add('tour-fallback');
  const { width: roomWidth, depth: roomDepth, zones, equipment, descriptions } = capsuleLayout;

  const title = tour.querySelector('h2');
  const caption = tour.querySelector('.tour-caption');
  const track = [...tour.querySelectorAll('.tour-track i')];
  const nav = document.querySelector('.nav');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const states = [
    ['ЗАГЛЯНИ', 'ВНУТРЬ.', 'Вход в капсулу. Прокрути, чтобы открыть дверь.'],
    ['СИЛОВАЯ', 'ЗОНА.', descriptions.strength],
    ['КАРДИО', 'И РАЗМИНКА.', descriptions.floor],
  ];
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (from, to, value) => {
    const t = clamp((value - from) / (to - from));
    return t * t * (3 - 2 * t);
  };

  let width = 0;
  let height = 0;
  let frame = 0;
  let lastState = -1;
  let lastProgress = -1;
  let scene = [];
  let camera;
  let yaw;
  let focal;
  let centerX;
  let centerY;

  function polygon(points, color, stroke, layer = 0) {
    scene.push({ points, color, stroke, layer, depth: 0 });
  }

  function line(a, b, color, layer = 0) {
    polygon([a, b], null, color, layer);
  }

  function box(x, y, z, w, h, d, palette) {
    const [front, top, side] = palette;
    const a = [x, y, z], b = [x + w, y, z], c = [x + w, y + h, z], e = [x, y + h, z];
    const f = [x, y, z + d], g = [x + w, y, z + d], j = [x + w, y + h, z + d], k = [x, y + h, z + d];
    polygon([a, b, c, e], front);
    polygon([e, c, j, k], top);
    polygon([a, e, k, f], side);
    polygon([b, g, j, c], side);
    polygon([f, g, j, k], front);
  }

  function transform([x, y, z]) {
    const horizontal = x - camera.x;
    const forward = z - camera.z;
    return [horizontal * yaw.c - forward * yaw.s, y - camera.y, forward * yaw.c + horizontal * yaw.s];
  }

  function clip(points) {
    const result = [];
    const near = .22;
    for (let i = 0; i < points.length; i++) {
      const start = points[i];
      const end = points[(i + 1) % points.length];
      const startIn = start[2] >= near;
      const endIn = end[2] >= near;
      if (startIn) result.push(start);
      if (startIn !== endIn) {
        const t = (near - start[2]) / (end[2] - start[2]);
        result.push([mix(start[0], end[0], t), mix(start[1], end[1], t), near]);
      }
    }
    return result;
  }

  function paint() {
    const visible = [];
    for (const face of scene) {
      const points = clip(face.points.map(transform));
      if (points.length < 2) continue;
      face.depth = points.reduce((sum, p) => sum + p[2], 0) / points.length;
      visible.push({ face, points });
    }
    visible.sort((a, b) => a.face.layer - b.face.layer || b.face.depth - a.face.depth);
    for (const { face, points } of visible) {
      ctx.beginPath();
      for (const [index, [x, y, z]] of points.entries()) {
        const px = centerX + focal * x / z;
        const py = centerY - focal * y / z;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      if (face.color) {
        ctx.closePath();
        ctx.fillStyle = face.color;
        ctx.fill();
      }
      if (face.stroke) {
        ctx.strokeStyle = face.stroke;
        ctx.stroke();
      }
    }
  }

  const frames = ['#323831', '#565f50', '#242a24'];
  const upholstery = ['#292d27', '#424a3b', '#1b211c'];
  const steel = ['#626c5d', '#9aab8d', '#394336'];

  function architecture() {
    const w = roomWidth / 2;
    const h = 2.8;
    const d = roomDepth;

    polygon([[-w, 0, 0], [w, 0, 0], [w, 0, d], [-w, 0, d]], '#323830', null, -2);
    polygon([[-w, h, 0], [w, h, 0], [w, h, d], [-w, h, d]], '#242a22', null, -2);
    polygon([[-w, 0, d], [w, 0, d], [w, h, d], [-w, h, d]], '#3f493c', null, -2);
    polygon([[-w, 0, 0], [-w, 0, d], [-w, h, d], [-w, h, 0]], '#30392f', null, -2);
    polygon([[w, 0, 0], [w, 0, d], [w, h, d], [w, h, 0]], '#374035', null, -2);

    for (let x = -1; x <= 1; x += .5) line([x, .003, 0], [x, .003, d], '#485045', -1);
    for (let z = .25; z < d; z += .5) {
      line([-w, .005, z], [w, .005, z], '#485045', -1);
      line([w - .005, .03, z], [w - .005, h - .08, z], '#495447', -1);
      line([-w + .005, .03, z], [-w + .005, h - .08, z], '#465043', -1);
    }

    for (const x of [-.8, .8]) {
      polygon([[x, h - .016, .15], [x + .055, h - .016, .15], [x + .055, h - .016, d - .17], [x, h - .016, d - .17]], '#e7fab0', null, -1);
    }
    polygon([[-w + .04, 2.2, d - .012], [w - .04, 2.2, d - .012], [w - .04, 2.24, d - .012], [-w + .04, 2.24, d - .012]], '#9ba962', null, -1);
    for (let x = -1; x <= 1; x += .45) line([x, .24, d - .014], [x, 2.16, d - .014], '#535f4c', -1);
  }

  function drawEquipment() {
    const { rack, bench, dumbbells, bike, mat } = equipment;
    box(mat.x - mat.width / 2, .021, mat.z - mat.depth / 2, mat.width, .028, mat.depth, ['#626a44', '#7d8756', '#333b2c']);
    const postXs = [-1, 1].map((side) => rack.x + side * (rack.width / 2 - .04));
    const postZs = [-1, 1].map((side) => rack.z + side * (rack.depth / 2 - .036));
    for (const x of postXs) {
      box(x - .045, 0, rack.z - rack.depth / 2, .09, .06, rack.depth, frames);
      box(x - .035, 2.11, rack.z - rack.depth / 2, .07, .07, rack.depth, frames);
      for (const z of postZs) box(x - .036, 0, z - .036, .072, 2.14, .072, frames);
    }
    for (const z of postZs) box(rack.x - rack.width / 2, 2.11, z - .025, rack.width, .05, .05, steel);
    const barZ = postZs[0] - .071;
    box(rack.x - rack.width / 2 - .03, 1.135, barZ, rack.width + .06, .03, .025, steel);
    for (const x of postXs) disk(x, 1.15, barZ, .145, upholstery[0]);
    for (const x of [rack.x + .105, rack.x + .275]) {
      box(x - .012, 1.30, postZs[0] - .012, .024, .84, .024, frames);
      box(x - .05, 1.22, postZs[0] - .018, .10, .03, .036, steel);
    }

    const benchStart = bench.z - bench.depth / 2;
    for (const z of [benchStart + .08, benchStart + bench.depth - .15]) {
      box(bench.x - .19, .035, z, .38, .07, .09, steel);
      box(bench.x - .03, .095, z, .06, .34, .08, frames);
    }
    box(bench.x - .16, .39, benchStart, .32, .072, .32, upholstery);
    const benchEdges = [bench.x - .18, bench.x + .18];
    polygon([[benchEdges[0], .44, bench.z - .17], [benchEdges[1], .44, bench.z - .17],
      [benchEdges[1], .73, bench.z + .45], [benchEdges[0], .73, bench.z + .45]], upholstery[1]);
    const shelfLeft = dumbbells.x - dumbbells.width / 2;
    const shelfFront = dumbbells.z - dumbbells.depth / 2;
    for (const y of [.23, .47, .71]) {
      box(shelfLeft, y, shelfFront, dumbbells.width, .06, dumbbells.depth, steel);
      for (let i = 0; i < 3; i++) {
        const x = shelfLeft + .12 + i * .26;
        box(x, y + .06, shelfFront + .07, .19, .10, .16, frames);
      }
    }

    for (const z of [bike.z - .39, bike.z + .39]) box(bike.x - .25, .03, z, .50, .053, .08, frames);
    box(bike.x - .06, .073, bike.z - .39, .12, .075, .85, frames);
    box(bike.x - .037, .17, bike.z - .23, .074, .67, .061, frames);
    box(bike.x - .11, .81, bike.z - .32, .22, .06, .27, upholstery);
    box(bike.x - .031, .25, bike.z + .22, .062, .83, .07, frames);
    box(bike.x - .22, 1.055, bike.z + .20, .44, .05, .14, steel);
    box(bike.x - .10, 1.10, bike.z + .27, .20, .12, .037, frames);
    disk(bike.x - .08, .30, bike.z + .03, .218, upholstery[0]);
    disk(bike.x - .083, .30, bike.z + .03, .159, frames[1]);
    disk(bike.x + .08, .30, bike.z + .03, .218, upholstery[0]);
    disk(bike.x + .083, .30, bike.z + .03, .159, frames[1]);
  }

  function disk(x, y, z, radius, color) {
    const points = Array.from({ length: 16 }, (_, index) => {
      const angle = index / 16 * 2 * Math.PI;
      return [x, y + Math.cos(angle) * radius, z + Math.sin(angle) * radius];
    });
    polygon(points, color);
  }

  function entrance(open) {
    const z = 0;
    const x = roomWidth / 2;
    const h = 2.8;
    const lintel = 2.27;
    const gap = zones.entry.width / 2;
    const front = '#50594c';
    const edge = '#6f7a69';
    const frame = (x1, y1, x2, y2, color, depth = z) =>
      polygon([[x1, y1, depth], [x2, y1, depth], [x2, y2, depth], [x1, y2, depth]], color, null, 2);
    const shellDepth = roomDepth;
    polygon([[-x, h, 0], [x, h, 0], [x, h, shellDepth], [-x, h, shellDepth]], '#50594d', null, 1);
    if (camera.x < -x) {
      polygon([[-x, 0, 0], [-x, 0, shellDepth], [-x, h, shellDepth], [-x, h, 0]], '#3a443c', null, 1);
    }
    frame(-x, 0, -gap, lintel, front);
    frame(gap, 0, x, lintel, '#465143');
    frame(-x, lintel, x, h, '#65715e');
    frame(-x, h - .08, x, h, '#879380', -.012);
    frame(-x + .18, 2.48, x - .18, 2.50, '#89967c', -.013);
    for (const side of [-1, 1]) {
      const x1 = side * x * .72;
      frame(x1, .10, x1 + .024, lintel, '#77816f', -.013);
    }
    frame(-x, -.10, x, 0, '#374034');
    frame(-x, 0, -x + .07, h, edge, -.012);
    frame(-gap - .055, 0, -gap, lintel, '#e3f56e', -.015);
    frame(gap, 0, gap + .055, lintel, '#e3f56e', -.015);
    frame(-gap, lintel - .041, gap, lintel, '#e3f56e', -.015);
    frame(-gap, .026, gap, .063, '#9ca74e', -.015);

    const slide = gap * open;
    if (slide < gap - .001) {
      const door = (left, right) => {
        frame(left, .067, right, lintel - .046, '#26332ee8', -.035);
        frame(left + .015, .08, right - .014, .108, '#7a8875', -.041);
        frame(left + .02, 1.44, right - .018, 1.46, '#83938380', -.041);
      };
      door(-gap, -slide);
      door(slide, gap);
      if (slide < gap * .75) {
        frame(-slide - .083, .93, -slide - .06, 1.18, '#ccdd73', -.046);
        frame(slide + .06, .93, slide + .083, 1.18, '#ccdd73', -.046);
      }
    }
    frame(.24 + gap, .92, .40 + gap, 1.27, '#263127', -.025);
    frame(.27 + gap, 1.14, .37 + gap, 1.19, '#dcec72', -.031);
    for (const y of [.34, .42, .5, .58]) frame(-x + .12, y, -x + .46, y + .012, '#222e24', -.022);
  }

  function render() {
    frame = 0;
    if (!width || !height) return;
    const available = tour.offsetHeight - stage.offsetHeight;
    const scrolling = tour.classList.contains('is-playing');
    const progress = scrolling && available > 0
      ? clamp((nav.offsetHeight - tour.getBoundingClientRect().top) / available)
      : .69;
    if (progress === lastProgress) return;
    lastProgress = progress;

    const walk = ease(.24, .74, progress);
    const pan = ease(.65, .92, progress);
    const open = scrolling ? ease(.08, .39, progress) : 1;

    camera = { x: mix(-1.2, 0, walk), y: mix(1.56, 1.15, walk), z: mix(-5.6, .13, walk) };
    const swing = scrolling ? mix(.105, .20, walk) - .50 * pan : 0;
    yaw = { c: Math.cos(swing), s: Math.sin(swing) };
    focal = Math.min(width * (width < 650 ? 1.36 : 1.08), height * mix(1.22, .94, walk));
    centerX = width * (width < 650 ? .50 : .42);
    centerY = height * ((width < 650 ? .41 : .49) - .12 * walk - .035 * pan);
    scene = [];

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    if (camera.z < 0) {
      for (let x = -8; x <= 8; x++) line([x, -.13, -6], [x, -.13, 0], '#384038', -4);
      for (let z = -6; z <= 0; z += .5) line([-8, -.13, z], [8, -.13, z], '#384038', -4);
    }
    architecture();
    drawEquipment();
    if (camera.z < -.12) entrance(open);
    paint();
    const preview = document.querySelector('#capsule-preview');
    if (!preview.dataset.rendered) {
      preview.width = canvas.width;
      preview.height = canvas.height;
      const image = preview.getContext('2d');
      image.translate(preview.width, 0);
      image.scale(-1, 1);
      image.drawImage(canvas, 0, 0);
      preview.dataset.rendered = 'true';
    }

    const state = !scrolling ? -1 : progress < .43 ? 0 : progress < .76 ? 1 : 2;
    if (state !== lastState || !scrolling) {
      lastState = state;
      const [first, second, copy] = state < 0
        ? ['ВНУТРИ', 'КАПСУЛЫ.', descriptions.overview]
        : states[state];
      title.replaceChildren(first, document.createElement('br'), second);
      if (scrolling) {
        title.getAnimations().forEach((animation) => animation.cancel());
        title.animate(
          [{ opacity: .5, transform: 'translateY(9px)' }, { opacity: 1, transform: 'none' }],
          { duration: 240, easing: 'ease-out' },
        );
      }
      caption.textContent = copy;
      track.forEach((segment, index) => segment.classList.toggle('is-current', index <= state));
    }
  }

  function queueRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const pixelRatio = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    lastProgress = -1;
    queueRender();
  }

  function configureMotion() {
    tour.classList.toggle('is-playing', !motion.matches);
    resize();
  }

  addEventListener('scroll', queueRender, { passive: true });
  new ResizeObserver(resize).observe(stage);
  motion.addEventListener('change', configureMotion);
  configureMotion();
})();
