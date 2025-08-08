import * as THREE from 'three';


let sphere, scene, renderer, rotationSpeed;

/**
 * Three.js sahne ve küreyi başlatır, küreyi sahneye ekler ve sürükleme ile
 * yalnızca yaw (Y) ve pitch (X) eksenlerinde döndürmeyi sağlar.
 *
 * @param {Object} options
 * @param {THREE.Scene} options._scene      – üç.js sahnesi
 * @param {THREE.WebGLRenderer} options._renderer – renderer
 * @param {number} [options.rotationSpeed=0.005] – sürüklemeden dönüş hızı
 * @param {number} [options.sphereColor=0x0077ff] – küre rengi
 * @param {boolean} [options.wireframe=true] – tel kafes modu
 * @returns {THREE.Mesh} – oluşturulan küre
 */
export function initThreeJsSceneAndSphere(options = {}) {
  const {
    _scene,
    _renderer,
    rotationSpeed: rotSpeed = 0.005,
    sphereColor = 0x0077ff,
    wireframe = true
  } = options;

  // Global değişkenlere ata
  scene = _scene;
  renderer = _renderer;
  rotationSpeed = rotSpeed;

  // Küre oluştur
  const geometry = new THREE.SphereGeometry(10, 2, 2);
  const material = new THREE.MeshPhongMaterial({ color: sphereColor, wireframe });
  sphere = new THREE.Mesh(geometry, material);

  // Unity tarzı X ölçeği negatif, pozisyon (0,0,0)
  sphere.scale.set(-1, 1, 1);
  sphere.position.set(0, 0, 0);

  // Euler dönüş sırası: önce Y (yaw), sonra X (pitch), en son Z (roll)
  // Biz Z'yi hiç değiştirmeyeceğiz, böylece roll hiçbir zaman uygulanmaz.
  sphere.rotation.order = 'YXZ';

  scene.add(sphere);

  // Fare ve dokunma olay dinleyicilerini ekle
  addEventListeners();

  return sphere;
}


function addEventListeners() {
  const dom = renderer.domElement;

  // 1) Canvas'ta tarayıcı scroll/zoom/çeviri hareketlerini kapat
  dom.style.touchAction = 'none';
  dom.style.userSelect = 'none';

  // 2) Gerekirse tüm sayfa touch-move'larını da durdur
  window.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  let isDraggingSphere = false;
  let spherePointerId: number | null = null;
  let prevPos = { x: 0, y: 0 };

  // Başlangıç: fare veya touch ile basıldığında işleme al
  dom.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'touch') {
      isDraggingSphere = true;
      spherePointerId = e.pointerId;
      prevPos = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture(spherePointerId);
    }
  }, false);

  // Bırakıldığında bırak
  dom.addEventListener('pointerup', (e) => {
    if (e.pointerId === spherePointerId) {
      isDraggingSphere = false;
      if (spherePointerId !== null) {
        dom.releasePointerCapture(spherePointerId);
        spherePointerId = null;
      }
    }
  }, false);

  // Sistem iptali gibi durumlara karşı da bırak
  dom.addEventListener('pointercancel', (e) => {
    if (e.pointerId === spherePointerId) {
      isDraggingSphere = false;
      dom.releasePointerCapture(e.pointerId);
      spherePointerId = null;
    }
  }, false);

  // Hareketi takip et ve küreyi döndür
  dom.addEventListener('pointermove', (e) => {
    if (!isDraggingSphere || e.pointerId !== spherePointerId) return;

    const deltaX = e.clientX - prevPos.x;
    const deltaY = e.clientY - prevPos.y;

    sphere.rotation.y -= deltaX * rotationSpeed;
    sphere.rotation.x += deltaY * rotationSpeed;

    prevPos = { x: e.clientX, y: e.clientY };
  }, false);
}


