import * as THREE from 'three';

export interface CharacterAppearanceConfig {
  shirt?: { color: number };
  backLogo?: string;
  chestLogo?: string;
  backNumber?: { value: number; color?: number };
}

/** Suffix patterns so we work with any Mixamo character prefix (Ch42, Ch36, Ch04, ...). */
const SUBMESH_PATTERNS = {
  shirt: /shirt|jersey/i,
  shorts: /shorts/i,
  sneakers: /sneakers|shoes|boots/i,
  hair: /hair/i,
} as const;

type AppearanceMeshKey = keyof typeof SUBMESH_PATTERNS;

/** Cleaned name must END WITH one of these. Works for both 'mixamorig:Spine2' and bare 'Spine2'. */
const CHEST_BONE_CANDIDATES = ['spine2', 'spine1', 'spine'];

/** Bone-local offsets for plane decals. GLB rigs from FBX2glTF are in meters (the source FBX
 *  was in centimeters); these values are in meters too. Get the units wrong and the decal
 *  balloons into a multi-meter wall that occludes the whole character. */
const LOGO_SIZE_LOCAL = 0.22;
const LOGO_DEPTH_LOCAL = 0.14;
const LOGO_VERTICAL_LOCAL = 0;

/** Back number is larger than the logo and sits lower on the back, like a real jersey. */
const BACK_NUMBER_SIZE_LOCAL = 0.32;
const BACK_NUMBER_DEPTH_LOCAL = -0.14;
const BACK_NUMBER_VERTICAL_LOCAL = -0.18;

/** Set per-submesh color, dropping the shared atlas map so the color renders accurately
 * instead of being multiplied by whatever Mixamo baked in. */
export function applyCharacterAppearance(
  root: THREE.Object3D,
  appearance: CharacterAppearanceConfig | undefined
): void {
  if (!appearance) return;
  const colorEntries: [AppearanceMeshKey, number][] = [];
  if (appearance.shirt) colorEntries.push(['shirt', appearance.shirt.color]);
  for (const [key, color] of colorEntries) {
    const mesh = findSubmesh(root, key);
    if (!mesh) continue;
    const original = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!(original instanceof THREE.MeshStandardMaterial) && !(original instanceof THREE.MeshPhongMaterial)) continue;
    const cloned = original.clone();
    cloned.color = new THREE.Color(color);
    cloned.map = null;
    cloned.needsUpdate = true;
    mesh.material = cloned;
  }
}

function findSubmesh(root: THREE.Object3D, key: AppearanceMeshKey): THREE.Mesh | null {
  const pattern = SUBMESH_PATTERNS[key];
  let found: THREE.Mesh | null = null;
  root.traverse((child) => {
    if (found) return;
    if (!(child instanceof THREE.Mesh)) return;
    if (pattern.test(child.name)) found = child;
  });
  return found;
}

/** Convert each character mesh's MeshStandardMaterial → MeshPhongMaterial to match the
 *  FBX-era render. FBXLoader produces Phong; GLTFLoader produces Standard (PBR). Under
 *  ACES tone mapping PBR's diffuse term reads brighter and flatter than Phong, which is
 *  what shows up as "pale" / "washed out". These Phong settings mirror what FBXLoader
 *  builds for a textured Mixamo character (white base color, no specular, no shininess) so
 *  the texture is the only thing driving surface color. */
export function normalizeCharacterBrightness(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const std = child.material;
    if (!(std instanceof THREE.MeshStandardMaterial)) return;
    const phong = new THREE.MeshPhongMaterial({
      map: std.map ?? null,
      color: 0xffffff,
      transparent: std.transparent,
      opacity: std.opacity,
      alphaTest: std.alphaTest,
      depthWrite: std.depthWrite,
      side: std.side,
      shininess: 0,
      specular: new THREE.Color(0x000000),
    });
    if (std.map) phong.map!.colorSpace = THREE.SRGBColorSpace;
    child.material = phong;
    std.dispose();
  });
}

/** iOS Safari (WKWebView) silently drops SkinnedMeshes whose bone matrices are uploaded as
 *  uniform arrays past a driver-side threshold, even when WebGL reports support for larger
 *  uniforms. Forcing each skeleton to use a DataTexture for its bone matrices sidesteps that
 *  bug and is harmless on other platforms (just a slightly different upload path). */
export function forceBoneTextureForIOS(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.SkinnedMesh)) return;
    const skeleton = child.skeleton;
    if (skeleton && !skeleton.boneTexture) skeleton.computeBoneTexture();
  });
}

