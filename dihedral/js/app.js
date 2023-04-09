// Declare shared variables at the top of your script file
let renderer, scene, camera;
let plane1, plane2, plane3;
let pointLight;
let ambientLight;
let prevMouseX = null, prevMouseY = null; // Initialize to null
let initialClickX = null, initialClickY = null; // Add these lines
let initialCameraPosition = new THREE.Vector3(); // Add this line
let controls=null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let anglePlane2Plane1Value;
let anglePlane2Plane3Value;

// Ball Controller
let isLeftMouseDown = false;
let isRightMouseDown = false;
let initialCursorSize = 20;

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createMirror } from './mirror.js';


import { onStageMouseMove,  on3dControlChange}
     from './controller.js';


function init(){
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75,
        window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; // Enable shadowMap
    document.body.appendChild(renderer.domElement);

    // Instantiate the OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    //controls.enablePan = false;
    controls.enableKeys = true;

    plane1 = createMirror("img4.png");
    plane2 = createMirror("img3.png");
    plane3 = createMirror("img2.png");
    scene.add(plane1);
    scene.add(plane2);
    scene.add(plane3);

  // Add event listener for the toggle button
  const toggleBorderButton = document.getElementById('toggle-border');
  toggleBorderButton.addEventListener('click', () => {
    plane3.userData.border.visible = !plane3.userData.border.visible;
  });

    // create a small red ball
    const ballGeometry = new THREE.SphereGeometry(0.05, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0x880000 });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.x=0
    ball.position.y=0
    ball.position.z=0
    scene.add(ball);

      // Set up the light source
  pointLight = new THREE.PointLight(0xffffff, 1, 100);
  pointLight.position.set(0, 10, 0);
  pointLight.castShadow = true; // Enable the light to cast shadows
  scene.add(pointLight);

    // Create an ambient light for overall scene illumination
    ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Position and rotate plane1
    plane1.position.set(0, 0, 0);
    plane1.rotation.set(0, 0, 0);
    plane1.rotation.set(Math.PI/2, 0, 0);

    // Position and rotate plane2
    plane3.position.set(1.5,1.5 ,0 );
    plane3.rotation.set(0, Math.PI/2, 0);

    // Position and rotate plane3
    plane2.position.set(-1.5,1.5 ,0 );
    plane2.rotation.set(0, Math.PI/2, 0);
    //flipMirror(plane3, 'y'); // Change axis as needed


    camera.position.z = 5;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    

    // Reflectivity input event listener
    document.getElementById('reflectivity').
        addEventListener('input', onReflectivityChange);

    // Light intensity input event listener
    document.getElementById('lightIntensity').
        addEventListener('input', onLightIntensityChange);

    document.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
    // Add event listeners for the light position sliders
    document.getElementById('lightX').
        addEventListener('input', onLightXChange);
    document.getElementById('lightY').
        addEventListener('input', onLightYChange);
    document.getElementById('lightZ').
        addEventListener('input', onLightZChange);

    document.getElementById('plane2x').
        addEventListener('input', onPlane2xChange);

    document.getElementById('plane2y').
        addEventListener('input', onPlane2yChange);

    document.getElementById('plane2z').
        addEventListener('input', onPlane2zChange);

    // Add event listeners for the flip buttons
    const flipPlane1Button = document.getElementById('flip-plane1');
    const flipPlane2Button = document.getElementById('flip-plane2');
    const flipPlane3Button = document.getElementById('flip-plane3');


    flipPlane1Button.addEventListener('click', () => {
      flipMirror(plane1, 'y'); // Change axis as needed
    });

    flipPlane2Button.addEventListener('click', () => {
      flipMirror(plane2, 'y'); // Change axis as needed
    });

    flipPlane3Button.addEventListener('click', () => {
      flipMirror(plane3, 'y'); // Change axis as needed
    });

    anglePlane2Plane1Value = document.getElementById('anglePlane2Plane1Value');
    anglePlane2Plane1Value.addEventListener("input", updatePlane2Position);
    anglePlane2Plane3Value = document.getElementById('anglePlane2Plane3Value');
    anglePlane2Plane3Value.addEventListener("input", updatePlane2Position);

    anglePlane2Plane1Value.value=60;
    anglePlane2Plane3Value.value=36;



    initBallController(ball);
    animate();
}


function flipMirror(mirror, axis = 'y') {
  const angle = Math.PI;
  switch (axis) {
    case 'x':
      mirror.rotation.x += angle;
      break;
    case 'y':
      mirror.rotation.y += angle;
      break;
    case 'z':
    default:
      mirror.rotation.z += angle;
      break;
  }
}




function initBallController(ball){
  const stage = document.getElementById('stage');
  stage.addEventListener('mousemove', onStageMouseMove);
  stage.addEventListener('wheel',onStageMouseMove);
  stage.addEventListener('3dControlChange', on3dControlChange(ball));
}



document.addEventListener('DOMContentLoaded', init);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function onLightXChange(event) {
  const lightX = parseFloat(event.target.value);
  pointLight.position.x = lightX;
}

function onLightYChange(event) {
  const lightY = parseFloat(event.target.value);
  pointLight.position.y = lightY;
}

function onLightZChange(event) {
  const light = parseFloat(event.target.value);
  pointLight.position.z = light;
}
function onPlane2xChange(event) {
  const  pos = parseFloat(event.target.value);
  plane2.position.x =  pos;
}
function onPlane2yChange(event) {
  const  pos = parseFloat(event.target.value);
  plane2.position.y =  pos;
}
function onPlane2zChange(event) {
  const  pos = parseFloat(event.target.value);
  plane2.position.z =  pos;
}


