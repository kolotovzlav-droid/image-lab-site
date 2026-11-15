import * as THREE from './vendor/three.module.min.js';

export function startTour() {
  const { width, depth, zones, equipment, descriptions } = capsuleLayout;
  const { rack, bench, dumbbells, bike, mat: matPlan } = equipment;
  const tour = document.querySelector('#tour');
  const stage = tour.querySelector('.tour-stage');
  const canvas = tour.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  canvas.dataset.renderer = 'webgl';
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.27;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x171b20);
  scene.fog = new THREE.FogExp2(0x171b20, .060);
  const camera = new THREE.PerspectiveCamera(46, 1, .035, 45);
  const mobile = matchMedia('(max-width: 650px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');

  function surface(color, roughness, metalness = 0, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  }

  function seededNoise(size, type, repeatX, repeatY) {
    const image = document.createElement('canvas');
    image.width = image.height = size;
    const ctx = image.getContext('2d');
    const pixels = ctx.createImageData(size, size);
    let seed = 42;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let i = 0; i < pixels.data.length; i += 4) {
      const x = i / 4 % size;
      const y = Math.floor(i / 4 / size);
      const value = type === 'wood'
        ? 168 + 8 * Math.sin(x * .37 + .6 * Math.sin(y / 94)) + random() * 37
        : 128 + random() * 69 + (random() > .97 ? 51 : 0);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(image);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  const grain = seededNoise(128, 'rubber', 6, 6);
  const timber = seededNoise(256, 'wood', 1, 1);
  const rubberFloor = surface(0x3f4344, .91, 0, { map: grain, bumpMap: grain, bumpScale: .016 });
  const rubber = surface(0x252a2d, .76, 0, { bumpMap: grain, bumpScale: .012 });
  const concrete = surface(0x676b6c, .86, 0, { map: grain, bumpMap: grain, bumpScale: .008 });
  const dark = surface(0x21272b, .46, .26);
  const outer = surface(0x9a9d9a, .36, .49);
  const frame = surface(0x333a3f, .42, .5);
  const steel = surface(0xd3dbe0, .24, .85);
  const wood = surface(0x957253, .57, 0, { map: timber, bumpMap: timber, bumpScale: .009 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x9ebcb6, roughness: .13, metalness: .12, transparent: true,
    opacity: .25, depthWrite: false, side: THREE.DoubleSide,
  });
  const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.55, 1.67, 1.33) });
  const guide = new THREE.MeshBasicMaterial({ color: 0xcddd63 });

  // Large emissive panels give polished metal and glass something to reflect.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x626a72);
  for (const [x, y, z, w, h, color] of [
    [0, 4, 1, 6, 2, [3, 2.8, 2.45]],
    [-4, 1, 1, 2, 4, [1.1, 1.55, 2.1]],
    [4, 2, 2, 3, 4, [2.4, 2.5, 1.7]],
    [0, 1, -4, 5, 3, [1.4, 1.6, 1.9]],
  ]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), side: THREE.DoubleSide }));
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio, .04).texture;
  scene.environmentIntensity = .45;
  pmrem.dispose();
  studio.traverse((object) => {
    object.geometry?.dispose();
    object.material?.dispose();
  });

  function mesh(geometry, material, x, y, z, parent = scene, shadow = true) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = shadow;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function box(w, h, d, x, y, z, material, parent, shadow) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent, shadow);
  }

  function rod(radius, length, x, y, z, material, parent, axis = 'x', sides = 32) {
    const object = mesh(new THREE.CylinderGeometry(radius, radius, length, sides), material, x, y, z, parent);
    if (axis === 'x') object.rotation.z = Math.PI / 2;
    return object;
  }

  function light(x, y, z, color, intensity, target, shadow = false) {
    const lamp = new THREE.SpotLight(color, intensity, 24, .94, .6, 2);
    lamp.position.set(x, y, z);
    lamp.target.position.set(...target);
    scene.add(lamp, lamp.target);
    if (shadow) {
      lamp.castShadow = true;
      lamp.shadow.mapSize.set(1024, 1024);
      lamp.shadow.camera.near = .1;
      lamp.shadow.camera.far = 16;
      lamp.shadow.normalBias = .027;
      lamp.shadow.bias = -.00015;
    }
    return lamp;
  }

  scene.add(new THREE.HemisphereLight(0xc1d0e2, 0x5c564b, 1.38));
  light(-4.3, 5.5, -5.8, 0xe0eeff, 155, [0, 1.1, 0]);
  light(.8, 2.72, .72, 0xf8f5db, 24, [bench.x, .35, bench.z], true);
  light(-.8, 2.71, depth - .35, 0xe2eaff, 15, [0, .9, 1.4]);
  const cardioLight = light(-.83, 2.73, 2.14, 0xffe1b9, 8, [bike.x, .55, bike.z]);

  box(85, .17, 85, 0, -.205, 4, concrete, scene, false);
  light(-3.4, 6.8, -5.9, 0xdae7ef, 122, [0, -.10, 1.25], true);
  box(width, .14, depth, 0, -.07, depth / 2, rubberFloor);
  box(width, .14, depth, 0, 2.87, depth / 2, dark, scene, false);
  for (const x of [-width / 2, width / 2]) {
    box(.09, 2.8, depth, x, 1.4, depth / 2, dark, scene, false);
    box(.10, .105, depth - .08, x * .96, .055, depth / 2, frame);
    for (let z = .44; z < depth - .1; z += .74) box(.022, 2.58, .017, x * .95, 1.39, z, frame);
    box(.104, .047, depth - .46, x * .66, 2.78, depth / 2, frame);
    box(.064, .02, depth - .50, x * .66, 2.749, depth / 2, strip, scene, false);
  }
  box(width, 2.8, .10, 0, 1.40, depth - .01, dark, scene, false);
  for (let x = -width / 2 + .12; x < width / 2 - .09; x += .124) {
    box(.088, 2.64, .042, x, 1.4, depth - .09, wood);
  }
  box(width - .18, .033, .04, 0, 2.30, depth - .12, strip, scene, false);
  for (let z = .22; z < depth - .08; z += .51) box(width - .09, .002, .008, 0, .004, z, dark, scene, false);

  box(width + .04, .29, .16, 0, 2.645, -.03, outer);
  box(width, .13, .12, 0, -.065, -.035, frame);
  const doorWidth = zones.entry.width / 2;
  for (const side of [-1, 1]) {
    const panelWidth = width / 2 - doorWidth;
    box(panelWidth, 2.54, .15, side * (doorWidth + panelWidth / 2), 1.27, -.04, outer);
    box(.079, 2.55, .124, side * (doorWidth + .035), 1.275, -.115, frame);
    box(.014, 2.32, .026, side * (doorWidth - .015), 1.18, -.182, guide, scene, false);
    for (let i = 0; i < 6; i++) box(.45, .012, .008, side * (width * .35), .36 + i * .049, -.12, dark);
  }
  box(zones.entry.width, .018, .023, 0, 2.352, -.183, guide, scene, false);
  box(.16, .28, .035, -.72, 1.24, -.142, frame);
  box(.075, .05, .008, -.72, 1.29, -.164, guide, scene, false);
  const doors = [-1, 1].map((side) => {
    const door = new THREE.Group();
    scene.add(door);
    box(doorWidth - .025, 2.28, .022, 0, 1.18, -.103, glass, door, false);
    for (const x of [-doorWidth / 2 + .02, doorWidth / 2 - .02]) box(.026, 2.31, .042, x, 1.18, -.104, frame, door);
    for (const y of [.037, 2.325]) box(doorWidth - .01, .035, .042, 0, y, -.104, frame, door);
    rod(.013, .20, -.14 * side, 1.05, -.145, steel, door, 'y');
    return { door, side };
  });

  box(zones.strength.width, .017, zones.strength.depth, zones.strength.x, .012, zones.strength.z, rubber);
  const rackTop = 2.14;
  const rackPosts = [-1, 1].map((side) => rack.x + side * (rack.width / 2 - .04));
  const rackEnds = [-1, 1].map((side) => rack.z + side * (rack.depth / 2 - .036));
  for (const x of rackPosts) {
    box(.095, .061, rack.depth, x, .031, rack.z, dark);
    box(.072, .065, rack.depth, x, rackTop, rack.z, frame);
    for (const z of rackEnds) {
      box(.073, rackTop, .073, x, rackTop / 2, z, frame);
      for (let y = .48; y < rackTop - .08; y += .085) {
        box(.015, .019, .002, x, y, z - .037, dark, scene, false);
      }
    }
  }
  for (const z of rackEnds) rod(.024, rack.width, rack.x, rackTop, z, frame);
  const barZ = rackEnds[0] - .071;
  rod(.016, rack.width + .06, rack.x, 1.15, barZ, steel);
  for (const side of [-1, 1]) {
    const plateX = rack.x + side * (rack.width / 2 - .06);
    rod(.145, .048, plateX, 1.15, barZ, rubber);
    rod(.042, .06, plateX, 1.15, barZ, frame);
    const strapX = rack.x + .19 + side * .085;
    box(.021, .84, .013, strapX, 1.72, rackEnds[0], dark);
    box(.023, .075, .017, strapX, 1.36, rackEnds[0], guide, scene, false);
    mesh(new THREE.TorusGeometry(.052, .008, 7, 16), rubber, strapX, 1.26, rackEnds[0]);
  }

  for (const z of [bench.z - .45, bench.z + .35]) {
    box(bench.width, .067, .087, bench.x, .046, z, frame);
    box(.055, .32, .079, bench.x, .21, z, frame);
  }
  box(.075, .065, bench.depth - .12, bench.x, .35, bench.z, frame);
  box(.32, .072, .32, bench.x, .426, bench.z - .35, rubber);
  const backrest = box(.36, .076, .70, bench.x, .57, bench.z + .12, rubber);
  backrest.rotation.x = -.46;
  for (const y of [.23, .47, .71]) {
    box(dumbbells.width, .047, dumbbells.depth, dumbbells.x, y, dumbbells.z, frame);
    for (let i = 0; i < 3; i++) {
      const x = dumbbells.x + (i - 1) * .30;
      rod(.017, .18, x, y + .096, dumbbells.z - .03, steel);
      for (const end of [-1, 1]) rod(.058 + i * .004, .044, x + end * .083, y + .097, dumbbells.z - .03, rubber, scene, 'x', 6);
    }
  }
  for (const x of [dumbbells.x - .39, dumbbells.x + .39]) box(.052, .75, .063, x, .39, dumbbells.z + .04, frame);
  const cycle = new THREE.Group();
  cycle.position.set(bike.x, 0, bike.z);
  cycle.rotation.y = .20;
  scene.add(cycle);
  for (const z of [-.39, .39]) {
    box(.50, .058, .077, 0, .041, z, frame, cycle);
    for (const x of [-.244, .244]) box(.058, .066, .088, x, .039, z, rubber, cycle);
  }
  box(.093, .075, .85, 0, .096, 0, frame, cycle);
  rod(.219, .19, 0, .29, .035, dark, cycle);
  rod(.173, .205, 0, .29, .035, frame, cycle);
  rod(.068, .221, 0, .29, .035, dark, cycle);
  for (const side of [-1, 1]) {
    const crank = box(.025, .16, .039, side * .12, .29 + side * .058, .035, frame, cycle);
    crank.rotation.x = .46;
    box(.112, .030, .087, side * .168, .29 + side * .12, .032 + side * .036, rubber, cycle);
  }
  const seatPost = box(.054, .65, .061, 0, .51, -.18, frame, cycle);
  seatPost.rotation.x = -.12;
  box(.23, .062, .27, 0, .85, -.23, rubber, cycle);
  const handlePost = box(.065, .80, .063, 0, .68, .23, frame, cycle);
  handlePost.rotation.x = .13;
  rod(.021, .43, 0, 1.075, .28, frame, cycle);
  for (const x of [-.205, .205]) {
    const grip = box(.04, .038, .19, x, 1.08, .24, rubber, cycle);
    grip.rotation.y = x;
  }
  const display = box(.23, .125, .028, 0, 1.17, .295, frame, cycle);
  display.rotation.x = .37;
  const screen = box(.189, .079, .004, 0, 1.17, .278, dark, cycle, false);
  screen.rotation.x = .37;

  const mat = surface(0x47594d, .91, 0, { bumpMap: grain, bumpScale: .008 });
  box(matPlan.width, .018, matPlan.depth, matPlan.x, .02, matPlan.z, mat);
  for (let offset = .04; offset < matPlan.depth; offset += .038) {
    box(matPlan.width - .04, .002, .006, matPlan.x, .031, matPlan.z - matPlan.depth / 2 + offset, rubber, scene, false);
  }

  const preview = document.querySelector('#capsule-preview');
  const previewContext = preview.getContext('2d');

  function renderExterior() {
    preview.width = 780;
    preview.height = 580;
    for (const { door, side } of doors) door.position.x = side * doorWidth / 2;
    camera.position.set(-3.2, 2.15, -5.3);
    camera.lookAt(0, 1.32, 1.12);
    camera.aspect = preview.width / preview.height;
    camera.updateProjectionMatrix();
    renderer.setSize(preview.width, preview.height, false);
    renderer.render(scene, camera);
    previewContext.drawImage(canvas, 0, 0, preview.width, preview.height);
  }

  renderExterior();

  const title = tour.querySelector('h2');
  const caption = tour.querySelector('.tour-caption');
  const track = [...tour.querySelectorAll('.tour-track i')];
  const nav = document.querySelector('.nav');
  const states = [
    ['ЗАГЛЯНИ', 'ВНУТРЬ.', 'Вход в капсулу. Прокрути, чтобы открыть дверь.'],
    ['СИЛОВАЯ', 'ЗОНА.', descriptions.strength],
    ['КАРДИО', 'И РАЗМИНКА.', descriptions.floor],
  ];
  let displayed = -2;
  let frameRequest = 0;
  let lastProgress = -1;

  function render() {
    frameRequest = 0;
    const available = tour.offsetHeight - stage.offsetHeight;
    const playing = !motion.matches && available > 0;
    const progress = playing
      ? THREE.MathUtils.clamp((nav.offsetHeight - tour.getBoundingClientRect().top) / available, 0, 1)
      : .68;
    if (lastProgress === progress) return;
    lastProgress = progress;
    const approach = THREE.MathUtils.smoothstep(progress, .1, .59);
    const pan = THREE.MathUtils.smoothstep(progress, .66, .92);
    const open = THREE.MathUtils.smoothstep(progress, .065, .35);
    for (const { door, side } of doors) door.position.x = side * (doorWidth / 2 + open * doorWidth);
    const narrow = mobile.matches;
    camera.fov = narrow ? 69 + 12 * approach : 43 + 15 * approach;
    camera.updateProjectionMatrix();
    camera.position.set(
      THREE.MathUtils.lerp(narrow ? -1.3 : -2.35, 0, approach),
      THREE.MathUtils.lerp(1.69, 1.37, approach),
      THREE.MathUtils.lerp(narrow ? -5.9 : -4.85, .13, approach),
    );
    camera.lookAt(
      playing ? THREE.MathUtils.lerp(narrow ? 0 : .38, .46, approach) - pan * 1.06 : .03,
      THREE.MathUtils.lerp(1.36, .81, approach),
      THREE.MathUtils.lerp(.70, 2.22, approach),
    );
    cardioLight.intensity = 8 + pan * 12;
    renderer.render(scene, camera);
    const state = !playing ? -1 : progress < .43 ? 0 : progress < .76 ? 1 : 2;
    if (state !== displayed) {
      displayed = state;
      const [first, second, copy] = state < 0
        ? ['ВНУТРИ', 'КАПСУЛЫ.', descriptions.overview]
        : states[state];
      title.replaceChildren(first, document.createElement('br'), second);
      caption.textContent = copy;
      track.forEach((segment, index) => segment.classList.toggle('is-current', index <= state));
    }
  }

  function queueRender() {
    if (!frameRequest) frameRequest = requestAnimationFrame(render);
  }

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile.matches ? 1.35 : 1.65));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    lastProgress = -1;
    queueRender();
  }

  function configureMotion() {
    tour.classList.toggle('is-playing', !motion.matches);
    resize();
  }

  addEventListener('scroll', queueRender, { passive: true });
  canvas.addEventListener('webglcontextrestored', resize);
  new ResizeObserver(resize).observe(stage);
  motion.addEventListener('change', configureMotion);
  configureMotion();
}
