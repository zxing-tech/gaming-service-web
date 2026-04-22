import * as THREE from 'three';
import { STANDS_CONFIG } from '../config/Stands';
import { getAssetPath } from '../utils/assetPath';

const crowdTextureUrl = getAssetPath('/assets/crowd/Gemini_Generated_Image_a8cqxoa8cqxoa8cq.png');

export class Stands {
  private readonly mesh: THREE.Mesh;

  constructor(
    scene: THREE.Scene,
    adBoardDepth: number
  ) {
    const config = STANDS_CONFIG;


    const slopedLength = Math.hypot(config.geometry.height, config.geometry.depth);


    const geometry = new THREE.PlaneGeometry(config.geometry.width, slopedLength);


    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(crowdTextureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;


    texture.repeat.set(
      config.crowdTexture.repeat.x,
      config.crowdTexture.repeat.y
    );


    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: config.material.roughness,
      metalness: config.material.metalness,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;



    const angleRadians = (config.angle.degrees * Math.PI) / 180;


    const halfDepth = config.geometry.depth / 2;
    const halfHeight = config.geometry.height / 2;


    const centerZ = adBoardDepth + config.position.zOffset - halfDepth;


    const centerY = config.position.y + halfHeight;

    this.mesh.position.set(config.position.x, centerY, centerZ);


    this.mesh.rotation.x = angleRadians;

    scene.add(this.mesh);

    console.log(`🏟️ Stands created (angle: ${config.angle.degrees}°, using PlaneGeometry)`);
  }


  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(mat => mat.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
