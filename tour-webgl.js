import * as THREE from './vendor/three.module.min.js';

export function startTour() {
  const { width, depth, zones, equipment } = capsuleLayout;
  const { rack, bench, dumbbells, mat: matPlan, cable, bike } = equipment;
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
  const plate = surface(0x242a30, .62, .2);
  const lime = surface(0xcad83f, .38, .26);
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
  light(1.55, 2.72, 1.35, 0xf8f5db, 33, [-.85, .35, 3.3], true);
  light(-1.6, 2.71, 4.45, 0xe2eaff, 21, [-1, .9, 2.1]);
  const warmupLight = light(1.62, 2.73, 3.5, 0xe9ffab, 13, [1, .1, 3.4]);

  box(85, .17, 85, 0, -.205, 4, concrete, scene, false);
  light(-3.4, 6.8, -5.9, 0xdae7ef, 122, [0, -.10, 1.25], true);
  box(width, .14, depth, 0, -.07, depth / 2, rubberFloor);
  box(width, .14, depth, 0, 2.87, depth / 2, dark, scene, false);
  for (const x of [-width / 2, width / 2]) {
    box(.09, 2.8, 5.33, x, 1.4, 2.69, dark, scene, false);
    box(.10, .105, 5.3, x * .984, .055, 2.69, frame);
    for (let z = .44; z < 5.34; z += .74) box(.022, 2.58, .017, x * .98, 1.39, z, frame);
  }
  box(width, 2.8, .10, 0, 1.40, depth - .01, dark, scene, false);
  for (let x = -2.22; x <= 2.25; x += .124) box(.088, 2.64, .042, x, 1.4, 5.29, wood);
  box(4.55, .033, .04, 0, 2.30, 5.26, strip, scene, false);
  for (const x of [-1.49, 1.49]) {
    box(.104, .047, 4.8, x, 2.78, 2.67, frame);
    box(.064, .02, 4.74, x, 2.749, 2.67, strip, scene, false);
  }
  for (let x = -2; x <= 2; x += .5) box(.008, .002, 5.27, x, .003, 2.65, dark, scene, false);
  for (let z = .22; z < 5.28; z += .51) box(4.59, .002, .008, 0, .004, z, dark, scene, false);

  // Front panel and separate tracks for the two glass door leaves.
  box(4.75, .29, .16, 0, 2.645, -.03, outer);
  box(4.70, .13, .12, 0, -.065, -.035, frame);
  const doorWidth = zones.entry.width / 2;
  for (const side of [-1, 1]) {
    const panelWidth = width / 2 - doorWidth;
    box(panelWidth, 2.54, .15, side * (doorWidth + panelWidth / 2), 1.27, -.04, outer);
    box(.079, 2.55, .124, side * (doorWidth + .035), 1.275, -.115, frame);
    box(.014, 2.32, .026, side * (doorWidth - .015), 1.18, -.182, guide, scene, false);
    for (let i = 0; i < 6; i++) box(.45, .012, .008, side * 1.8, .36 + i * .049, -.12, dark);
  }
  box(zones.entry.width, .018, .023, 0, 2.352, -.183, guide, scene, false);
  box(.16, .28, .035, -1.47, 1.24, -.142, frame);
  box(.075, .05, .008, -1.47, 1.29, -.164, guide, scene, false);
  const doors = [-1, 1].map((side) => {
    const door = new THREE.Group();
    scene.add(door);
    box(doorWidth - .025, 2.28, .022, 0, 1.18, -.103, glass, door, false);
    for (const x of [-doorWidth / 2 + .02, doorWidth / 2 - .02]) box(.026, 2.31, .042, x, 1.18, -.104, frame, door);
    for (const y of [.037, 2.325]) box(doorWidth - .01, .035, .042, 0, y, -.104, frame, door);
    rod(.013, .20, -.39 * side, 1.05, -.145, steel, door, 'y');
    return { door, side };
  });

  // Rack, loaded bar, bench and two tiers of dumbbells.
  box(zones.strength.width, .017, zones.strength.depth, zones.strength.x, .012, zones.strength.z, rubber);
  const rackLeft = rack.x - (rack.width - .08) / 2;
  const rackRight = rack.x + (rack.width - .08) / 2;
  const rackFront = rack.z - (rack.depth - .08) / 2;
  const rackBack = rack.z + (rack.depth - .08) / 2;
  for (const x of [rackLeft, rackRight]) {
    for (const z of [rackFront, rackBack]) {
      box(.079, 2.15, .079, x, 1.094, z, frame);
      box(.15, .045, .15, x, .032, z, steel);
      for (let y = .42; y < 1.91; y += .093) {
        mesh(new THREE.CircleGeometry(.011, 12), dark, x, y, z - .042, scene, false).rotation.y = Math.PI;
      }
    }
    box(.07, .075, rack.depth, x, 2.11, rack.z, frame);
    box(.14, .085, .18, x, 1.12, rackFront - .05, lime);
  }
  box(rack.width, .085, .09, rack.x, 2.12, rackFront, frame);
  box(rack.width, .085, .09, rack.x, 2.12, rackBack, frame);
  rod(.024, 1.98, rack.x, 1.18, rackFront - .09, steel);
  for (const side of [-1, 1]) {
    const x = rack.x + side * .80;
    rod(.035, .34, x, 1.18, rackFront - .09, steel);
    rod(.20, .078, x, 1.18, rackFront - .09, plate);
    rod(.175, .027, x + side * .05, 1.18, rackFront - .09, lime);
    rod(.075, .023, x + side * .07, 1.18, rackFront - .09, dark);
  }
  for (const z of [bench.z - .50, bench.z + .49]) {
    box(bench.width, .072, .087, bench.x, .055, z, frame);
    box(.052, .36, .074, bench.x, .22, z, frame);
  }
  box(.37, .075, bench.depth, bench.x, .45, bench.z, rubber);
  box(.32, .021, bench.depth - .05, bench.x, .495, bench.z, rubber, scene, false);
  for (const y of [.35, .72]) {
    box(dumbbells.width, .047, dumbbells.depth, dumbbells.x, y, dumbbells.z, frame);
    for (let i = 0; i < 6; i++) {
      const x = dumbbells.x - .66 + i * .255;
      rod(.017, .18, x, y + .096, dumbbells.z - .03, steel);
      for (const end of [-1, 1]) rod(.058 + i * .004, .044, x + end * .083, y + .097, dumbbells.z - .03, rubber, scene, 'x', 6);
    }
  }
  for (const x of [dumbbells.x - .75, dumbbells.x + .75]) box(.052, .75, .063, x, .39, dumbbells.z + .04, frame);
  const mat = surface(0x47594d, .91, 0, { bumpMap: grain, bumpScale: .008 });
  box(matPlan.width, .018, matPlan.depth, matPlan.x, .02, matPlan.z, mat);
  for (let offset = .04; offset < matPlan.depth; offset += .038) {
    box(matPlan.width - .04, .002, .006, matPlan.x, .031, matPlan.z - matPlan.depth / 2 + offset, rubber, scene, false);
  }

  // Cable machine faces the entry; the weight stacks sit behind its handles.
  const cableRear = cable.z + cable.depth / 2 - .09;
  const cableFront = cable.z - cable.depth / 2 + .09;
  for (const side of [-1, 1]) {
    const x = cable.x + side * (cable.width / 2 - .11);
    box(.20, .078, cable.depth, x, .04, cable.z, frame);
    box(.14, 2.12, .14, x, 1.13, cableRear, frame);
    box(.21, .58, .22, x, .37, cableRear, dark);
    for (let y = .16; y < .61; y += .046) {
      box(.218, .033, .16, x, y, cableRear - .06, plate);
    }
    box(.036, 1.65, .038, x, 1.13, cableFront, steel);
    box(.10, .12, .10, x, 1.40, cableFront, lime);
    box(.022, 1.11, .022, x, 1.95, cableFront - .04, dark);
    rod(.013, .155, x, 1.32, cableFront - .055, steel);
    rod(.024, .11, x, 1.32, cableFront - .055, rubber);
    box(.14, .12, cable.depth - .04, x, 2.17, cable.z, frame);
  }
  box(cable.width, .14, .17, cable.x, 2.17, cableRear, frame);

  // Bike faces the entry. Circular flywheel, angled frame and console.
  const bikeFront = bike.z - bike.depth / 2 + .13;
  const bikeRear = bike.z + bike.depth / 2 - .14;
  function bikeTube(start, end, radius, material) {
    const a = new THREE.Vector3(bike.x, ...start);
    const b = new THREE.Vector3(bike.x, ...end);
    const midpoint = a.clone().lerp(b, .5);
    const tube = rod(radius, a.distanceTo(b), midpoint.x, midpoint.y, midpoint.z, material, scene, 'y', 20);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  }
  for (const z of [bikeFront, bikeRear]) box(bike.width, .065, .10, bike.x, .046, z, frame);
  rod(.245, .133, bike.x, .33, bikeFront + .06, plate);
  rod(.202, .142, bike.x, .33, bikeFront + .06, frame);
  rod(.045, .149, bike.x, .33, bikeFront + .06, lime);
  bikeTube([.13, bikeRear], [.36, bikeFront], .056, frame);
  bikeTube([.27, bike.z + .15], [.93, bike.z + .32], .041, frame);
  bikeTube([.33, bikeFront], [1.07, bikeFront + .05], .042, frame);
  box(.24, .072, .29, bike.x, .98, bike.z + .32, rubber);
  rod(.023, .61, bike.x, 1.10, bikeFront + .05, rubber);
  box(.19, .082, .13, bike.x, 1.17, bikeFront + .09, dark);
  box(.105, .009, .052, bike.x, 1.215, bikeFront + .09, guide, scene, false);
  rod(.026, .41, bike.x, .33, bike.z + .03, steel);
  for (const side of [-1, 1]) box(.12, .025, .105, bike.x + side * .245, .33 + side * .095, bike.z + .03, rubber);

  const title = tour.querySelector('h2');
  const caption = tour.querySelector('.tour-caption');
  const track = [...tour.querySelectorAll('.tour-track i')];
  const nav = document.querySelector('.nav');
  const states = [
    ['ЗАГЛЯНИ', 'ВНУТРЬ.', 'Вход в капсулу. Прокрути, чтобы открыть дверь.'],
    ['БЛОЧНЫЙ', 'ТРЕНАЖЁР.', 'Сразу справа от входа — регулируемые рукояти для тяги.'],
    ['СИЛОВАЯ', 'ЗОНА.', 'Дальше справа — стойка со штангой, скамья и гантели.'],
    ['КАРДИО И', 'РАЗМИНКА.', 'Слева от входа — велотренажёр и коврик.'],
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
    const approach = THREE.MathUtils.smoothstep(progress, .15, .48);
    const walk = THREE.MathUtils.smoothstep(progress, .56, .76);
    const cableFocus = THREE.MathUtils.smoothstep(progress, .38, .49)
      * (1 - THREE.MathUtils.smoothstep(progress, .56, .66));
    const pan = THREE.MathUtils.smoothstep(progress, .69, .92);
    const open = THREE.MathUtils.smoothstep(progress, .065, .41);
    for (const { door, side } of doors) door.position.x = zones.entry.x + side * (doorWidth / 2 + open * doorWidth);
    const narrow = mobile.matches;
    camera.position.set(
      THREE.MathUtils.lerp(narrow ? -1.5 : -2.9, .24, approach) - .26 * walk,
      THREE.MathUtils.lerp(1.71, 1.38, walk),
      THREE.MathUtils.lerp(narrow ? -9.6 : -7.9, .30, approach) + .72 * walk,
    );
    camera.lookAt(
      THREE.MathUtils.lerp(THREE.MathUtils.lerp(narrow ? .05 : 1.1, -.86, approach), cable.x, cableFocus) + pan * 2.35,
      THREE.MathUtils.lerp(1.36, 1.05, walk) - .24 * pan,
      THREE.MathUtils.lerp(THREE.MathUtils.lerp(.81, 4.35, approach), cable.z, cableFocus),
    );
    warmupLight.intensity = 12 + pan * 18;
    renderer.render(scene, camera);
    const state = !playing ? -1 : progress < .46 ? 0 : progress < .61 ? 1 : progress < .80 ? 2 : 3;
    if (state !== displayed) {
      displayed = state;
      const [first, second, copy] = state < 0
        ? ['ВНУТРИ', 'КАПСУЛЫ.', 'Блочный тренажёр и свободные веса справа, велотренажёр и коврик слева.']
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
    camera.fov = mobile.matches ? 69 : 43;
    camera.updateProjectionMatrix();
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
