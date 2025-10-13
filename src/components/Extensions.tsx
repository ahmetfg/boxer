import * as THREE from "three";

// Object3D'ye extension
declare module "three" {
  interface Object3D {
    setPosition(value:THREE.Vector3): undefined;
    worldPosition(): THREE.Vector3;
    worldQuaternion(): THREE.Quaternion;
  }
}

THREE.Object3D.prototype.worldPosition = function (
): THREE.Vector3 {
  const w = new THREE.Vector3();
  this.getWorldPosition(w)
  return w;
};
THREE.Object3D.prototype.worldQuaternion = function (
): THREE.Quaternion {
  const w = new THREE.Quaternion();
  this.getWorldQuaternion(w)
  return w;
};
THREE.Object3D.prototype.setPosition = function (vec): undefined {
  this.position.set(vec.x,vec.y,vec.z)
};