export class SpineAimController {
  /**
  * @param {Object}   cfg
  * @param {THREE.Object3D} cfg.spineBone            — character spine bone
  * @param {THREE.Object3D} cfg.rifle                — rifle mesh / empty transform
  * @param {THREE.Object3D} [cfg.rifleRotationTarget]— optional helper whose world rotation is applied to rifle
  * @param {THREE.Object3D} cfg.target               — object the spine & rifle aim at
  * @param {THREE.Vector3}  [cfg.offset]             — Euler‑angle offset (deg) for spine after lookAt
  * @param {THREE.Vector3}  [cfg.rifleOffset]        — Euler‑angle offset (deg) for rifle after lookAt or copy
  * @param {string}         [cfg.rifleForwardAxis]   — which local axis points forward on the rifle ("-z", "+z", "-x", etc.)
  */
  constructor({
    spineBone,
    rifle,
    rifleRotationTarget = null,
    target,
    offset = new THREE.Vector3(),
    rifleOffset = new THREE.Vector3(),
    rifleForwardAxis = "-z",
  }) {
    this.spineBone = spineBone;
    this.rifle = rifle;
    this.rifleRotationTarget = rifleRotationTarget;
    this.target = target;
    this.offset = offset; // degrees
    this.rifleOffset = rifleOffset; // degrees
    this.rifleForwardAxis = rifleForwardAxis;

    this._tmpEuler = new THREE.Euler();
    this._tmpVec = new THREE.Vector3();
    this._axisAdjustQuat = this._getAxisAdjustQuat(rifleForwardAxis);
  }

  /**
   * Call every frame.
   */
  update() {
    if (!this.spineBone || !this.target) return;

    // ---------------- Spine ----------------
    const worldPos = this.target.getWorldPosition(this._tmpVec);
    this.spineBone.lookAt(worldPos);
    this._applyEulerOffset(this.spineBone, this.offset);

    // ---------------- Rifle ----------------
    if (this.rifle && false) {
      // keep matrices fresh
      this.rifle.parent?.updateWorldMatrix(true, false);

      if (this.rifleRotationTarget) {
        // apply helper's world rotation
        this.rifleRotationTarget.parent?.updateWorldMatrix(true, false);
        this.rifleRotationTarget.getWorldQuaternion(this.rifle.quaternion);
      } else {
        // default: lookAt target, then adjust forward axis
        this.rifle.lookAt(worldPos);
        this.rifle.quaternion.premultiply(this._axisAdjustQuat);
      }

      // apply optional offset
      this._applyEulerOffset(this.rifle, this.rifleOffset);
    }
  }

  // ---------------- Helpers ----------------
  _applyEulerOffset(obj3d, offsetDeg) {
    this._tmpEuler.set(
      THREE.MathUtils.degToRad(offsetDeg.x),
      THREE.MathUtils.degToRad(offsetDeg.y),
      THREE.MathUtils.degToRad(offsetDeg.z)
    );
    const q = new THREE.Quaternion().setFromEuler(this._tmpEuler);
    obj3d.quaternion.multiply(q);
  }

  /**
   * Returns a quaternion that rotates the provided local axis so it aligns with +Z.
   */
  _getAxisAdjustQuat(axisLabel) {
    switch (axisLabel) {
      case "+z": return new THREE.Quaternion();
      case "-z": return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
      case "+x": return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0));
      case "-x": return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
      case "+y": return new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      case "-y": return new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      default:
        console.warn(`SpineAimController: unknown rifleForwardAxis '${axisLabel}', defaulting to '-z'.`);
        return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
    }
  }

  // ---------------- Convenience setters ----------------
  setTarget(obj) {
    this.target = obj;
  }

  setOffsets(offset, rifleOffset = this.rifleOffset) {
    this.offset.copy(offset);
    this.rifleOffset.copy(rifleOffset);
  }

  setRifleForwardAxis(axisLabel) {
    this.rifleForwardAxis = axisLabel;
    this._axisAdjustQuat = this._getAxisAdjustQuat(axisLabel);
  }

  setRifleRotationTarget(obj) {
    this.rifleRotationTarget = obj;
  }
}

/**
 * Sahnedeki tüm mesh nesneleri için dat.GUI'ye pozisyon kaydırıcıları ekler.
 * @param {THREE.Scene} scene - Three.js sahne objesi.
 * @param {GUI} gui - dat.GUI instance'ı.
 */
