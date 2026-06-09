export type AdTextItem = {
  kind?: 'text';
  text: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
};

export type AdImageItem = {
  kind: 'image';
  imageUrl: string;
  backgroundColor?: string;
};

export type AdItem = AdTextItem | AdImageItem;

export interface AdBoardConfig {
  size: {
    width: number;
    height: number;
    depth: number;
  };
  position: {
    x: number;
    y: number;
    depthOffset: number;
  };
  material: {
    roughness: number;
    metalness: number;
    emissive: number;
    emissiveIntensity: number;
  };
  scrollSpeed: number;
  canvas: {
    width: number;
    height: number;
  };
  display: {
    repeatX: number;
    repeatY: number;
  };
  adSets: {
    default: readonly AdItem[];
    goal: readonly AdItem[];
    record: readonly AdItem[];
  };
}

export const AD_BOARD_CONFIG: AdBoardConfig = {
  size: {
    width: 50,
    height: 1.2,
    depth: 0.5
  },
  position: {
    x: 0,
    y: 0.5,
    depthOffset: -6
  },
  material: {
    roughness: 0.,
    metalness: 0.,
    emissive: 0xffffff,
    emissiveIntensity: 0.
  },
  scrollSpeed: 0.05,
  canvas: {
    width: 2048,
    height: 384
  },
  display: {
    repeatX: 2.5,
    repeatY: 1
  },
  adSets: {

    default: [
      {
        kind: 'image',
        imageUrl: '/assets/ads/ad-board-2x.jpg',
        backgroundColor: '#000000'
      },
      {
        kind: 'image',
        imageUrl: '/assets/ads/ad-board-1x.jpg',
        backgroundColor: '#000000'
      },
      {
        kind: 'image',
        imageUrl: '/assets/ads/kfc.png',
        backgroundColor: '#C8102E'
      },
      {
        kind: 'image',
        imageUrl: '/assets/ads/tiktok.png',
        backgroundColor: '#000000'
      },
      {
        kind: 'image',
        imageUrl: '/assets/ads/wonda.png',
        backgroundColor: '#5B3A29'
      },
      {
        kind: 'image',
        imageUrl: '/assets/ads/jayagrocer.png',
        backgroundColor: '#FFFFFF'
      }
    ] as const,
    // Goal celebration ad set
    goal: [
      {
        text: 'GOAL!!!',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        text: 'GOAL!!!',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
       {
        text: 'GOAL!!!',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        text: 'GOAL!!!',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
    ] as const,
	// High score celebration ad set
	record: [
      {
        text: 'HIGH!!!',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        text: 'SCORE!!!',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
       {
        text: 'HIGH!!!',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
      {
        text: 'SCORE!!!',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        fontSize: 120,
        fontWeight: 'bold',
        textAlign: 'center'
      },
    ] as const
  }
};

