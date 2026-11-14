(() => {
  const tour = document.querySelector('.tour');
  const stage = tour.querySelector('.tour-stage');
  const canvas = tour.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.classList.add('tour-fallback');
  const { width: roomWidth, depth: roomDepth, zones, equipment } = capsuleLayout;

  const title = tour.querySelector('h2');
  const caption = tour.querySelector('.tour-caption');
  const track = [...tour.querySelectorAll('.tour-track i')];
  const nav = document.querySelector('.nav');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const states = [
    ['ЗАГЛЯНИ', 'ВНУТРЬ.', 'Вход в капсулу. Прокрути, чтобы открыть дверь.'],
    ['БЛОЧНЫЙ', 'ТРЕНАЖЁР.', 'Сразу справа от входа — регулируемые рукояти для тяги.'],
    ['СИЛОВАЯ', 'ЗОНА.', 'Дальше справа — стойка со штангой, скамья и гантели.'],
    ['КАРДИО И', 'РАЗМИНКА.', 'Слева от входа — велотренажёр и коврик.'],
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

  function circle(x, y, z, radius, color, segments = 20) {
    const points = Array.from({ length: segments }, (_, index) => {
      const angle = index * Math.PI * 2 / segments;
      return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, z];
    });
    polygon(points, color);
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
  const accent = ['#a7b437', '#ecfd58', '#677323'];

  function architecture() {
    const w = roomWidth / 2;
    const h = 2.8;
    const d = roomDepth;

    polygon([[-w, 0, 0], [w, 0, 0], [w, 0, d], [-w, 0, d]], '#323830', null, -2);
    polygon([[-w, h, 0], [w, h, 0], [w, h, d], [-w, h, d]], '#242a22', null, -2);
    polygon([[-w, 0, d], [w, 0, d], [w, h, d], [-w, h, d]], '#3f493c', null, -2);
    polygon([[-w, 0, 0], [-w, 0, d], [-w, h, d], [-w, h, 0]], '#30392f', null, -2);
    polygon([[w, 0, 0], [w, 0, d], [w, h, d], [w, h, 0]], '#374035', null, -2);

    for (let x = -2; x <= 2; x += .5) line([x, .003, 0], [x, .003, d], '#485045', -1);
    for (let z = .25; z < d; z += .5) {
      line([-w, .005, z], [w, .005, z], '#485045', -1);
      line([w - .005, .03, z], [w - .005, h - .08, z], '#495447', -1);
      line([-w + .005, .03, z], [-w + .005, h - .08, z], '#465043', -1);
    }

    for (const x of [-1.52, 1.5]) {
      polygon([[x, h - .016, .15], [x + .055, h - .016, .15], [x + .055, h - .016, d - .17], [x, h - .016, d - .17]], '#e7fab0', null, -1);
    }
    polygon([[-2.27, 2.2, d - .012], [2.27, 2.2, d - .012], [2.27, 2.24, d - .012], [-2.27, 2.24, d - .012]], '#9ba962', null, -1);
    for (let x = -1.8; x <= 1.8; x += .45) line([x, .24, d - .014], [x, 2.16, d - .014], '#535f4c', -1);
  }

  function drawEquipment(strength, free) {
    const light = strength > .45 ? accent : steel;
    const matLight = Math.round(44 + free * 64);
    const floorColor = 'rgb(' + matLight + ' ' + (matLight + 13) + ' 47)';
    polygon([[-2.18, .012, 1.1], [-.15, .012, 1.1], [-.15, .012, 5.05], [-2.18, .012, 5.05]], '#222923', strength > .45 ? '#bdc94e' : '#60684d', -1);
    polygon([[.25, .014, 1.65], [2, .014, 1.65], [2, .014, 4.95], [.25, .014, 4.95]], floorColor, free > .42 ? '#e1f35a' : '#747b59', -1);
    for (let z = 1.85; z < 4.9; z += .22) line([.31, .022, z], [1.94, .022, z], '#a2ac6937', -1);
    const { rack, bench, dumbbells, mat, cable, bike } = equipment;
    const cableLeft = cable.x - cable.width / 2;
    const cableFront = cable.z - cable.depth / 2;
    for (const x of [cableLeft, cableLeft + cable.width - .17]) {
      box(x, .025, cableFront, .17, .09, cable.depth, frames);
      box(x, .09, cableFront + .46, .17, 2.02, .18, steel);
      box(x, .10, cableFront + .13, .17, .53, .29, frames);
    }
    box(cableLeft, 2.06, cableFront + .46, cable.width, .10, .18, steel);
    const bikeFront = bike.z - bike.depth / 2;
    for (const z of [bikeFront + .08, bikeFront + bike.depth - .15]) {
      box(bike.x - bike.width / 2, .025, z, bike.width, .06, .10, frames);
    }
    circle(bike.x, .3, bikeFront + .28, .23, '#333b35');
    box(bike.x - .075, .1, bikeFront + .27, .15, .10, .75, frames);
    box(bike.x - .032, .17, bikeFront + .78, .064, .77, .06, steel);
    box(bike.x - .11, .93, bikeFront + .68, .22, .06, .26, upholstery);
    box(bike.x - .028, .31, bikeFront + .21, .056, .76, .059, steel);
    box(bike.x - .23, 1.05, bikeFront + .18, .46, .058, .075, upholstery);
    box(mat.x - mat.width / 2, .021, mat.z - mat.depth / 2, mat.width, .028, mat.depth, ['#626a44', '#7d8756', '#333b2c']);

    for (const x of [rack.x - rack.width / 2, rack.x + rack.width / 2 - .105]) {
      box(x, .007, 3.83, .105, 2.19, .11, steel);
      box(x - .10, .008, 3.26, .30, .105, 1.33, frames);
      box(x - .018, 1.06, 3.76, .15, .09, .29, light);
    }
    box(-1.93, 2.08, 3.83, 1.45, .1, .11, steel);
    box(-2.1, 1.15, 3.72, 1.85, .052, .054, steel);
    for (const x of [-1.91, -1.78, -.57, -.44]) {
      circle(x, 1.18, 3.75, .185, '#32382c');
      circle(x, 1.18, 3.728, .155, strength > .45 ? '#b3c046' : '#707d4a');
      circle(x, 1.18, 3.71, .075, '#32382c');
    }
    box(-1.42, .04, 2.13, .11, .45, 1.38, steel);
    box(-1.62, .04, 2.13, .53, .10, .13, steel);
    box(-1.62, .04, 3.36, .53, .10, .13, steel);
    box(bench.x - .22, .465, bench.z - bench.depth / 2, .44, .1, bench.depth, upholstery);
    box(dumbbells.x - dumbbells.width / 2, .07, dumbbells.z - dumbbells.depth / 2, dumbbells.width, .08, dumbbells.depth, frames);
    box(dumbbells.x - dumbbells.width / 2, .36, dumbbells.z - dumbbells.depth / 2, dumbbells.width, .07, dumbbells.depth, steel);
    for (let i = 0; i < 5; i++) {
      const x = -2.0 + .28 * i;
      box(x, .43, 4.62, .075, .13, .19, frames);
      box(x + .16, .43, 4.62, .075, .13, .19, frames);
      box(x + .07, .475, 4.69, .092, .038, .04, steel);
    }
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
      const x1 = side * 1.7;
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
      if (slide < .8) {
        frame(-slide - .083, .93, -slide - .06, 1.18, '#ccdd73', -.046);
        frame(slide + .06, .93, slide + .083, 1.18, '#ccdd73', -.046);
      }
    }
    frame(.5 + gap, .92, .66 + gap, 1.27, '#263127', -.025);
    frame(.53 + gap, 1.14, .63 + gap, 1.19, '#dcec72', -.031);
    for (const y of [.34, .42, .5, .58]) frame(-1.91, y, -1.28, y + .012, '#222e24', -.022);
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
    const strength = ease(.38, .62, progress) * (1 - ease(.76, .94, progress));
    const free = ease(.72, .95, progress);
    const open = scrolling ? ease(.08, .39, progress) : 1;

    camera = { x: mix(-1.52, -.12, walk) + .32 * pan, y: mix(1.56, 1.15, walk), z: mix(-8.05, .96, walk) };
    const swing = mix(.105, -.18, walk) + .46 * pan;
    yaw = { c: Math.cos(swing), s: Math.sin(swing) };
    focal = Math.min(width * (width < 650 ? 1.36 : 1.08), height * 1.22);
    centerX = width * (width < 650 ? .50 : .62);
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
    drawEquipment(strength, free);
    if (camera.z < -.12) entrance(open);
    paint();

    const state = !scrolling ? -1 : progress < .30 ? 0 : progress < .49 ? 1 : progress < .78 ? 2 : 3;
    if (state !== lastState || !scrolling) {
      lastState = state;
      const [first, second, copy] = state < 0
        ? ['ВНУТРИ', 'КАПСУЛЫ.', 'Блочный тренажёр и свободные веса справа, велотренажёр и коврик слева.']
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
