/**
 * Vecterm CLI Demo (Redux-Integrated)
 *
 * Manages the 3D spinning cube demo in the CLI vecterm viewport.
 * Now fully integrated with Redux state management.
 */

import { store } from '../core/store-instance.js';
import { vectermActions } from '../core/actions.js';

let vectermPreview = null;
let vectermAnimationId = null;

/**
 * Initialize vecterm preview and subscribe to Redux state
 */
function initVectermPreview() {
  const vectermCanvas = document.getElementById('cli-vecterm');
  if (!vectermCanvas) {
    console.warn('❌ Vecterm canvas not found (id: cli-vecterm)');
    return;
  }
  if (typeof Vecterm === 'undefined') {
    console.warn('❌ Vecterm class not loaded');
    return;
  }

  // Create Vecterm renderer with transparent background
  vectermPreview = new Vecterm(vectermCanvas);
  vectermPreview.config.backgroundColor = 'transparent';

  // Subscribe to Redux state changes
  store.subscribe(() => {
    if (!vectermPreview) return;

    const state = store.getState();
    const vectermState = state.vecterm;

    // Sync config to renderer
    if (vectermState.config) {
      Object.keys(vectermState.config).forEach(key => {
        vectermPreview.config[key] = vectermState.config[key];
      });
    }

    // Render only if not animating (animation loop handles rendering)
    if (!vectermState.animation.running) {
      renderVectermState();
    }
  });

  // Initialize camera in Redux
  store.dispatch(vectermActions.setCamera({
    position: { x: 5, y: 5, z: 10 },
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    near: 0.1,
    far: 1000
  }));

  console.log('✅ Vecterm initialized (Redux-integrated)');
}

/**
 * Render current Redux state to Vecterm canvas
 */
function renderVectermState() {
  if (!vectermPreview) return;

  const state = store.getState();
  const vectermState = state.vecterm;
  if (!vectermState) return;

  // Build camera object
  const camera = new VectermMath.Camera(
    new VectermMath.Vector3(
      vectermState.camera.position.x,
      vectermState.camera.position.y,
      vectermState.camera.position.z
    ),
    new VectermMath.Vector3(
      vectermState.camera.target.x,
      vectermState.camera.target.y,
      vectermState.camera.target.z
    )
  );

  // Build meshes array from Redux entities
  const meshes = [];
  Object.values(vectermState.entities).forEach(entity => {
    if (!entity.visible) return;

    // Get or create mesh
    let mesh;
    if (entity.meshType === 'cube') {
      mesh = VectermMesh.cube(entity.meshParams?.size || 1);
    } else if (entity.meshType === 'sphere') {
      mesh = VectermMesh.sphere(entity.meshParams?.radius || 1, entity.meshParams?.subdivisions || 1);
    } else if (entity.meshType === 'box') {
      const { width, height, depth } = entity.meshParams || { width: 1, height: 1, depth: 1 };
      mesh = VectermMesh.box(width, height, depth);
    } else if (entity.mesh) {
      // Custom mesh provided directly
      mesh = entity.mesh;
    } else {
      console.warn(`Unknown mesh type: ${entity.meshType}`);
      return;
    }

    meshes.push({
      mesh,
      transform: entity.transform,
      color: entity.color || vectermState.config.phosphorColor
    });
  });

  // Render scene
  if (meshes.length > 0) {
    vectermPreview.render(meshes, camera, 0.016);
  }
}

/**
 * Start the spinning cube demo
 */
function startVectermDemo() {
  if (!vectermPreview) {
    initVectermPreview();
  }

  if (!vectermPreview) {
    console.error('❌ Vecterm preview failed to initialize');
    return;
  }

  // Add spinning cube to Redux state
  store.dispatch(vectermActions.addEntity({
    id: 'demo-cube',
    meshType: 'cube',
    meshParams: { size: 2 },
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    },
    color: '#00ff88',
    visible: true,
    layerId: 'default'
  }));

  // Start animation loop
  store.dispatch(vectermActions.startAnimation());

  function animate() {
    const state = store.getState();
    const entity = state.vecterm.entities['demo-cube'];

    if (!entity || !state.vecterm.animation.running) {
      return;
    }

    // Update rotation via Redux action
    store.dispatch(vectermActions.updateTransform('demo-cube', {
      ...entity.transform,
      rotation: {
        x: entity.transform.rotation.x + 0.01,
        y: entity.transform.rotation.y + 0.007,
        z: 0
      }
    }));

    // Render current state
    renderVectermState();

    vectermAnimationId = requestAnimationFrame(animate);
  }

  // Wait for Redux to process the entity addition, then start animation loop
  setTimeout(() => {
    const state = store.getState();
    if (state.vecterm?.entities?.['demo-cube']) {
      animate();
    }
  }, 0);
}

/**
 * Stop the vecterm demo
 */
function stopVectermDemo() {
  if (vectermAnimationId) {
    cancelAnimationFrame(vectermAnimationId);
    vectermAnimationId = null;
  }

  // Stop animation in Redux
  store.dispatch(vectermActions.stopAnimation());

  // Remove demo cube
  store.dispatch(vectermActions.removeEntity('demo-cube'));

  if (vectermPreview) {
    vectermPreview.clear();
  }

  console.log('⏸️  Vecterm demo stopped');
}

/**
 * Get the vecterm camera from Redux state
 */
function getVectermCamera() {
  if (!store) {
    console.warn('Store not initialized yet');
    return null;
  }
  const state = store.getState();
  if (!state || !state.vecterm) {
    console.warn('Vecterm state not initialized');
    return null;
  }
  return state.vecterm.camera;
}

/**
 * Initialize vecterm on CLI panel open
 */
function setupVectermInitialization() {
  const cliFab = document.getElementById('cli-fab');
  if (cliFab) {
    cliFab.addEventListener('click', () => {
      setTimeout(() => {
        const cliPanel = document.getElementById('cli-panel');
        if (cliPanel && !cliPanel.classList.contains('hidden') && !vectermPreview) {
          initVectermPreview();
        }
      }, 100);
    });
  }
}

/**
 * Get the Vecterm renderer instance (for advanced usage)
 */
function getVectermRenderer() {
  return vectermPreview;
}

export {
  initVectermPreview,
  startVectermDemo,
  stopVectermDemo,
  getVectermCamera,
  setupVectermInitialization,
  getVectermRenderer,
  renderVectermState
};
