export interface StandsConfig {

  geometry: {
    width: number;
    height: number;
    depth: number;
  };

  position: {
    x: number;
    y: number;
    zOffset: number;
  };

  angle: {
    degrees: number;
  };

  material: {
    color: number;
    roughness: number;
    metalness: number;
  };

  crowdTexture: {
    repeat: {
      x: number;
      y: number;
    };
  };
}

export const STANDS_CONFIG: StandsConfig = {
  geometry: {
    width: 72,           // keep wide horizontal coverage behind the goal
    height: 8,           // slightly taller to cover top-edge whitespace
    depth: 20            // small increase to keep smooth top coverage
  },
  position: {
    x: 0,
    y: 1.25,
    zOffset: -11.0        // move much farther back for clearly smaller audience
  },
  angle: {
    degrees: -12          // flatter tilt to avoid crowd dominating the frame
  },
  material: {
    color: 0xffffff,
    roughness: 1.,
    metalness: 0.
  },
  crowdTexture: {
    repeat: {
      x: 1,
      y: 1
    }
  }
};