export function loadCharacterLogoTexture(
  loadingManager: THREE.LoadingManager,
  url: string
): THREE.Texture {
  const texture = new THREE.TextureLoader(loadingManager).load(encodeURI(url));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Attach a flat logo plane as a child of the spine bone so it follows torso movement.
 * side='back' places it behind the spine; 'front' on the chest. The plane is rotated
 * so the texture is not mirrored when seen from outside the body. */
export function attachTorsoLogo(
  root: THREE.Object3D,
  texture: THREE.Texture,
  opts: { side: 'front' | 'back' }
): void {
  const bone = findChestBone(root);
  if (!bone) {
    // eslint-disable-next-line no-console
    console.warn('[characterAppearance] spine bone not found; logo skipped');
    return;
  }
  const material = createFabricDecalMaterial({ map: texture });
  const geometry = new THREE.PlaneGeometry(LOGO_SIZE_LOCAL, LOGO_SIZE_LOCAL);
  const mesh = new THREE.Mesh(geometry, material);
  const depth = opts.side === 'back' ? -LOGO_DEPTH_LOCAL : LOGO_DEPTH_LOCAL;
  mesh.position.set(0, LOGO_VERTICAL_LOCAL, depth);
  if (opts.side === 'back') mesh.rotation.y = Math.PI;
  mesh.name = `character_${opts.side}_logo`;
  bone.add(mesh);
}

/** Attach a large jersey number on the back, below the logo. */
export function attachBackNumber(
  root: THREE.Object3D,
  value: number,
  opts?: { color?: number }
): void {
  const bone = findChestBone(root);
  if (!bone) {
    // eslint-disable-next-line no-console
    console.warn('[characterAppearance] spine bone not found; back number skipped');
    return;
  }
  const texture = createNumberTexture(value, opts?.color ?? 0xffffff);
  const material = createFabricDecalMaterial({ map: texture });
  const geometry = new THREE.PlaneGeometry(BACK_NUMBER_SIZE_LOCAL, BACK_NUMBER_SIZE_LOCAL);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, BACK_NUMBER_VERTICAL_LOCAL, BACK_NUMBER_DEPTH_LOCAL);
  mesh.rotation.y = Math.PI;
  mesh.name = 'character_back_number';
  bone.add(mesh);
}

/** Standard material so the decal picks up the same scene lighting as the jersey,
 * avoiding the flat "sticker" look. PolygonOffset lifts it off the body surface to
 * prevent z-fighting; roughness matches fabric so it shades like cloth, not glossy plastic. */
function createFabricDecalMaterial(opts: { map: THREE.Texture }): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: opts.map,
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -1;
  return material;
}

function createNumberTexture(value: number, color: number): THREE.Texture {
  const SIZE = 512;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 380px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), SIZE / 2, SIZE / 2 + 12);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Bake jersey color + logo + back-number into the shirt material's texture map.
 * Unlike plane decals, this makes the decoration part of the shirt's UV — so it deforms
 * with skinning and shades with the same lighting model as the rest of the cloth.
 *
 * The logo is positioned at the centroid of the shirt UV bbox. Because Mixamo unwraps
 * shirts so the front and back share roughly the same UV region (or are mirrored across
 * a seam), the logo appears on both sides naturally. The number is placed slightly below
 * the logo so it lands on the lower-back area on most rigs.
 */