function selectPlane() {
  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);
  
  // Calculate the objects intersecting the picking ray
  const planes = [plane1, plane2, plane3];
  const intersects = raycaster.intersectObjects(planes);
  
  if (intersects.length > 0) {
    // `intersects[0].object` is the closest intersected plane
    const selectedPlane = intersects[0].object;
    
    // Perform actions with the selected plane
    console.log('Selected plane:', selectedPlane);
  }
}


function onMouseDown(event) {
  //event.preventDefault();
  
  if (event.button === 0) { // Left mouse button
    selectPlane();
  }
}


function onMouseMove(event) {

  //event.preventDefault();

  // Normalize mouse coordinates to the range of -1 to 1
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;


  // Check if the mouse is within the ui-container div
  const uiContainer = document.getElementById('ui-container');
  const rect = uiContainer.getBoundingClientRect();
  if (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  ) {
    // If the mouse is within the ui-container, do not update the third plane or the camera
    return;
  }

  // Calculate normalized mouse coordinotes (-1 to 1)
  const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

}


function rotateMeshForDihedralAngle(mesh1, mesh2, dihedralAngle) {
  // Get the normal vectors of the two meshes
  const normal1 = new THREE.Vector3();
  mesh1.getWorldDirection(normal1).normalize();
  const normal2 = new THREE.Vector3();
  mesh2.getWorldDirection(normal2).normalize();




   // console.log(THREE)

  // Calculate the axis of rotation
  const axis = new THREE.Vector3().crossVectors(normal1, normal2).normalize();

  // Calculate the angle of rotation based on the desired dihedral angle
  const angle = dihedralAngle - normal1.angleTo(normal2);

  // Create the rotation matrix
  const matrix2= new THREE.Matrix4();

  //matrix2.setRotationFromAxisAngle(axis, angle);
  console.log(matrix2)

  // Apply the rotation matrix to the first mesh
  mesh1.applyMatrix4(matrix);
}


function setDihedralAngle(p1, p2, dihedralAngle) {

    const n1 = p1.normal;
    const n2 = p2.normal;
    // Calculate the angle of rotation based on the desired dihedral angle between the two planes
    const angle = dihedralAngle - n1.angleTo(n2);

    // Create the rotation matrix
    //const matrix = new THREE.Matrix4().setFromAxisAngle(axis, angle);

    // Apply the rotation matrix to a plane mesh
    const planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 5));
    p2.applyMatrix4(matrix); // Apply the rotation matrix

};

function setDihedralAngleOld(p1, p2, angle) {

    const normal1 = getWorldNormal(p1);
    const normal2 = getWorldNormal(p2);
    console.log("Before rotation:");
    console.log("Plane 1 rotation:", plane1.rotation);
    console.log("Plane 1 position:", plane1.position);
    console.log("Plane 2 rotation:", plane2.rotation);
    console.log("Plane 2 position:", plane2.position);
    console.log("Normal 1:", normal1);
    console.log("Normal 2:", normal2);

 
    // Calculate the current angle between the planes
    const currentAngle = Math.acos(normal1.dot(normal2));

    // Calculate the angle difference to rotate plane2
    const angleDifference = angle - currentAngle;

    const axis = new THREE.Vector3().crossVectors(normal1, normal2).normalize();
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angleDifference);

    p2.setRotationFromQuaternion(quaternion);

    console.log("After rotation:");
    console.log("Plane 2 rotation:", plane2.rotation);
    console.log("Plane 2 position:", plane2.position);
    console.log("Normal 2:", getWorldNormal(plane2));

}

function updatePlane2Position() {

  const angle21= anglePlane2Plane1Value.value * (Math.PI / 180);
  //setDihedralAngle(plane1, plane2, angle21); // 60 degrees
  rotateMeshForDihedralAngle(plane2, plane1, angle21);
  const angle23= anglePlane2Plane3Value.value * (Math.PI / 180);
i//setDihedralAngle(plane3, plane2, angle23); // 60 degrees

}

function getWorldNormal(plane) {
  const localNormal = new THREE.Vector3(0, 1, 0);
  const worldNormal = localNormal.applyMatrix4(plane.matrixWorld).normalize();
  return worldNormal;
}

function getWorldNormalX3(plane) {
  const worldNormal = new THREE.Vector3();
  plane.getWorldDirection(worldNormal);
  return worldNormal;
}


function getWorldNormalX2(plane) {
  const localNormal = new THREE.Vector3(0, 1, 0); // Change to (0, 1, 0)
  const worldNormal = localNormal.clone().applyMatrix4(plane.matrixWorld).normalize();
  return worldNormal;
}


function getWorldNormalX(plane) {
  const localNormal = new THREE.Vector3(0, 0, 1);
  const worldNormal = localNormal.applyMatrix4(plane.matrixWorld);
  worldNormal.sub(plane.position).normalize();
  return worldNormal;
}


function getWorldNormalOld(plane) {
  const localNormal = new THREE.Vector3(0, 0, 1);
  const worldNormal = localNormal.applyMatrix4(plane.matrixWorld).normalize();
  return worldNormal;
}

function onReflectivityChange(event) {
  const reflectivity = parseFloat(event.target.value);

  // Update the reflectivity of the material
  plane1.material.metalness = reflectivity;
  plane2.material.metalness = reflectivity;
  plane3.material.metalness = reflectivity;
}

function onLightIntensityChange(event) {
  const lightIntensity = parseFloat(event.target.value);

  // Update the intensity of the point light
  pointLight.intensity = lightIntensity;
}

