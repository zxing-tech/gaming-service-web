/**

 *






 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { Ball } from '../entities/ball/Ball';
import type { Goal } from '../entities/goal/Goal';
import type { Obstacle } from '../entities/Obstacle';
import type { InputController } from '../input/InputController';

import { BALL_RADIUS } from '../config/Ball';
import { GOAL_DEPTH, GOAL_HEIGHT, GOAL_WIDTH, POST_RADIUS } from '../config/Goal';
import { GOAL_NET_CONFIG } from '../config/Net';
import { AD_BOARD_CONFIG } from '../config/AdBoard';
import { DEBUG_CONFIG } from '../config/Debug';
import { COLORS } from '../config/Colors';
import { SHOT_TARGET_CONFIG } from '../config/Shooting';

/** Must match `TARGET_BOUNDS.z` in `ShotParameters` (not the ground at z=0) or the trail skews from the real shot. */
const SWIPE_TRAIL_AIM_PLANE_Z = SHOT_TARGET_CONFIG.depth ?? GOAL_DEPTH;

/**

 */
export interface DebugVisualizerConfig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: CANNON.World;
  ball: Ball;
  goal: Goal;
  inputController: InputController;
  canvas: HTMLCanvasElement;
}

/**

 */
export class DebugVisualizer {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly canvas: HTMLCanvasElement;
  private readonly world: CANNON.World;
  private readonly ball: Ball;
  private readonly goal: Goal;
  private readonly inputController: InputController;


  private debugMode = false;


  private readonly ballColliderMesh: THREE.Mesh;
  private readonly goalColliderGroup: THREE.Group;
  private readonly adBoardColliderGroup: THREE.Group;


  private readonly trajectoryGeometry: LineGeometry;
  private readonly trajectoryMaterial: LineMaterial;
  private readonly trajectoryLine: Line2;
  private readonly trajectoryPositions: Float32Array;


  private readonly targetMarker: THREE.Mesh;


  private readonly swipeDebugGeometry: LineGeometry;
  private readonly swipeDebugMaterial: LineMaterial;
  private readonly swipeDebugLine: Line2;
  private readonly swipePointMarkers: THREE.Sprite[] = [];
  private readonly swipePointLabels: HTMLDivElement[] = [];


  private readonly axisArrows: THREE.ArrowHelper[];
  private readonly tempQuaternion = new THREE.Quaternion();
  private readonly tempAxisX = new THREE.Vector3();
  private readonly tempAxisY = new THREE.Vector3();
  private readonly tempAxisZ = new THREE.Vector3();

  private readonly ballTrailAnchor = new THREE.Vector3();

  constructor(config: DebugVisualizerConfig) {
    this.scene = config.scene;
    this.camera = config.camera;
    this.world = config.world;
    this.ball = config.ball;
    this.goal = config.goal;
    this.inputController = config.inputController;
    this.canvas = config.canvas;


    this.ballColliderMesh = this.createBallColliderMesh();
    this.goalColliderGroup = this.createGoalColliderGroup();
    this.adBoardColliderGroup = this.createAdBoardColliderGroup();
    this.axisArrows = this.createAxisArrows();


    this.trajectoryPositions = new Float32Array(DEBUG_CONFIG.trajectory.sampleCount * 3);
    this.trajectoryGeometry = new LineGeometry();
    this.trajectoryGeometry.setPositions(Array.from(this.trajectoryPositions));
    this.trajectoryMaterial = new LineMaterial({
      color: COLORS.debug.trajectory,
      linewidth: DEBUG_CONFIG.trajectory.lineWidth,
      transparent: true,
      opacity: DEBUG_CONFIG.trajectory.opacity,
      worldUnits: true
    });
    this.trajectoryMaterial.resolution.set(this.canvas.clientWidth, this.canvas.clientHeight);
    this.trajectoryMaterial.needsUpdate = true;
    this.trajectoryLine = new Line2(this.trajectoryGeometry, this.trajectoryMaterial);
    this.trajectoryLine.computeLineDistances();
    this.trajectoryLine.visible = false;
    this.scene.add(this.trajectoryLine);


    this.swipeDebugGeometry = new LineGeometry();
    this.swipeDebugMaterial = new LineMaterial({
      color: COLORS.game.swipeTrail,
      linewidth: DEBUG_CONFIG.swipeTrail.lineWidth,
      transparent: true,
      opacity: DEBUG_CONFIG.swipeTrail.opacity,
      worldUnits: true,
      depthTest: false,
      depthWrite: false
    });
    this.swipeDebugMaterial.resolution.set(this.canvas.clientWidth, this.canvas.clientHeight);
    this.swipeDebugLine = new Line2(this.swipeDebugGeometry, this.swipeDebugMaterial);
    this.swipeDebugLine.visible = false;
    this.swipeDebugLine.renderOrder = DEBUG_CONFIG.renderOrder.swipeDebugLine;
    this.scene.add(this.swipeDebugLine);


    this.createSwipePointMarkers(5);


    this.targetMarker = this.createTargetMarker();


    this.applyDebugVisibility([]);
  }

