/**
 * Shared Math Module
 * Common 3D math utilities for graphics applications
 */

export { vec3 } from './vec3.js';
export { mat4 } from './mat4.js';
export { quat } from './quat.js';

// Re-export defaults
import vec3 from './vec3.js';
import mat4 from './mat4.js';
import quat from './quat.js';

export default { vec3, mat4, quat };
