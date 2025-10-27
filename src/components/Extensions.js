// import * as THREE from '../../node_modules/three/build/three.module.js';
import * as THREE from 'three';

THREE.Object3D.prototype.worldPosition = function (
) {
  const w = new THREE.Vector3();
  this.getWorldPosition(w)
  return w;
};
THREE.Object3D.prototype.worldQuaternion = function (
) {
  const w = new THREE.Quaternion();
  this.getWorldQuaternion(w)
  return w;
};
THREE.Object3D.prototype.setPosition = function (vec) {
  this.position.set(vec.x,vec.y,vec.z)
};
