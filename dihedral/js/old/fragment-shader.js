import * as THREE from 'three';

const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  uniform vec3 cameraPosition;
  uniform samplerCube envMap;
  varying vec3 vWorldPosition;

  void main() {
    vec3 worldNormal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    vec3 I = vWorldPosition - cameraPosition;
    vec3 R = reflect(I, worldNormal);
    vec4 envColor = textureCube(envMap, R);

    if (worldNormal.z > 0.0) {
      gl_FragColor = envColor;
    } else {
      gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); // Solid blue color
    }
  }
`;

function createMirror(envMap, camera) {
  const shaderMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      envMap: { value: envMap },
      cameraPosition: { value: camera.position },
    },
  });

  const planeGeometry = new THREE.PlaneGeometry(3, 3);
  const mirror = new THREE.Mesh(planeGeometry, shaderMaterial);

  return mirror;
}

export { createMirror };