function addPositionSlidersToGUI(scene, gui) {
  // Sahnedeki tüm çocukları (nesneleri) dolaş
  scene.children.forEach(object => {
    // Sadece THREE.Mesh veya THREE.Object3D gibi pozisyonu olan nesneleri hedefle
    // İsterseniz burada daha spesifik filtreleme yapabilirsiniz (örn. sadece belirli isimdeki nesneler)
    if (object instanceof THREE.Mesh || object instanceof THREE.Object3D) {
      // Her nesne için ayrı bir GUI klasörü oluştur
      const folder = gui.addFolder(object.name || `Object ${object.id}`);

      // X pozisyonu için kaydırıcı
      folder.add(object.position, 'x', -10, 10).name('Position X').onChange(() => {
        // Pozisyon değiştiğinde sahnenin güncellenmesi gerekiyorsa burada render çağrılabilir.
        // Örneğin: renderer.render(scene, camera);
      });

      // Y pozisyonu için kaydırıcı
      folder.add(object.position, 'y', -10, 10).name('Position Y').onChange(() => {
        // Pozisyon değiştiğinde sahnenin güncellenmesi gerekiyorsa burada render çağrılabilir.
      });

      // Z pozisyonu için kaydırıcı
      folder.add(object.position, 'z', -10, 10).name('Position Z').onChange(() => {
        // Pozisyon değiştiğinde sahnenin güncellenmesi gerekiyorsa burada render çağrılabilir.
      });

      // Klasörü aç (isteğe bağlı)
      folder.open();
    }
  });
}

export default addPositionSlidersToGUI;

export function AddSphere(scene, radius = 1, color = 0xffff005, widthSegments = 32, heightSegments = 16) {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const material = new THREE.MeshBasicMaterial({
    color: color
  });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.name = "aimTarget"
  scene.add(sphere);
  return sphere
}

/**
 * Constrained lookAt: Hangi eksenlerin aktif olacağını seçerek obje yönlendirmesi yapar.
 * 
 * @param {THREE.Object3D} object    — Yönlendirmek istediğiniz obje
 * @param {THREE.Vector3}  targetPos — Bakılacak dünya konumu
 * @param {Object}         axes      — Hangi eksenlerin aktif olacağını belirten obje
 *                                   { x: Boolean, y: Boolean, z: Boolean }
 */
export function LookAtCustom(object, targetPos, axes = { x: true, y: true, z: true }) {
  // 1) Mevcut Euler rotasyonu sakla
  const origEuler = object.rotation.clone();

  // 2) Geçici bir nesne yarat, objenin pozuna yerleştir
  const tmp = new THREE.Object3D();
  tmp.position.copy(object.getWorldPosition(new THREE.Vector3()));

  // 3) Geçici nesneyle standart lookAt yap
  tmp.lookAt(targetPos);

  // 4) Ortaya çıkan rotasyondan Euler açılarını al
  const newEuler = tmp.rotation;

  // 5) Filtrelenmiş Euler değerleriyle objenin rotasyonunu güncelle
  object.rotation.set(
    axes.x ? newEuler.x : origEuler.x,
    axes.y ? newEuler.y : origEuler.y,
    axes.z ? newEuler.z : origEuler.z,
    object.rotation.order  // mevcut dönüş sırasını koru
  );
}

export function lookAtYawOnly(object, targetPos) {
  const pos = object.getWorldPosition(new THREE.Vector3());
  const dir = new THREE.Vector3().subVectors(targetPos, pos);
  // XZ düzlemindeki açı: atan2(X farkı, Z farkı)
  const yaw = Math.atan2(dir.x, dir.z);
  object.rotation.z = -yaw;
}

// Utils.tsx dosyasının sonuna veya ThreeAim.jsx tepeye ekleyin
export function clipOnlyUpperBody(originalClip: THREE.AnimationClip) {
  const UPPER_PARTS = [
    'ForeArm','Head'
  ];               // anahtar kelime listesi – gerektiğinde genişletin

  const filteredTracks = originalClip.tracks.filter(track =>
    UPPER_PARTS.some(part => track.name.includes(part))
  );

  return new THREE.AnimationClip(
    originalClip.name + '_Upper',
    originalClip.duration,
    filteredTracks
  );
}



export class LerpManager {
  action = null
  get = null
  last = null
  newWeight = 0
  lerpFactor = 0.5
  ids = []

  constructor() { }

  setActions(action, get) {
    this.action = action
    this.get = get
  }

  push(newWeight, lerpFactor = 0.3) {
    this.newWeight = newWeight
    this.lerpFactor = lerpFactor
  }
  clear() {
    for (let i = 0; i < this.ids.length; i++) {
      clearTimeout(this.ids[i])
    }
  }

