import * as THREE from 'three';
import { RENDERING_CONFIG } from '../config/Rendering';

export interface SceneLighting {
  ambient: THREE.AmbientLight;
  hemisphere: THREE.HemisphereLight;
  directional: THREE.DirectionalLight;
  point: THREE.PointLight;
}

export function configureSceneLighting(scene: THREE.Scene): SceneLighting {
  const { lighting } = RENDERING_CONFIG;

  const ambient = new THREE.AmbientLight(0xffffff, lighting.ambient);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(
    lighting.hemisphereSky,
    lighting.hemisphereGround,
    lighting.hemisphere,
  );
  scene.add(hemisphere);

  const directional = new THREE.DirectionalLight(0xffffff, lighting.directional);
  directional.position.set(5, 20, 5);
  directional.castShadow = true;
  directional.shadow.mapSize.width = 2048;
  directional.shadow.mapSize.height = 2048;
  directional.shadow.camera.left = -35;
  directional.shadow.camera.right = 35;
  directional.shadow.camera.top = 35;
  directional.shadow.camera.bottom = -35;
  directional.shadow.radius = 9;
  directional.shadow.bias = -0.0002;
  directional.shadow.normalBias = 0.03;
  scene.add(directional);

  const point = new THREE.PointLight(0xffffff, lighting.point, 20);
  point.position.set(-6, 12, 18);
  point.castShadow = true;
  point.shadow.mapSize.width = 1024;
  point.shadow.mapSize.height = 1024;
  point.shadow.bias = -0.0003;
  scene.add(point);

  const rim = new THREE.PointLight(lighting.rimColor, lighting.rim, lighting.rimDistance);
  rim.position.set(-12, 15, -5);
  scene.add(rim);


  const goalFrontLight = new THREE.DirectionalLight(0xffffff, lighting.goalFront);
  goalFrontLight.position.set(0, 3, 10);
  goalFrontLight.target.position.set(0, 1, -6);
  scene.add(goalFrontLight);
  scene.add(goalFrontLight.target);

  return { ambient, hemisphere, directional, point };
}