export async function bakeJerseyTexture(
  root: THREE.Object3D,
  opts: {
    color: number;
    logoUrl?: string;
    number?: number;
    numberColor?: number;
  }
): Promise<void> {
  const mesh = findSubmesh(root, 'shirt');
  if (!mesh) return;
  const original = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (!(original instanceof THREE.MeshStandardMaterial) && !(original instanceof THREE.MeshPhongMaterial)) return;

  const uvAttr = mesh.geometry.attributes.uv;
  if (!uvAttr) return;

  // Compute UV bbox for overall canvas sizing reference.
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (let i = 0; i < uvAttr.count; i++) {
    const u = uvAttr.getX(i);
    const v = uvAttr.getY(i);
    if (u < uMin) uMin = u; if (u > uMax) uMax = u;
    if (v < vMin) vMin = v; if (v > vMax) vMax = v;
  }
  if (!isFinite(uMin) || uMax <= uMin || vMax <= vMin) return;

  // Find UV centroids of front-facing vs back-facing triangles. Mixamo's shirt unwrap puts
  // front and back in distinct UV islands, so we want to target each separately rather than
  // the overall bbox center (which lands on the sleeve/side).
  const centroids = getFrontBackUVCentroids(mesh);

  const ATLAS_SIZE = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = `#${opts.color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

  const bw = (uMax - uMin) * ATLAS_SIZE;
  const bh = (vMax - vMin) * ATLAS_SIZE;
  const refSize = Math.min(bw, bh);

  // CanvasTexture default flipY=true → canvas-Y = (1 - V) * SIZE.
  const uvToCanvas = (u: number, v: number) => ({
    x: u * ATLAS_SIZE,
    y: (1 - v) * ATLAS_SIZE,
  });

  // Mixamo unwraps the shirt panels rotated 90° CW in UV space. Compensate by drawing each
  // element rotated -90° around its anchor. After this: canvas-left direction → body-up,
  // canvas-right → body-down. So "above number" on the body = lower-X on canvas (vertOffsetX).
  const PANEL_ROTATION = -Math.PI / 2;
  const vertOffsetX = refSize * 0.22;

  // Front logo: smaller, chest-sized.
  if (opts.logoUrl && centroids.front) {
    const img = await loadHTMLImage(opts.logoUrl);
    if (img) {
      const { x: fx, y: fy } = uvToCanvas(centroids.front.u, centroids.front.v);
      const logoSize = refSize * 0.35;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(PANEL_ROTATION);
      ctx.drawImage(img, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
      ctx.restore();
    }
  }

  if (centroids.back) {
    const { x: bxc, y: byc } = uvToCanvas(centroids.back.u, centroids.back.v);

    if (opts.logoUrl) {
      const img = await loadHTMLImage(opts.logoUrl);
      if (img) {
        const logoSize = refSize * 0.28;
        // Above number on body = canvas-left of centroid.
        ctx.save();
        ctx.translate(bxc - vertOffsetX, byc);
        ctx.rotate(PANEL_ROTATION);
        ctx.drawImage(img, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
        ctx.restore();
      }
    }

    if (opts.number != null) {
      const fontPx = Math.round(refSize * 0.42);
      // Below logo (still upright on body) = canvas-right of where the logo is.
      ctx.save();
      ctx.translate(bxc + vertOffsetX * 0.4, byc);
      ctx.rotate(PANEL_ROTATION);
      ctx.fillStyle = `#${(opts.numberColor ?? 0xffffff).toString(16).padStart(6, '0')}`;
      ctx.font = `bold ${fontPx}px Arial, Helvetica, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(opts.number), 0, 0);
      ctx.restore();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  const cloned = original.clone();
  cloned.color = new THREE.Color(0xffffff);
  cloned.map = texture;
  cloned.transparent = false;
  cloned.needsUpdate = true;
  mesh.material = cloned;
}

/** Area-weighted UV centroids restricted to the central body region (excludes sleeves).
 * Mixamo bind pose: character faces +Z, so positive bind-pose Z = front, negative = back. */
function getFrontBackUVCentroids(mesh: THREE.Mesh): {
  front: { u: number; v: number } | null;
  back: { u: number; v: number } | null;
} {
  const pos = mesh.geometry.attributes.position;
  const uv = mesh.geometry.attributes.uv;
  if (!pos || !uv) return { front: null, back: null };
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox;
  if (!bbox) return { front: null, back: null };

  // Only consider triangles whose centroid x is within 35% of the center (excludes sleeves).
  // Y filter trims the bottom hem and the very top neckline so chest/back get prioritized.
  const xCenter = (bbox.min.x + bbox.max.x) / 2;
  const xLimit = (bbox.max.x - bbox.min.x) * 0.18;
  const yMin = bbox.min.y + (bbox.max.y - bbox.min.y) * 0.15;
  const yMax = bbox.min.y + (bbox.max.y - bbox.min.y) * 0.95;

  const index = mesh.geometry.index;
  const triCount = index ? index.count / 3 : Math.floor(pos.count / 3);

  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();

  let frontU = 0, frontV = 0, frontW = 0;
  let backU = 0, backV = 0, backW = 0;

  for (let i = 0; i < triCount; i++) {
    const a = index ? index.getX(i * 3) : i * 3;
    const b = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const c = index ? index.getX(i * 3 + 2) : i * 3 + 2;

    va.set(pos.getX(a), pos.getY(a), pos.getZ(a));
    vb.set(pos.getX(b), pos.getY(b), pos.getZ(b));
    vc.set(pos.getX(c), pos.getY(c), pos.getZ(c));

    const cx = (va.x + vb.x + vc.x) / 3;
    const cy = (va.y + vb.y + vc.y) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    if (Math.abs(cx - xCenter) > xLimit) continue;
    if (cy < yMin || cy > yMax) continue;

    e1.subVectors(vb, va);
    e2.subVectors(vc, va);
    const area = e1.cross(e2).length() * 0.5;

    const cu = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3;
    const cv = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;

    if (cz > 0) { frontU += cu * area; frontV += cv * area; frontW += area; }
    else { backU += cu * area; backV += cv * area; backW += area; }
  }

  return {
    front: frontW > 0 ? { u: frontU / frontW, v: frontV / frontW } : null,
    back: backW > 0 ? { u: backU / backW, v: backV / backW } : null,
  };
}

function loadHTMLImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      // eslint-disable-next-line no-console
      console.warn('[characterAppearance] logo image failed to load:', url, err);
      resolve(null);
    };
    img.src = encodeURI(url);
  });
}

function findChestBone(root: THREE.Object3D): THREE.Object3D | null {
  const collected = new Map<string, THREE.Object3D>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Bone)) return;
    const n = child.name.toLowerCase().replace(/\s+/g, '').replace(/:/g, '');
    for (const cand of CHEST_BONE_CANDIDATES) {
      if (collected.has(cand)) continue;
      if (n === cand || n.endsWith(cand)) collected.set(cand, child);
    }
  });
  for (const cand of CHEST_BONE_CANDIDATES) {
    const bone = collected.get(cand);
    if (bone) return bone;
  }
  return null;
}