  update() {
    if (this.action == null || this.get == null) return
    if (this.newWeight == null) return

    this.last = THREE.MathUtils.lerp(
      this.last,
      this.newWeight,
      this.lerpFactor
    )

    this.action(this.last)
  }
}

export class FabrikLeftArm {
  private chain: THREE.Bone[];

  /* geçici tamponlar – GC yok */
  private tmpV1 = new THREE.Vector3();     // bonePos
  private tmpV2 = new THREE.Vector3();     // effectorPos
  private tmpV3 = new THREE.Vector3();     // targetPos
  private qWorld = new THREE.Quaternion();
  private qLocal = new THREE.Quaternion();
  private parentQ = new THREE.Quaternion();
  private parentQInv = new THREE.Quaternion();

  /**
   * @param bones Sırayla: shoulder (LeftArm), elbow (LeftForeArm), wrist (LeftHand)
   * @param target Elin gitmesi gereken global hedef (tüfek üzerindeki empty)
   * @param iters  Kare başına CCD tur sayısı (1 = en hızlı)
   */
  constructor(
    bones: { shoulder: THREE.Bone; elbow: THREE.Bone; wrist: THREE.Bone },
    public target: THREE.Object3D,
    private iters = 1
  ) {
    this.chain = [bones.shoulder, bones.elbow, bones.wrist];
  }

  /** AnimMixer.update(dt) çağrısından hemen sonra çalıştırın. */
  update() {
    const [shoulder, elbow, wrist] = this.chain;

    for (let step = 0; step < this.iters; step++) {
      /* Zinciri geriden (dirsek) öne (omuz) çöz – sadece 2 kemik */
      for (let i = 1; i >= 0; i--) {
        const bone   = this.chain[i];
        const parent = bone.parent!;

        /* Parent world matrisini tazele (tek sefer yetecek) */
        parent.updateWorldMatrix(true, false);

        /* === dünya uzayında vektörler === */
        const bonePos   = bone.getWorldPosition(this.tmpV1);    // tmpV1
        const effector  = wrist.getWorldPosition(this.tmpV2);   // tmpV2
        const targetPos = this.target.getWorldPosition(this.tmpV3); // tmpV3

        const vToEff = this.tmpV2.subVectors(effector, bonePos).normalize();
        const vToTgt = this.tmpV3.subVectors(targetPos, bonePos).normalize();

        /* Yönler zaten uyumluysa atla */
        if (vToEff.dot(vToTgt) > 0.999) continue;

        /* Dünya uzayında gerekli dönme */
        this.qWorld.setFromUnitVectors(vToEff, vToTgt);

        /* Dünya → local dönüşüm */
        parent.getWorldQuaternion(this.parentQ);
        this.parentQInv.copy(this.parentQ).invert();

        this.qLocal.copy(this.parentQInv)
                   .multiply(this.qWorld)
                   .multiply(this.parentQ);

        /* Uygula */
        bone.quaternion.premultiply(this.qLocal);
        bone.updateMatrix();
        /* Çocuk kemiklerin world matrisini güncelle */
        parent.updateWorldMatrix(true, true);
      }
      /* (isteğe bağlı) yakınlığa bakıp erken çıkabilirsiniz */
    }
  }
}

export class MuzzleFlashAnimator {
  private textures: THREE.Texture[] = [];
  private sprite!: THREE.Sprite;
  private loaded = false;
  private intervalId?: number;

  /**
   * @param rifle          Sprite'ın ekleneceği obje (namlu ucu olarak kullandığın THREE.Object3D)
   * @param imagePaths     Frame frame oynatılacak PNG dosyalarının yolları
   * @param frameDuration  Her frame'in gösterim süresi (ms)
   * @param loop           Animasyon sonunda tekrar başlatılsın mı?
   * @param random         true ise her döngüde frame sırasını rastgele sırala
   */
  constructor(
    private rifle: THREE.Object3D,
    private imagePaths: string[],
    private frameDuration: number,
    private loop: boolean,
    private random: boolean
  ) {
    this.loadTextures();
  }

  private loadTextures() {
    let count = 0;
    const loader = new THREE.TextureLoader();
    this.imagePaths.forEach((path, i) => {
      loader.load(path, tex => {
        this.textures[i] = tex;
        count++;
        if (count === this.imagePaths.length) {
          this.loaded = true;
          this.createSprite();
        }
      });
    });
  }

