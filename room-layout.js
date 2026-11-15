// Approximate positions from the presentation render. z starts at the entry; x runs leftward looking in.
const capsuleLayout = {
  width: 2.5,
  depth: 3.2,
  zones: {
    entry: { x: 0, z: .32, width: .84, depth: .64 },
    strength: { x: .65, z: 1.87, width: 1.14, depth: 2.48 },
    floor: { x: -.76, z: 1.64, width: .91, depth: 2.91 },
  },
  equipment: {
    rack: { x: .71, z: 1.38, width: .94, depth: .96 },
    bench: { x: .69, z: 1.26, width: .43, depth: 1.10 },
    dumbbells: { x: .39, z: 2.92, width: .98, depth: .33 },
    bike: { x: -.73, z: 2.48, width: .64, depth: 1.02 },
    mat: { x: -.78, z: 1.02, width: .64, depth: 1.37 },
  },
  descriptions: {
    strength: 'Слева от входа — силовая рама с TRX и наклонной скамьёй. Стойка с гантелями — у дальней стены.',
    floor: 'Справа от входа — коврик. Велотренажёр стоит дальше, у задней стены.',
    entry: 'Для входа введи код из бота на двери.',
    overview: 'Слева — рама и скамья, у дальней стены — гантели, справа — велотренажёр и коврик.',
  },
};