  /**

   */
  private createBallColliderMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: COLORS.collider.ball,
      transparent: true,
      opacity: DEBUG_CONFIG.ballCollider.opacity,
      depthTest: false,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: COLORS.collider.ballEdge });
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), edgeMaterial);
    mesh.add(wireframe);
    mesh.visible = false;
    this.scene.add(mesh);
    return mesh;
  }

  /**

   */
  private createGoalColliderGroup(): THREE.Group {
    const group = new THREE.Group();
    group.visible = false;

    const colliderMaterial = new THREE.MeshBasicMaterial({ color: COLORS.collider.goal });
    colliderMaterial.transparent = true;
    colliderMaterial.opacity = DEBUG_CONFIG.goalCollider.opacity;
    colliderMaterial.depthTest = false;
    colliderMaterial.depthWrite = false;
    const colliderEdgeMaterial = new THREE.LineBasicMaterial({ color: COLORS.collider.goalEdge });

    const addBoxCollider = (geometry: THREE.BoxGeometry, position: THREE.Vector3) => {
      const mesh = new THREE.Mesh(geometry, colliderMaterial);
      mesh.position.copy(position);
      group.add(mesh);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), colliderEdgeMaterial);
      edges.position.copy(position);
      group.add(edges);
    };

    const postGeometry = new THREE.BoxGeometry(POST_RADIUS * 2, GOAL_HEIGHT, POST_RADIUS * 2);
    addBoxCollider(postGeometry, new THREE.Vector3(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_DEPTH));
    addBoxCollider(postGeometry, new THREE.Vector3(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, GOAL_DEPTH));

    const rearSupportX = GOAL_WIDTH / 2;
    const rearSupportZ = GOAL_DEPTH - GOAL_NET_CONFIG.layout.depthBottom;
    addBoxCollider(postGeometry, new THREE.Vector3(-rearSupportX, GOAL_HEIGHT / 2, rearSupportZ));
    addBoxCollider(postGeometry, new THREE.Vector3(rearSupportX, GOAL_HEIGHT / 2, rearSupportZ));

    const floorThickness = POST_RADIUS * 2;
    const depthSpan = GOAL_NET_CONFIG.layout.depthBottom;
    const sideFloorGeometry = new THREE.BoxGeometry(POST_RADIUS * 2, floorThickness, depthSpan);
    addBoxCollider(sideFloorGeometry, new THREE.Vector3(-rearSupportX, POST_RADIUS, GOAL_DEPTH - depthSpan / 2));
    addBoxCollider(sideFloorGeometry, new THREE.Vector3(rearSupportX, POST_RADIUS, GOAL_DEPTH - depthSpan / 2));

    const backFloorGeometry = new THREE.BoxGeometry(rearSupportX * 2, floorThickness, POST_RADIUS * 2);
    addBoxCollider(backFloorGeometry, new THREE.Vector3(0, POST_RADIUS, rearSupportZ));

    addBoxCollider(sideFloorGeometry, new THREE.Vector3(-rearSupportX, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH - depthSpan / 2));
    addBoxCollider(sideFloorGeometry, new THREE.Vector3(rearSupportX, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH - depthSpan / 2));

    const crossbarGeometry = new THREE.BoxGeometry(GOAL_WIDTH, POST_RADIUS * 2, POST_RADIUS * 2);
    addBoxCollider(crossbarGeometry, new THREE.Vector3(0, GOAL_HEIGHT - POST_RADIUS, GOAL_DEPTH));

    const sensorWidth = Math.max(GOAL_WIDTH - POST_RADIUS * 2, 0.1);
    const sensorHeight = Math.max(GOAL_HEIGHT - POST_RADIUS * 1.8, 0.1);
    const sensorDepth = BALL_RADIUS * 0.6;
    const sensorGeometry = new THREE.BoxGeometry(sensorWidth, sensorHeight, sensorDepth);
    const sensorMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.collider.sensorFace,
      transparent: true,
      opacity: DEBUG_CONFIG.sensorFace.opacity,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });
    const sensorFace = new THREE.Mesh(sensorGeometry, sensorMaterial);
    const sensorZ = GOAL_DEPTH - (BALL_RADIUS + sensorDepth * 0.5);
    sensorFace.position.set(0, sensorHeight / 2, sensorZ);
    group.add(sensorFace);

    const sensorEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(sensorGeometry),
      new THREE.LineBasicMaterial({ color: COLORS.collider.sensorEdge })
    );
    sensorEdges.position.copy(sensorFace.position);
    group.add(sensorEdges);

    const netInfos = this.goal.getNetColliderInfos();
    const netFaceMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.collider.net,
      transparent: true,
      opacity: DEBUG_CONFIG.netCollider.opacity,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });
    const netEdgeMaterial = new THREE.LineBasicMaterial({ color: COLORS.collider.netEdge });

    netInfos.forEach(({ size, position }) => {
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const faceMesh = new THREE.Mesh(geometry, netFaceMaterial);
      faceMesh.position.copy(position);
      group.add(faceMesh);

      const edgeMesh = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), netEdgeMaterial);
      edgeMesh.position.copy(position);
      group.add(edgeMesh);
    });

    this.scene.add(group);
    return group;
  }

  /**

   */
  private createAdBoardColliderGroup(): THREE.Group {
    const group = new THREE.Group();
    group.visible = false;

    const outlineMaterial = new THREE.LineBasicMaterial({ color: COLORS.collider.adBoardEdge });
    const faceMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.collider.adBoard,
      transparent: true,
      opacity: DEBUG_CONFIG.adBoardCollider.opacity,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });

    const size = AD_BOARD_CONFIG.size;
    const adGeometry = new THREE.BoxGeometry(size.width, size.height, size.depth);

    const face = new THREE.Mesh(adGeometry, faceMaterial);
    const adDepth = GOAL_DEPTH + AD_BOARD_CONFIG.position.depthOffset;
    face.position.set(
      AD_BOARD_CONFIG.position.x,
      AD_BOARD_CONFIG.position.y,
      adDepth
    );
    group.add(face);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(adGeometry),
      outlineMaterial
    );
    edges.position.copy(face.position);
    group.add(edges);

    this.scene.add(group);
    return group;
  }

  /**

   */
  private createAxisArrows(): THREE.ArrowHelper[] {
    const origin = new THREE.Vector3(0, 0, 0);
    const length = DEBUG_CONFIG.axisArrows.length;
    const headLength = DEBUG_CONFIG.axisArrows.headLength;
    const headWidth = DEBUG_CONFIG.axisArrows.headWidth;

    const createArrow = (direction: THREE.Vector3, color: number) => {
      const arrow = new THREE.ArrowHelper(direction.clone(), origin, length, color, headLength, headWidth);
      arrow.visible = this.debugMode;
      this.scene.add(arrow);
      return arrow;
    };

    const arrows = [
      createArrow(new THREE.Vector3(1, 0, 0), COLORS.axisArrows.x),
      createArrow(new THREE.Vector3(0, 1, 0), COLORS.axisArrows.y),
      createArrow(new THREE.Vector3(0, 0, 1), COLORS.axisArrows.z)
    ];
    return arrows;
  }

  /**

   */
  private createTargetMarker(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(
      DEBUG_CONFIG.targetMarker.radius,
      DEBUG_CONFIG.targetMarker.segments,
      DEBUG_CONFIG.targetMarker.segments
    );
    const material = new THREE.MeshBasicMaterial({
      color: COLORS.debug.targetMarker,
      transparent: true,
      opacity: DEBUG_CONFIG.targetMarker.opacity,
      depthTest: false,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    this.scene.add(mesh);
    return mesh;
  }

  /**

   */
  private createSwipePointMarkers(count: number): void {
    for (let i = 0; i < count; i++) {

      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;


      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.fill();


      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.stroke();

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(DEBUG_CONFIG.swipePointMarker.scale, DEBUG_CONFIG.swipePointMarker.scale, 1);
      sprite.visible = false;
      sprite.renderOrder = DEBUG_CONFIG.swipePointMarker.renderOrder;
      this.scene.add(sprite);
      this.swipePointMarkers.push(sprite);


      const label = document.createElement('div');
      label.textContent = (i + 1).toString();
      label.style.position = 'fixed';
      label.style.color = DEBUG_CONFIG.swipePointMarker.labelColor;
      label.style.fontSize = DEBUG_CONFIG.swipePointMarker.labelFontSize;
      label.style.fontWeight = 'bold';
      label.style.fontFamily = 'Arial, sans-serif';
      label.style.textShadow = '0 0 3px #ffff00, 0 0 6px #ffff00';
      label.style.pointerEvents = 'none';
      label.style.display = 'none';
      label.style.zIndex = '5';
      label.style.transform = 'translate(-50%, -50%)';
      document.body.appendChild(label);
      this.swipePointLabels.push(label);
    }
  }

  /**

   */
  public toggleDebugMode(enabled?: boolean): boolean {
    const next = enabled ?? !this.debugMode;
    if (this.debugMode === next) {
      return this.debugMode;
    }

    this.debugMode = next;
    return this.debugMode;
  }

  /**

   */
  public applyDebugVisibility(obstacles: Obstacle[]): void {
    const visible = this.debugMode;
    obstacles.forEach((obstacle) => obstacle.setColliderDebugVisible(visible));
    this.ballColliderMesh.visible = visible;
    this.goalColliderGroup.visible = visible;
    this.adBoardColliderGroup.visible = visible;
    this.trajectoryLine.visible = visible;
    this.targetMarker.visible = visible && this.targetMarker.visible;
    const hasSwipe = this.inputController.getLastSwipe() !== null;
    // Swipe ribbon is player-facing; visibility is driven by `updateSwipeDebugLine`, not debug mode.
    this.swipePointMarkers.forEach((marker) => {
      marker.visible = visible && hasSwipe;
    });
    this.swipePointLabels.forEach((label) => {
      label.style.display = visible && hasSwipe ? 'block' : 'none';
    });
    this.axisArrows.forEach((arrow) => {
      arrow.visible = visible;
    });
  }

  /**

   */
  public updateColliderVisuals(): void {
    if (!this.debugMode) {
      return;
    }
    this.ballColliderMesh.position.set(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.ball.body.position.z
    );
    this.updateTrajectoryLine();
    this.updateAxisArrows();
  }

  /**

   */
  private updateTrajectoryLine(): void {
    const positions = this.trajectoryPositions;
    const basePosition = this.ball.body.position;
    const velocity = this.ball.body.velocity;
    const gravity = this.world.gravity;
    const sampleStep = DEBUG_CONFIG.trajectory.sampleStep;
    const sampleCount = DEBUG_CONFIG.trajectory.sampleCount;

    for (let i = 0; i < sampleCount; i++) {
      const t = i * sampleStep;
      const idx = i * 3;
      const x = basePosition.x + velocity.x * t + 0.5 * gravity.x * t * t;
      const y = basePosition.y + velocity.y * t + 0.5 * gravity.y * t * t;
      const z = basePosition.z + velocity.z * t + 0.5 * gravity.z * t * t;
      positions[idx] = x;
      positions[idx + 1] = Math.max(y, BALL_RADIUS);
      positions[idx + 2] = z;
    }

    this.trajectoryGeometry.setPositions(Array.from(this.trajectoryPositions));
    this.trajectoryLine.computeLineDistances();
    this.trajectoryGeometry.computeBoundingSphere();
  }

  /**

   */
  private updateAxisArrows(): void {
    const { position, quaternion } = this.ball.body;
    this.axisArrows.forEach((arrow) => {
      arrow.position.set(position.x, position.y, position.z);
    });

    this.tempQuaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

    this.tempAxisX.set(1, 0, 0).applyQuaternion(this.tempQuaternion);
    this.tempAxisY.set(0, 1, 0).applyQuaternion(this.tempQuaternion);
    this.tempAxisZ.set(0, 0, 1).applyQuaternion(this.tempQuaternion);

    this.axisArrows[0].setDirection(this.tempAxisX.normalize());
    this.axisArrows[1].setDirection(this.tempAxisY.normalize());
    this.axisArrows[2].setDirection(this.tempAxisZ.normalize());
  }

  /**

   */
  public updateSwipeDebugLine(): void {
    const worldPositions = this.inputController.getSwipeVisualizationWorldPositions(
      this.camera,
      SWIPE_TRAIL_AIM_PLANE_Z
    );

    if (!worldPositions || worldPositions.length < 2) {
      this.swipeDebugLine.visible = false;
      this.swipePointMarkers.forEach((marker) => {
        marker.visible = false;
      });
      this.swipePointLabels.forEach((label) => {
        label.style.display = 'none';
      });
      return;
    }

    this.ballTrailAnchor.set(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.ball.body.position.z
    );

    const controlPoints: THREE.Vector3[] = [this.ballTrailAnchor];
    for (let i = 1; i < worldPositions.length; i++) {
      controlPoints.push(worldPositions[i]);
    }

    const cfg = DEBUG_CONFIG.swipeTrail;
    const speedPxPerMs = this.inputController.getSwipeSpeedPxPerMs();
    const useRawPolyline =
      speedPxPerMs >= cfg.fastSwipePxPerMs ||
      controlPoints.length >= cfg.rawPolylineMinControlPoints;

    let ribbonPoints: THREE.Vector3[];
    if (useRawPolyline) {
      ribbonPoints = controlPoints;
    } else {
      const curve = new THREE.CatmullRomCurve3(controlPoints);
      const divisions = Math.min(
        cfg.catmullMaxDivisions,
        Math.max(cfg.catmullMinDivisions, controlPoints.length * 12)
      );
      ribbonPoints = curve.getPoints(divisions);
    }

    const positions: number[] = [];
    for (const pos of ribbonPoints) {
      positions.push(pos.x, pos.y, pos.z);
    }

    this.swipeDebugGeometry.setPositions(positions);
    this.swipeDebugLine.computeLineDistances();
    this.swipeDebugGeometry.computeBoundingSphere();
    this.swipeDebugLine.visible = true;

    if (!this.debugMode) {
      this.swipePointMarkers.forEach((marker) => {
        marker.visible = false;
      });
      this.swipePointLabels.forEach((label) => {
        label.style.display = 'none';
      });
      return;
    }

    const tempVector = new THREE.Vector3();
    worldPositions.forEach((pos, i) => {
      if (i < this.swipePointMarkers.length) {
        this.swipePointMarkers[i].position.copy(pos);
        this.swipePointMarkers[i].visible = true;

        tempVector.copy(pos);
        tempVector.project(this.camera);

        const x = (tempVector.x * 0.5 + 0.5) * this.canvas.clientWidth;
        const y = (tempVector.y * -0.5 + 0.5) * this.canvas.clientHeight;

        this.swipePointLabels[i].style.left = `${x}px`;
        this.swipePointLabels[i].style.top = `${y}px`;
        this.swipePointLabels[i].style.display = 'block';
      }
    });

    for (let i = worldPositions.length; i < this.swipePointMarkers.length; i++) {
      this.swipePointMarkers[i].visible = false;
      this.swipePointLabels[i].style.display = 'none';
    }
  }

  /**

   */
  public setTargetMarkerPosition(position: THREE.Vector3): void {
    this.targetMarker.position.copy(position);
    this.targetMarker.visible = this.debugMode;
  }

  /**

   */
  public hideTargetMarker(): void {
    this.targetMarker.visible = false;
  }

  /**

   */
  public handleResize(width: number, height: number): void {
    this.trajectoryMaterial.resolution.set(width, height);
    this.swipeDebugMaterial.resolution.set(width, height);
  }

  /**

   */
  public isDebugMode(): boolean {
    return this.debugMode;
  }

  /**

   */
  public dispose(): void {

    this.scene.remove(this.ballColliderMesh);
    this.scene.remove(this.goalColliderGroup);
    this.scene.remove(this.adBoardColliderGroup);
    this.scene.remove(this.trajectoryLine);
    this.scene.remove(this.swipeDebugLine);
    this.scene.remove(this.targetMarker);
    this.axisArrows.forEach((arrow) => this.scene.remove(arrow));
    this.swipePointMarkers.forEach((marker) => this.scene.remove(marker));


    this.swipePointLabels.forEach((label) => label.remove());


    this.ballColliderMesh.geometry.dispose();
    (this.ballColliderMesh.material as THREE.Material).dispose();
    this.goalColliderGroup.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.adBoardColliderGroup.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.trajectoryGeometry.dispose();
    this.trajectoryMaterial.dispose();
    this.swipeDebugGeometry.dispose();
    this.swipeDebugMaterial.dispose();
    this.targetMarker.geometry.dispose();
    (this.targetMarker.material as THREE.Material).dispose();
    this.swipePointMarkers.forEach((sprite) => {
      sprite.geometry.dispose();
      sprite.material.dispose();
    });
  }
}
