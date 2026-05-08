import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BALL_RADIUS } from '../../config/Ball';
import { getGoalConfigForViewport } from '../../config/Goal';
import { GOAL_NET_CONFIG } from '../../config/Net';
import { GoalNet } from './GoalNet';
import { GoalNetAnimator } from './GoalNetAnimator';

/**

 */
function createStaticBody(
  world: CANNON.World,
  shape: CANNON.Shape,
  position: CANNON.Vec3,
  material?: CANNON.Material
): CANNON.Body {
  const body = new CANNON.Body({
    mass: 0,
    shape,
    position,
    material
  });
  world.addBody(body);
  return body;
}

export interface GoalBodies {
  leftPost: CANNON.Body;
  rightPost: CANNON.Body;
  rearLeftPost: CANNON.Body;
  rearRightPost: CANNON.Body;
  topLeftBar: CANNON.Body;
  topRightBar: CANNON.Body;
  floorLeft: CANNON.Body;
  floorRight: CANNON.Body;
  floorBack: CANNON.Body;
  crossbar: CANNON.Body;
  sensor: CANNON.Body;
  netPanels: readonly CANNON.Body[];
}

export class Goal {
  public readonly bodies: GoalBodies;
  public readonly net: GoalNet;
  public readonly netAnimator: GoalNetAnimator;
  private netAnimationEnabled = false;
  private readonly netColliders: CANNON.Body[] = [];
  private readonly netColliderInfos: Array<{ size: THREE.Vector3; position: THREE.Vector3 }> = [];
  private readonly netImpactPoint = new THREE.Vector3();
  private readonly goalWidth: number;
  private readonly goalHeight: number;
  private readonly goalDepth: number;
  private readonly postRadius: number;

