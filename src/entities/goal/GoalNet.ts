import * as THREE from 'three';
import { GOAL_NET_CONFIG } from '../../config/Net';

export type GoalNetEdgeType = 'structural' | 'shear' | 'bend';

export interface GoalNetNode {
  readonly index: number;
  readonly restPosition: THREE.Vector3;
  position: THREE.Vector3;
  fixed: boolean;
}

export interface GoalNetEdge {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly restLength: number;
  readonly type: GoalNetEdgeType;
}

interface NodeOptions {
  fixed?: boolean;
}

export class GoalNet {
  public readonly object: THREE.Group;
  public readonly nodes: GoalNetNode[] = [];
  public readonly edges: GoalNetEdge[] = [];
  public readonly restBounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY
  };

  private readonly nodesByKey = new Map<string, GoalNetNode>();
  private readonly edgeKeySet = new Set<string>();

  private readonly tempDirection = new THREE.Vector3();
  private readonly tempCenter = new THREE.Vector3();
  private readonly tempScale = new THREE.Vector3(1, 1, 1);
  private readonly tempMatrix = new THREE.Matrix4();
  private readonly tempQuaternion = new THREE.Quaternion();
  private readonly up = new THREE.Vector3(0, 1, 0);

  private readonly mesh: THREE.InstancedMesh;
  private readonly goalWidth: number;
  private readonly goalHeight: number;
  private readonly goalDepth: number;
  private readonly postRadius: number;

  constructor(scene: THREE.Scene, goalWidth: number, goalHeight: number, goalDepth: number, postRadius: number) {
    this.goalWidth = goalWidth;
    this.goalHeight = goalHeight;
    this.goalDepth = goalDepth;
    this.postRadius = postRadius;
    this.object = new THREE.Group();
    this.object.position.set(0, 0, this.goalDepth);

    this.buildStructure();

    const material = new THREE.MeshPhysicalMaterial({
      color: GOAL_NET_CONFIG.visual.color,
      roughness: GOAL_NET_CONFIG.visual.roughness,
      metalness: GOAL_NET_CONFIG.visual.metalness,
      clearcoat: GOAL_NET_CONFIG.visual.clearcoat,
      clearcoatRoughness: GOAL_NET_CONFIG.visual.clearcoatRoughness
    });

    const ropeGeometry = new THREE.CylinderGeometry(
      GOAL_NET_CONFIG.visual.ropeRadius,
      GOAL_NET_CONFIG.visual.ropeRadius,
      1,
      GOAL_NET_CONFIG.visual.radialSegments,
      1,
      true
    );
    ropeGeometry.computeVertexNormals();

    this.mesh = new THREE.InstancedMesh(ropeGeometry, material, this.edges.length);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;

    this.updateInstanceMatrices();
    this.mesh.instanceMatrix.needsUpdate = true;

    this.object.add(this.mesh);
    scene.add(this.object);
  }

  refreshVisual(): void {
    this.updateInstanceMatrices();
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  resetToRest(): void {
    for (const node of this.nodes) {
      node.position.copy(node.restPosition);
    }
    this.refreshVisual();
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.object);
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((mat) => mat.dispose());
    } else {
      this.mesh.material.dispose();
    }
    this.nodes.length = 0;
    this.edges.length = 0;
    this.nodesByKey.clear();
    this.edgeKeySet.clear();
  }

  private buildStructure(): void {
    this.nodes.length = 0;
    this.edges.length = 0;
    this.nodesByKey.clear();
    this.edgeKeySet.clear();
    this.restBounds.minX = Number.POSITIVE_INFINITY;
    this.restBounds.maxX = Number.NEGATIVE_INFINITY;
    this.restBounds.minY = Number.POSITIVE_INFINITY;
    this.restBounds.maxY = Number.NEGATIVE_INFINITY;
    this.restBounds.minZ = Number.POSITIVE_INFINITY;
    this.restBounds.maxZ = Number.NEGATIVE_INFINITY;

    this.buildBackPanel();
    this.buildSidePanel(-1);
    this.buildSidePanel(1);
    this.buildRoof();
    this.buildFloor();
  }

  private buildBackPanel(): void {
    const { layout, segments, visual } = GOAL_NET_CONFIG;
    const rows = segments.height;
    const cols = segments.width;

    const leftX = -this.goalWidth / 2 + visual.anchorInset;
    const rightX = this.goalWidth / 2 - visual.anchorInset;
    const bottomY = -layout.groundDrop;
    const depth = layout.depthBottom;

    const grid: GoalNetNode[][] = [];

    for (let row = 0; row <= rows; row += 1) {
      const rowNorm = row / rows;
      const y = THREE.MathUtils.lerp(bottomY, this.goalHeight - this.postRadius, rowNorm);
      const rowNodes: GoalNetNode[] = [];

      for (let col = 0; col <= cols; col += 1) {
        const colNorm = col / cols;
        const x = THREE.MathUtils.lerp(leftX, rightX, colNorm);
        const node = this.getOrCreateNode(x, y, -depth, { fixed: false });
        rowNodes.push(node);
      }

      grid.push(rowNodes);
    }

    for (let row = 0; row <= rows; row += 1) {
      const rowNodes = grid[row];
      for (let col = 0; col < cols; col += 1) {
        this.addEdge(rowNodes[col], rowNodes[col + 1], 'structural');
      }
    }

    for (let row = 0; row < rows; row += 1) {
      const current = grid[row];
      const next = grid[row + 1];
      for (let col = 0; col <= cols; col += 1) {
        this.addEdge(current[col], next[col], 'structural');
      }
      if (GOAL_NET_CONFIG.visual.includeShearRopes) {
        for (let col = 0; col < cols; col += 1) {
          this.addEdge(current[col], next[col + 1], 'shear');
          this.addEdge(current[col + 1], next[col], 'shear');
        }
      }
    }
  }

  private buildSidePanel(sideSign: -1 | 1): void {
    const { layout, segments, visual } = GOAL_NET_CONFIG;
    const rows = segments.height;
    const cols = segments.depth;
    const baseX = sideSign === -1 ? -this.goalWidth / 2 : this.goalWidth / 2;
    const bottomY = -layout.groundDrop;
    const depth = layout.depthBottom;
    const anchorX = visual.anchorInset;

    const grid: GoalNetNode[][] = [];

    for (let row = 0; row <= rows; row += 1) {
      const rowNorm = row / rows;
      const y = THREE.MathUtils.lerp(bottomY, this.goalHeight - this.postRadius, rowNorm);
      const rowNodes: GoalNetNode[] = [];

      for (let col = 0; col <= cols; col += 1) {
        const colNorm = col / cols;
        const z = -depth * colNorm;
        const x = baseX - sideSign * anchorX;
        const fixed = col === 0;
        const node = this.getOrCreateNode(x, y, z, { fixed });
        rowNodes.push(node);
      }

      grid.push(rowNodes);
    }

    for (let row = 0; row <= rows; row += 1) {
      const rowNodes = grid[row];
      for (let col = 0; col < cols; col += 1) {
        this.addEdge(rowNodes[col], rowNodes[col + 1], 'structural');
      }
    }

    for (let row = 0; row < rows; row += 1) {
      const current = grid[row];
      const next = grid[row + 1];
      for (let col = 0; col <= cols; col += 1) {
        this.addEdge(current[col], next[col], 'structural');
      }
      if (GOAL_NET_CONFIG.visual.includeShearRopes) {
        for (let col = 0; col < cols; col += 1) {
          this.addEdge(current[col], next[col + 1], 'shear');
          this.addEdge(current[col + 1], next[col], 'shear');
        }
      }
    }
  }

  private buildRoof(): void {
    const { layout, segments, visual } = GOAL_NET_CONFIG;
    const rows = segments.depth;
    const cols = segments.width;
    const leftX = -this.goalWidth / 2 + visual.anchorInset;
    const rightX = this.goalWidth / 2 - visual.anchorInset;
    const depth = layout.depthBottom;
    const topY = this.goalHeight - this.postRadius;

    const grid: GoalNetNode[][] = [];

    for (let row = 0; row <= rows; row += 1) {
      const rowNorm = row / rows;
      const rowNodes: GoalNetNode[] = [];

      for (let col = 0; col <= cols; col += 1) {
        const colNorm = col / cols;
        const x = THREE.MathUtils.lerp(leftX, rightX, colNorm);
        const y = topY;
        const fixed = row === 0;
        const node = this.getOrCreateNode(x, y, -depth * rowNorm, { fixed });
        rowNodes.push(node);
      }

      grid.push(rowNodes);
    }

    for (let row = 0; row <= rows; row += 1) {
      const rowNodes = grid[row];
      for (let col = 0; col < cols; col += 1) {
        this.addEdge(rowNodes[col], rowNodes[col + 1], 'structural');
      }
    }

    for (let row = 0; row < rows; row += 1) {
      const current = grid[row];
      const next = grid[row + 1];
      for (let col = 0; col <= cols; col += 1) {
        this.addEdge(current[col], next[col], 'structural');
      }
      if (GOAL_NET_CONFIG.visual.includeShearRopes) {
        for (let col = 0; col < cols; col += 1) {
          this.addEdge(current[col], next[col + 1], 'shear');
          this.addEdge(current[col + 1], next[col], 'shear');
        }
      }
    }
  }

  private buildFloor(): void {
    const { layout, segments, visual } = GOAL_NET_CONFIG;
    const rows = Math.max(2, Math.floor(segments.depth * 0.9));
    const cols = segments.width;
    const leftX = -this.goalWidth / 2 + visual.anchorInset;
    const rightX = this.goalWidth / 2 - visual.anchorInset;
    const baseY = -layout.groundDrop;
    const depth = layout.depthBottom;

    const grid: GoalNetNode[][] = [];

    for (let row = 0; row <= rows; row += 1) {
      const rowNorm = row / rows;
      const rowNodes: GoalNetNode[] = [];

      for (let col = 0; col <= cols; col += 1) {
        const colNorm = col / cols;
        const x = THREE.MathUtils.lerp(leftX, rightX, colNorm);
        const y = baseY;
        const fixed = row === 0;
        const node = this.getOrCreateNode(x, y, -depth * rowNorm, { fixed });
        rowNodes.push(node);
      }

      grid.push(rowNodes);
    }

    for (let row = 0; row <= rows; row += 1) {
      const rowNodes = grid[row];
      for (let col = 0; col < cols; col += 1) {
        this.addEdge(rowNodes[col], rowNodes[col + 1], 'structural');
      }
    }

    for (let row = 0; row < rows; row += 1) {
      const current = grid[row];
      const next = grid[row + 1];
      for (let col = 0; col <= cols; col += 1) {
        this.addEdge(current[col], next[col], 'structural');
      }
      if (GOAL_NET_CONFIG.visual.includeShearRopes) {
        for (let col = 0; col < cols; col += 1) {
          this.addEdge(current[col], next[col + 1], 'shear');
          this.addEdge(current[col + 1], next[col], 'shear');
        }
      }
    }
  }

  private getOrCreateNode(x: number, y: number, z: number, options: NodeOptions): GoalNetNode {
    const key = this.makeNodeKey(x, y, z);
    const existing = this.nodesByKey.get(key);
    if (existing) {
      if (options.fixed) {
        existing.fixed = true;
      }
      return existing;
    }

    const restPosition = new THREE.Vector3(x, y, z);
    const node: GoalNetNode = {
      index: this.nodes.length,
      restPosition: restPosition.clone(),
      position: restPosition.clone(),
      fixed: !!options.fixed
    };

    this.nodes.push(node);
    this.nodesByKey.set(key, node);
    this.restBounds.minX = Math.min(this.restBounds.minX, restPosition.x);
    this.restBounds.maxX = Math.max(this.restBounds.maxX, restPosition.x);
    this.restBounds.minY = Math.min(this.restBounds.minY, restPosition.y);
    this.restBounds.maxY = Math.max(this.restBounds.maxY, restPosition.y);
    this.restBounds.minZ = Math.min(this.restBounds.minZ, restPosition.z);
    this.restBounds.maxZ = Math.max(this.restBounds.maxZ, restPosition.z);
    return node;
  }

  private addEdge(a: GoalNetNode, b: GoalNetNode, type: GoalNetEdgeType): void {
    if (a.index === b.index) {
      return;
    }

    const key = this.makeEdgeKey(a.index, b.index);
    if (this.edgeKeySet.has(key)) {
      return;
    }

    this.edgeKeySet.add(key);
    const restLength = a.restPosition.distanceTo(b.restPosition);
    this.edges.push({
      startIndex: a.index,
      endIndex: b.index,
      restLength,
      type
    });
  }

  private updateInstanceMatrices(): void {
    for (let i = 0; i < this.edges.length; i += 1) {
      const edge = this.edges[i];
      const start = this.nodes[edge.startIndex].position;
      const end = this.nodes[edge.endIndex].position;

      this.tempDirection.subVectors(end, start);
      const length = this.tempDirection.length();
      if (length <= 1e-5) {
        continue;
      }
      this.tempDirection.normalize();
      this.tempQuaternion.setFromUnitVectors(this.up, this.tempDirection);
      this.tempCenter.addVectors(start, end).multiplyScalar(0.5);
      this.tempScale.set(1, length, 1);
      this.tempMatrix.compose(this.tempCenter, this.tempQuaternion, this.tempScale);
      this.mesh.setMatrixAt(i, this.tempMatrix);
    }
  }

  private makeNodeKey(x: number, y: number, z: number): string {
    return `${x.toFixed(4)}|${y.toFixed(4)}|${z.toFixed(4)}`;
  }

  private makeEdgeKey(aIndex: number, bIndex: number): string {
    return aIndex < bIndex ? `${aIndex}-${bIndex}` : `${bIndex}-${aIndex}`;
  }
}