  private createSprite() {
    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.textures[0],
        transparent: true,
        depthWrite: false
      })
    );
    this.sprite.scale.set(0.5, 0.5, 1);
    this.sprite.position.set(0, 0.08, 0.7);
    this.sprite.visible = false;
    this.rifle.add(this.sprite);
  }

  /** Animasyonu başlatır */
  public play() {
    if (!this.loaded || !this.sprite) return;
    this.stop();

    // Oynatma sırasını hazırla
    let sequence = [...this.textures];
    if (this.random) {
      // Fisher–Yates shuffle
      for (let i = sequence.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
      }
    }

    let frameIndex = 0;
    this.sprite.visible = true;

    this.intervalId = window.setInterval(() => {
      this.sprite.material.map = sequence[frameIndex];
      this.sprite.material.needsUpdate = true;
      frameIndex++;

      if (frameIndex >= sequence.length) {
        if (this.loop) {
          // loop: yeniden hazırla (rastgeleyse tekrar shuffle et)
          sequence = [...this.textures];
          if (this.random) {
            for (let i = sequence.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
            }
          }
          frameIndex = 0;
        } else {
          this.stop();
        }
      }
    }, this.frameDuration);
  }

  /** Animasyonu durdurur ve sprite'ı gizler */
  public stop() {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    if (this.sprite) {
      this.sprite.visible = false;
    }
  }
}

/**
 * Belirlenen minimum ve maksimum değerler arasında ondalıklı rastgele bir sayı döndürür.
 * @param {number} min - Rastgele sayının alt sınırı (dahil).
 * @param {number} max - Rastgele sayının üst sınırı (hariç).
 * @returns {number} Rastgele oluşturulmuş sayı.
 */
export function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export class FabrikLeftArm2 {
  private chain: THREE.Bone[];
  private tmpV1 = new THREE.Vector3();
  private tmpV2 = new THREE.Vector3();
  private tmpV3 = new THREE.Vector3();
  private qWorld = new THREE.Quaternion();
  private qLocal = new THREE.Quaternion();
  private parentQ = new THREE.Quaternion();
  private parentQInv = new THREE.Quaternion();

  /**
   * @param bones  sırayla: leftArm, leftForeArm, leftHand
   * @param target Elin gitmesi gereken global hedef objesi
   * @param iters  Kare başına CCD tur sayısı (default = 2)
   */
  constructor(
    bones: { shoulder: THREE.Bone; elbow: THREE.Bone; wrist: THREE.Bone },
    public target: THREE.Object3D,
    private iters = 3
  ) {
    this.chain = [bones.shoulder, bones.elbow, bones.wrist];
  }

  /** AnimMixer.update sonrası çağırın. */
  update() {
    const [shoulder, elbow, wrist] = this.chain;

    for (let step = 0; step < this.iters; step++) {
      /* zinciri geriden (dirsek) öne (omuz) çöz */
      for (let i = this.chain.length - 2; i >= 0; i--) {
        const bone   = this.chain[i];
        const parent = bone.parent!;
      
        parent.updateWorldMatrix(true, false);
      
        const bonePos   = bone.getWorldPosition(this.tmpV1);   // tmpV1
        const effector  = wrist.getWorldPosition(this.tmpV2);  // tmpV2
        const targetPos = this.target.getWorldPosition(this.tmpV3); // tmpV3 NEW
      
        const vToEff = this.tmpV2.subVectors(effector, bonePos).normalize();
        const vToTgt = this.tmpV3.subVectors(targetPos, bonePos).normalize();
      
        if (vToEff.dot(vToTgt) > 0.999) continue;
      
        this.qWorld.setFromUnitVectors(vToEff, vToTgt);
      
        parent.getWorldQuaternion(this.parentQ);
        this.parentQInv.copy(this.parentQ).invert();
      
        this.qLocal.copy(this.parentQInv)
                   .multiply(this.qWorld)
                   .multiply(this.parentQ);
      
        bone.quaternion.premultiply(this.qLocal);
        bone.updateMatrix();
        parent.updateWorldMatrix(true, true);
      }
      

      /* yakınlaştıysak erken çık */
      // if (
      //   wrist.getWorldPosition(this.tmpV1)
      //        .distanceTo(this.target.getWorldPosition(this.tmpV2)) < 0.002
      // ) break;
    }
  }
}
