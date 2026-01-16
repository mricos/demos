// TUBES.cylinder - Merged Cylinder Lifecycle and Selection Management
(function(TUBES) {
    'use strict';

    // Private state
    let cylinders = [];
    let selectedCylinders = [];
    let nextId = 0;

    TUBES.cylinder = {
        get cylinders() { return cylinders; },
        get selectedCylinders() { return selectedCylinders; },

        init() {
            this.setupSelection();

            TUBES.events.subscribe('input:mapping-changed', () => {
                console.log('TUBES.cylinder: key mappings updated');
            });

            console.log('TUBES.cylinder: initialized');
        },

        setupSelection() {
            const canvas = TUBES.config.canvas.drawing;
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            canvas.addEventListener('click', (e) => {
                if (TUBES.stroke.isDrawing || TUBES.camera.controls.isRotating) return;

                const rect = canvas.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(mouse, TUBES.camera.camera);

                const meshes = cylinders.map(c => c.mesh);
                const intersects = raycaster.intersectObjects(meshes);

                if (intersects.length > 0) {
                    const mesh = intersects[0].object;
                    const cylinder = cylinders.find(c => c.mesh === mesh);
                    if (cylinder) {
                        TUBES.input.handleCylinderClick(cylinder, e);
                    }
                } else {
                    if (!e.shiftKey && !e.ctrlKey) {
                        this.deselectAll();
                    }
                }
            });
        },

        // Public API - createFromStroke (was CYLINDER.createFromStroke)
        createFromStroke(points) {
            return this.create(points);
        },

        create(strokePoints) {
            const id = nextId++;

            const strokeMetrics = TUBES.registration.calculateStrokeMetrics(strokePoints);
            const registration = TUBES.registration.mapStrokeTo3D(strokePoints, strokeMetrics);

            const metadata = {
                originalStroke: strokePoints.map(p => ({...p})),
                strokeMetrics: strokeMetrics,
                curve3D: registration.points3D,
                registration: registration.mappingData,
                groupIds: [],
                parameters: {
                    radius: TUBES.config.settings.radius,
                    segments: TUBES.config.settings.segments,
                    curvePoints: TUBES.config.settings.curvePoints,
                    interpolation: TUBES.config.settings.interpolation,
                    smoothing: TUBES.config.settings.smoothing,
                    depth: TUBES.config.settings.depth,
                    singleWidthMode: TUBES.config.settings.singleWidthMode,
                    color: TUBES.config.settings.color,
                    metalness: TUBES.config.settings.metalness,
                    roughness: TUBES.config.settings.roughness,
                    widthFunction: 'normal',
                    sCurveParams: { steepness: 5, midpoint: 0.5 }
                }
            };

            const mesh = this.buildMesh(metadata);
            if (!mesh) return null;

            const cylinder = { id, mesh, metadata };
            cylinders.push(cylinder);
            TUBES.scene.add(mesh);

            TUBES.events.publish('cylinder:created', { cylinderId: id, registration: metadata.registration });

            return cylinder;
        },

        buildMesh(metadata) {
            const curve3D = metadata.curve3D;
            if (!curve3D || curve3D.length < 2) return null;

            const path = this.createPath(curve3D, metadata.parameters);
            const radiusFunction = this.getRadiusFunction(metadata.parameters);
            const geometry = this.createGeometry(path, metadata.parameters, radiusFunction);

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(metadata.parameters.color),
                metalness: metadata.parameters.metalness,
                roughness: metadata.parameters.roughness,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.isCylinder = true;
            mesh.userData.cylinderId = null;

            return mesh;
        },

        createPath(points, parameters) {
            const interpolation = parameters.interpolation;

            if (interpolation === 'linear') {
                return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0);
            } else if (interpolation === 'catmull-rom') {
                const tension = 1 - parameters.smoothing;
                return new THREE.CatmullRomCurve3(points, false, 'centripetal', tension);
            } else if (interpolation === 'bezier') {
                return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
            }

            return new THREE.CatmullRomCurve3(points);
        },

        getRadiusFunction(parameters) {
            const baseRadius = parameters.radius;
            const widthFunc = parameters.widthFunction;
            const sCurve = parameters.sCurveParams;

            const sCurveMap = (t, steepness, midpoint) => {
                const x = (t - midpoint) * steepness;
                return 1 / (1 + Math.exp(-x));
            };

            if (widthFunc === 'normal') {
                return (t) => baseRadius;
            } else if (widthFunc === 'inverted') {
                return (t) => baseRadius * (1 - sCurveMap(t, sCurve.steepness, sCurve.midpoint) * 0.8);
            } else if (widthFunc === 'growing') {
                return (t) => baseRadius * (0.2 + sCurveMap(t, sCurve.steepness, sCurve.midpoint) * 0.8);
            } else if (widthFunc === 'shrinking') {
                return (t) => baseRadius * (1 - sCurveMap(t, sCurve.steepness, sCurve.midpoint) * 0.8);
            }

            return (t) => baseRadius;
        },

        createGeometry(path, parameters, radiusFunction) {
            const curvePoints = parameters.curvePoints;
            const segments = parameters.segments;

            const frames = path.computeFrenetFrames(curvePoints, false);
            const tangents = frames.tangents;
            const normals = frames.normals;
            const binormals = frames.binormals;

            const vertices = [];
            const indices = [];
            const uvs = [];

            for (let i = 0; i <= curvePoints; i++) {
                const t = i / curvePoints;
                const point = path.getPointAt(t);
                const radius = radiusFunction(t);

                const normal = normals[i];
                const binormal = binormals[i];

                for (let j = 0; j <= segments; j++) {
                    const theta = (j / segments) * Math.PI * 2;
                    const cosTheta = Math.cos(theta);
                    const sinTheta = Math.sin(theta);

                    const vertex = new THREE.Vector3();
                    vertex.x = point.x + radius * (cosTheta * normal.x + sinTheta * binormal.x);
                    vertex.y = point.y + radius * (cosTheta * normal.y + sinTheta * binormal.y);
                    vertex.z = point.z + radius * (cosTheta * normal.z + sinTheta * binormal.z);

                    vertices.push(vertex.x, vertex.y, vertex.z);
                    uvs.push(j / segments, i / curvePoints);
                }
            }

            for (let i = 0; i < curvePoints; i++) {
                for (let j = 0; j < segments; j++) {
                    const a = i * (segments + 1) + j;
                    const b = a + segments + 1;
                    const c = a + 1;
                    const d = b + 1;

                    indices.push(a, b, c);
                    indices.push(b, d, c);
                }
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();

            return geometry;
        },

        rebuild(cylinderId) {
            const cylinder = cylinders.find(c => c.id === cylinderId);
            if (!cylinder) return;

            TUBES.scene.remove(cylinder.mesh);
            if (cylinder.mesh.geometry) cylinder.mesh.geometry.dispose();
            if (cylinder.mesh.material) cylinder.mesh.material.dispose();

            const newMesh = this.buildMesh(cylinder.metadata);
            if (newMesh) {
                cylinder.mesh = newMesh;
                newMesh.userData.cylinderId = cylinderId;
                TUBES.scene.add(newMesh);

                if (selectedCylinders.includes(cylinderId)) {
                    this.highlightMesh(newMesh);
                }
            }
        },

        // Selection methods
        selectSingle(cylinderId) {
            selectedCylinders.forEach(id => {
                const cyl = cylinders.find(c => c.id === id);
                if (cyl) this.unhighlightMesh(cyl.mesh);
            });

            selectedCylinders = [cylinderId];

            const cylinder = cylinders.find(c => c.id === cylinderId);
            if (cylinder) {
                this.highlightMesh(cylinder.mesh);
            }

            TUBES.events.publish('cylinder:selected', { cylinderId, selectedCount: selectedCylinders.length });

            if (TUBES.panels) {
                TUBES.panels.updateSelectedCylinderPanel(cylinder);
            }
        },

        toggleSelection(cylinderId) {
            const index = selectedCylinders.indexOf(cylinderId);
            const cylinder = cylinders.find(c => c.id === cylinderId);
            if (!cylinder) return;

            if (index > -1) {
                selectedCylinders.splice(index, 1);
                this.unhighlightMesh(cylinder.mesh);
                TUBES.events.publish('cylinder:deselected', { cylinderId, selectedCount: selectedCylinders.length });
            } else {
                selectedCylinders.push(cylinderId);
                this.highlightMesh(cylinder.mesh);
                TUBES.events.publish('cylinder:selected', { cylinderId, selectedCount: selectedCylinders.length });
            }

            this.updateSelectionUI();
        },

        addToSelection(cylinderId) {
            if (selectedCylinders.includes(cylinderId)) return;

            selectedCylinders.push(cylinderId);

            const cylinder = cylinders.find(c => c.id === cylinderId);
            if (cylinder) {
                this.highlightMesh(cylinder.mesh);
            }

            TUBES.events.publish('cylinder:selected', { cylinderId, selectedCount: selectedCylinders.length });
            this.updateSelectionUI();
        },

        deselectAll() {
            selectedCylinders.forEach(id => {
                const cyl = cylinders.find(c => c.id === id);
                if (cyl) this.unhighlightMesh(cyl.mesh);
            });

            selectedCylinders = [];
            TUBES.events.publish('selection:cleared', null);

            if (TUBES.panels) {
                TUBES.panels.updateSelectedCylinderPanel(null);
            }
        },

        selectAll() {
            selectedCylinders = cylinders.map(c => c.id);
            cylinders.forEach(c => this.highlightMesh(c.mesh));
            this.updateSelectionUI();
        },

        updateSelectionUI() {
            if (TUBES.panels) {
                if (selectedCylinders.length === 1) {
                    const cylinder = cylinders.find(c => c.id === selectedCylinders[0]);
                    TUBES.panels.updateSelectedCylinderPanel(cylinder);
                } else if (selectedCylinders.length > 1) {
                    TUBES.panels.updateSelectedCylinderPanel({ isMultiSelection: true, count: selectedCylinders.length });
                } else {
                    TUBES.panels.updateSelectedCylinderPanel(null);
                }
            }
        },

        getSelected() {
            return selectedCylinders.map(id => cylinders.find(c => c.id === id)).filter(c => c !== undefined);
        },

        highlightMesh(mesh) {
            if (mesh && mesh.material) {
                mesh.material.emissive = new THREE.Color(0xe94560);
                mesh.material.emissiveIntensity = 0.3;
            }
        },

        unhighlightMesh(mesh) {
            if (mesh && mesh.material) {
                mesh.material.emissive = new THREE.Color(0x000000);
                mesh.material.emissiveIntensity = 0;
            }
        },

        delete(cylinderId) {
            const index = cylinders.findIndex(c => c.id === cylinderId);
            if (index === -1) return;

            const cylinder = cylinders[index];

            if (cylinder.metadata.groupIds) {
                cylinder.metadata.groupIds.forEach(groupId => {
                    TUBES.groups.removeCylinderFromGroup(cylinderId, groupId);
                });
            }

            TUBES.scene.remove(cylinder.mesh);
            if (cylinder.mesh.geometry) cylinder.mesh.geometry.dispose();
            if (cylinder.mesh.material) cylinder.mesh.material.dispose();

            cylinders.splice(index, 1);

            const selIndex = selectedCylinders.indexOf(cylinderId);
            if (selIndex > -1) {
                selectedCylinders.splice(selIndex, 1);
                TUBES.events.publish('cylinder:deleted', { cylinderId });
                this.updateSelectionUI();
            }
        },

        deleteSelected() {
            if (selectedCylinders.length === 0) return;

            const count = selectedCylinders.length;
            const ids = [...selectedCylinders];

            ids.forEach(id => this.delete(id));

            TUBES.events.publish('cylinders:deleted', { count });
        },

        clear() {
            cylinders.forEach(cylinder => {
                TUBES.scene.remove(cylinder.mesh);
                if (cylinder.mesh.geometry) cylinder.mesh.geometry.dispose();
                if (cylinder.mesh.material) cylinder.mesh.material.dispose();
            });

            cylinders = [];
            selectedCylinders = [];
            nextId = 0;

            TUBES.events.publish('scene:cleared', null);

            if (TUBES.panels) {
                TUBES.panels.updateSelectedCylinderPanel(null);
            }
        }
    };
})(window.TUBES);
