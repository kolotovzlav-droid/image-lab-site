// Illustrative dimensions in metres. z starts at the entry; x runs leftward looking in.
const capsuleLayout = {
  width: 2.5,
  depth: 3.2,
  zones: {
    entry: { x: 0, z: .36, width: .84, depth: .72 },
    strength: { x: -.67, z: 2.03, width: .99, depth: 1.99 },
    floor: { x: .62, z: 1.94, width: 1.02, depth: 1.92 },
  },
  equipment: {
    bench: { x: -.67, z: 1.83, width: .44, depth: 1.11 },
    dumbbells: { x: -.66, z: 2.88, width: .88, depth: .30 },
    mat: { x: .65, z: 1.95, width: .64, depth: 1.66 },
  },
};
