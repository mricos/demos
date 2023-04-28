import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

function createMirror(img='pattern.png') {
  const geometry = new THREE.PlaneGeometry(4, 4);

  // Reflective plane
  const reflectivePlane = new Reflector(geometry, {
    clipBias: 0.0003,
    recursion: 3,
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
  });

  // Load texture from image file
  const textureLoader = new THREE.TextureLoader();
  const patternTexture = textureLoader.load(img);

  // Solid color plane with pattern
  const solidColorMaterial = new THREE.MeshBasicMaterial({
    map: patternTexture,
    side: THREE.BackSide,
  });
  const solidColorPlane = new THREE.Mesh(geometry, solidColorMaterial);
  solidColorPlane.position.z -= 0.02;

  // Border
  const borderGeometry = new THREE.EdgesGeometry(geometry);
  const borderMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const border = new THREE.LineSegments(borderGeometry, borderMaterial);
  border.position.z -= 0.02;

  // Group
  const mirrorGroup = new THREE.Group();
  mirrorGroup.add(reflectivePlane);
  mirrorGroup.add(solidColorPlane);
  mirrorGroup.add(border);

  // Store the border in the userData property of the mirrorGroup
  mirrorGroup.userData.border = border;


  return mirrorGroup;
}
export { createMirror };

