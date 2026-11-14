// Dimensions in metres. z starts at the entrance, x runs leftward when looking inside.
const capsuleLayout = {
  width: 4.67,
  depth: 5.38,
  zones: {
    entry: { x: 0, z: .55, width: 2.08, depth: 1.10 },
    strength: { x: -1.19, z: 3.25, width: 2.04, depth: 4.09 },
    floor: { x: 1.15, z: 3.29, width: 1.93, depth: 3.71 },
  },
  equipment: {
    rack: { x: -1.29, z: 3.71, width: 1.38, depth: .94 },
    bench: { x: -1.30, z: 2.68, width: .49, depth: 1.19 },
    dumbbells: { x: -1.24, z: 4.86, width: 1.61, depth: .31 },
    mat: { x: 1.05, z: 2.45, width: .69, depth: 1.68 },
    cable: { x: -1.46, z: 1.42, width: 1.30, depth: .70 },
    bike: { x: 1.37, z: 4.34, width: .69, depth: 1.27 },
  },
};
