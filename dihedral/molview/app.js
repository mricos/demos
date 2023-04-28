import * as THREE from 'three';


// Define the 3D coordinates for each atom in the molecule
const atomPositions = [
  [0, 0, 0], // Oxygen atom
  [0.7, 0, 0], // Hydrogen atom 1
  [-0.3, 0.5, 0] // Hydrogen atom 2
];

// Calculate the dihedral angle between four consecutive atoms in the molecule
function calculateDihedralAngle(positions) {
  const v1 = new THREE.Vector3().subVectors(positions[0], positions[1]);
  const v2 = new THREE.Vector3().subVectors(positions[2], positions[1]);
  const v3 = new THREE.Vector3().subVectors(positions[3], positions[2]);
  
  const normal1 = new THREE.Vector3().crossVectors(v1, v2).normalize();
  const normal2 = new THREE.Vector3().crossVectors(v2, v3).normalize();
  
  const angle = normal1.angleTo(normal2);
  const sign = Math.sign(normal1.dot(v3));
  
  return angle * sign;
}

function init() {
  // Create a Three.js scene
  const scene = new THREE.Scene();

  // Create a camera and add it to the scene
  const camera = new THREE.PerspectiveCamera(
    75, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near plane
    1000 // Far plane
  );
  camera.position.z = 5;
  scene.add(camera);

  // Create a light and add it to the scene
  const light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(0, 0, 10);
  scene.add(light);

  // Create a renderer and add it to the DOM
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("molview").appendChild(renderer.domElement);

  // Create a sphere geometry for each atom
  const atomGeometries = atomPositions.map(position => {
    const geometry = new THREE.SphereGeometry(0.1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(...position);
    return sphere;
  });

  // Add each atom to the scene
  atomGeometries.forEach(atomGeometry => scene.add(atomGeometry));

  // Calculate the dihedral angle between the atoms and log it to the console
  const dihedralAngle = calculateDihedralAngle(atomPositions);
  console.log(`Dihedral angle: ${dihedralAngle}`);

  // Render the scene
  renderer.render(scene, camera);
}

// Initialize the scene when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  init();
});