  constructor(scene: THREE.Scene, world: CANNON.World, ballMaterial: CANNON.Material) {
    const goalConfig = getGoalConfigForViewport();
    this.goalWidth = goalConfig.width;
    this.goalHeight = goalConfig.height;
    this.goalDepth = goalConfig.depth;
    this.postRadius = goalConfig.postRadius;

    const postMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.8
    });

    const postWidth = this.postRadius * 2;
    const postGeometry = new THREE.BoxGeometry(postWidth, this.goalHeight, postWidth);
    const rearPostXOffset = this.goalWidth / 2;
    const rearPostZ = this.goalDepth - GOAL_NET_CONFIG.layout.depthBottom;
    const depthSpan = GOAL_NET_CONFIG.layout.depthBottom;
    const floorHeight = postWidth / 2;
    const leftPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    leftPostMesh.position.set(-this.goalWidth / 2, this.goalHeight / 2, this.goalDepth);
    leftPostMesh.castShadow = true;
    scene.add(leftPostMesh);

    const rightPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    rightPostMesh.position.set(this.goalWidth / 2, this.goalHeight / 2, this.goalDepth);
    rightPostMesh.castShadow = true;
    scene.add(rightPostMesh);

    const rearLeftPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    rearLeftPostMesh.position.set(-rearPostXOffset, this.goalHeight / 2, rearPostZ);
    rearLeftPostMesh.castShadow = true;
    scene.add(rearLeftPostMesh);

    const rearRightPostMesh = new THREE.Mesh(postGeometry, postMaterial);
    rearRightPostMesh.position.set(rearPostXOffset, this.goalHeight / 2, rearPostZ);
    rearRightPostMesh.castShadow = true;
    scene.add(rearRightPostMesh);

    const sideBarGeometry = new THREE.BoxGeometry(postWidth, postWidth, depthSpan);
    const leftFloorBarMesh = new THREE.Mesh(sideBarGeometry, postMaterial);
    leftFloorBarMesh.position.set(-rearPostXOffset, floorHeight, this.goalDepth - depthSpan / 2);
    leftFloorBarMesh.castShadow = true;
    scene.add(leftFloorBarMesh);

    const rightFloorBarMesh = new THREE.Mesh(sideBarGeometry, postMaterial);
    rightFloorBarMesh.position.set(rearPostXOffset, floorHeight, this.goalDepth - depthSpan / 2);
    rightFloorBarMesh.castShadow = true;
    scene.add(rightFloorBarMesh);

    const backBarWidth = rearPostXOffset * 2;
    const backBarGeometry = new THREE.BoxGeometry(backBarWidth, postWidth, postWidth);
    const backFloorBarMesh = new THREE.Mesh(backBarGeometry, postMaterial);
    backFloorBarMesh.position.set(0, floorHeight, rearPostZ);
    backFloorBarMesh.castShadow = true;
    scene.add(backFloorBarMesh);

    const topBarGeometry = new THREE.BoxGeometry(postWidth, postWidth, depthSpan);
    const leftTopBarMesh = new THREE.Mesh(topBarGeometry, postMaterial);
    leftTopBarMesh.position.set(-rearPostXOffset, this.goalHeight - this.postRadius, this.goalDepth - depthSpan / 2);
    leftTopBarMesh.castShadow = true;
    scene.add(leftTopBarMesh);

    const rightTopBarMesh = new THREE.Mesh(topBarGeometry, postMaterial);
    rightTopBarMesh.position.set(rearPostXOffset, this.goalHeight - this.postRadius, this.goalDepth - depthSpan / 2);
    rightTopBarMesh.castShadow = true;
    scene.add(rightTopBarMesh);

    const crossbarGeometry = new THREE.BoxGeometry(this.goalWidth, postWidth, postWidth);
    const crossbarMesh = new THREE.Mesh(crossbarGeometry, postMaterial);
    crossbarMesh.position.set(0, this.goalHeight - this.postRadius, this.goalDepth);
    crossbarMesh.castShadow = true;
    scene.add(crossbarMesh);

    const postShape = new CANNON.Box(new CANNON.Vec3(this.postRadius, this.goalHeight / 2, this.postRadius));

    const leftPostBody = createStaticBody(
      world,
      postShape,
      new CANNON.Vec3(-this.goalWidth / 2, this.goalHeight / 2, this.goalDepth)
    );

    const rightPostBody = createStaticBody(
      world,
      postShape,
      new CANNON.Vec3(this.goalWidth / 2, this.goalHeight / 2, this.goalDepth)
    );

    const floorBarShape = new CANNON.Box(new CANNON.Vec3(postWidth / 2, postWidth / 2, depthSpan / 2));

    const floorLeftBody = createStaticBody(
      world,
      floorBarShape,
      new CANNON.Vec3(-rearPostXOffset, floorHeight, this.goalDepth - depthSpan / 2)
    );

    const floorRightBody = createStaticBody(
      world,
      floorBarShape,
      new CANNON.Vec3(rearPostXOffset, floorHeight, this.goalDepth - depthSpan / 2)
    );

    const backBarShape = new CANNON.Box(new CANNON.Vec3(backBarWidth / 2, postWidth / 2, postWidth / 2));

    const floorBackBody = createStaticBody(
      world,
      backBarShape,
      new CANNON.Vec3(0, floorHeight, rearPostZ)
    );

    const topBarShape = new CANNON.Box(new CANNON.Vec3(postWidth / 2, postWidth / 2, depthSpan / 2));

    const topLeftBody = createStaticBody(
      world,
      topBarShape,
      new CANNON.Vec3(-rearPostXOffset, this.goalHeight - this.postRadius, this.goalDepth - depthSpan / 2)
    );

    const topRightBody = createStaticBody(
      world,
      topBarShape,
      new CANNON.Vec3(rearPostXOffset, this.goalHeight - this.postRadius, this.goalDepth - depthSpan / 2)
    );

    const rearLeftPostBody = createStaticBody(
      world,
      postShape,
      new CANNON.Vec3(-rearPostXOffset, this.goalHeight / 2, rearPostZ)
    );

    const rearRightPostBody = createStaticBody(
      world,
      postShape,
      new CANNON.Vec3(rearPostXOffset, this.goalHeight / 2, rearPostZ)
    );

    const crossbarBody = createStaticBody(
      world,
      new CANNON.Box(new CANNON.Vec3(this.goalWidth / 2, this.postRadius, this.postRadius)),
      new CANNON.Vec3(0, this.goalHeight - this.postRadius, this.goalDepth)
    );

    const sensorWidth = Math.max(this.goalWidth - this.postRadius * 2, 0.1);
    const sensorHeight = Math.max(this.goalHeight - this.postRadius * 1.8, 0.1);
    const sensorDepth = BALL_RADIUS * 0.6;
    const sensorOffset = -(sensorDepth * 0.5 + BALL_RADIUS);
    const sensorBody = createStaticBody(
      world,
      new CANNON.Box(new CANNON.Vec3(sensorWidth / 2, sensorHeight / 2, sensorDepth / 2)),
      new CANNON.Vec3(0, sensorHeight / 2, this.goalDepth + sensorOffset)
    );
    sensorBody.collisionResponse = false;

    this.bodies = {
      leftPost: leftPostBody,
      rightPost: rightPostBody,
      rearLeftPost: rearLeftPostBody,
      rearRightPost: rearRightPostBody,
      topLeftBar: topLeftBody,
      topRightBar: topRightBody,
      floorLeft: floorLeftBody,
      floorRight: floorRightBody,
      floorBack: floorBackBody,
      crossbar: crossbarBody,
      sensor: sensorBody,
      netPanels: this.netColliders
    };
    this.net = new GoalNet(scene, this.goalWidth, this.goalHeight, this.goalDepth, this.postRadius);
    this.netAnimator = new GoalNetAnimator(this.net);
    this.createNetColliders(world, ballMaterial);
  }

  update(deltaTime: number): void {
    if (this.netAnimationEnabled) {
      this.netAnimator.update(deltaTime);
    }
  }

  resetNet(): void {
    this.netAnimator.reset();
  }

  setNetAnimationEnabled(enabled: boolean): void {
    this.netAnimationEnabled = enabled;
    this.netAnimator.setIdleEnabled(enabled);
    if (!enabled) {
      this.netAnimator.reset();
    }
  }

  triggerNetPulse(worldPoint: THREE.Vector3, strength: number): void {
    this.netAnimator.triggerPulse(worldPoint, strength);
  }

  isNetCollider(body: CANNON.Body): boolean {
    return this.netColliders.includes(body);
  }

  handleNetCollision(ballBody: CANNON.Body): void {
    const speedSq = ballBody.velocity.lengthSquared();
    if (speedSq > 0) {
      ballBody.velocity.scale(0.3, ballBody.velocity);
    }
    if (ballBody.angularVelocity.lengthSquared() > 0) {
      ballBody.angularVelocity.scale(0.45, ballBody.angularVelocity);
    }

    this.netImpactPoint.set(ballBody.position.x, ballBody.position.y, ballBody.position.z);
    const strength = THREE.MathUtils.clamp(Math.sqrt(speedSq) / 10, 0.25, 1.4);
    this.netAnimator.triggerPulse(this.netImpactPoint, strength);
  }

  getNetColliderInfos(): ReadonlyArray<{ size: THREE.Vector3; position: THREE.Vector3 }> {
    return this.netColliderInfos;
  }

  private createNetColliders(world: CANNON.World, ballMaterial: CANNON.Material): void {
    const bounds = this.net.restBounds;
    const netMaterial = new CANNON.Material('goalNet');
    const contact = new CANNON.ContactMaterial(ballMaterial, netMaterial, {
      restitution: 0.05,
      friction: 0.6
    });
    world.addContactMaterial(contact);

    const postWidth = this.postRadius * 2;
    const frameThickness = Math.max(postWidth * 0.75, 0.02);
    const halfFrameThickness = frameThickness / 2;

    const netHeight = Math.max(bounds.maxY - bounds.minY, 0.1);
    const netCenterY = (bounds.maxY + bounds.minY) / 2;
    const depthSpan = GOAL_NET_CONFIG.layout.depthBottom;
    const rearPostZ = this.goalDepth - depthSpan;
    const midZ = this.goalDepth - depthSpan / 2;
    const interiorHalfWidth = Math.max(this.goalWidth / 2 - halfFrameThickness, halfFrameThickness);

    const backHalfExtents = new CANNON.Vec3(interiorHalfWidth, netHeight / 2, halfFrameThickness);
    const backCenter = new CANNON.Vec3(0, netCenterY, rearPostZ);
    this.addNetCollider(world, netMaterial, backHalfExtents, backCenter);

    const sideHalfExtents = new CANNON.Vec3(halfFrameThickness, netHeight / 2, depthSpan / 2);
    const leftCenter = new CANNON.Vec3(-this.goalWidth / 2 + halfFrameThickness, netCenterY, midZ);
    const rightCenter = new CANNON.Vec3(this.goalWidth / 2 - halfFrameThickness, netCenterY, midZ);
    this.addNetCollider(world, netMaterial, sideHalfExtents, leftCenter);
    this.addNetCollider(world, netMaterial, sideHalfExtents, rightCenter);

    const topHalfExtents = new CANNON.Vec3(interiorHalfWidth, halfFrameThickness, depthSpan / 2);
    const topCenter = new CANNON.Vec3(0, this.goalHeight - this.postRadius - halfFrameThickness, midZ);
    this.addNetCollider(world, netMaterial, topHalfExtents, topCenter);
  }

  private addNetCollider(
    world: CANNON.World,
    material: CANNON.Material,
    halfExtents: CANNON.Vec3,
    center: CANNON.Vec3
  ): void {
    const body = createStaticBody(
      world,
      new CANNON.Box(halfExtents),
      new CANNON.Vec3(center.x, center.y, center.z),
      material
    );
    this.netColliders.push(body);
    this.netColliderInfos.push({
      size: new THREE.Vector3(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2),
      position: new THREE.Vector3(center.x, center.y, center.z)
    });
  }
}
