// TUBES.registration - 2D-to-3D Stroke Mapping with Neural Network Hooks
(function(TUBES) {
    'use strict';

    const parameters = {
        screenScale: 0.02,
        depthScale: 1.0,
        zIndex: {
            mode: 'linear',
            min: -10,
            max: 10,
            bias: 0,
            scale: 3,
            curvature: 1.0
        },
        horizontalBias: 0,
        verticalBias: 0,
        directionWeight: 1.0,
        viewportCenter: { x: 0.5, y: 0.5 },
        nnWeight: 0.0
    };

    const history = [];
    const maxHistory = 1000;

    const neuralHooks = {
        enabled: false,
        model: null,
        extractFeatures(stroke2D, strokeMetrics) {
            return {
                pointCount: stroke2D.length,
                boundingBox: strokeMetrics.boundingBox,
                direction: strokeMetrics.primaryDirection,
                curvature: strokeMetrics.averageCurvature,
                pressure: strokeMetrics.averagePressure,
                velocity: strokeMetrics.averageVelocity,
                aspect: strokeMetrics.aspectRatio
            };
        },
        predict(features) {
            if (!this.enabled || !this.model) return null;
            return null;
        },
        collectTrainingData(input, output, userCorrection) {
            return {
                timestamp: Date.now(),
                features: input,
                mapping: output,
                correction: userCorrection
            };
        }
    };

    TUBES.registration = {
        parameters,
        history,
        neuralHooks,

        init() {
            this.load();
            TUBES.events.subscribe('camera:moved', () => this.updateZMapping());
            console.log('TUBES.registration: initialized');
        },

        calculateStrokeMetrics(points) {
            if (points.length < 2) return null;

            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            points.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            });

            const width = maxX - minX;
            const height = maxY - minY;
            const aspectRatio = width / height;

            const dx = points[points.length - 1].x - points[0].x;
            const dy = points[points.length - 1].y - points[0].y;
            const angle = Math.atan2(dy, dx);
            const isHorizontal = Math.abs(dx) > Math.abs(dy);

            let totalCurvature = 0;
            for (let i = 1; i < points.length - 1; i++) {
                const v1x = points[i].x - points[i-1].x;
                const v1y = points[i].y - points[i-1].y;
                const v2x = points[i+1].x - points[i].x;
                const v2y = points[i+1].y - points[i].y;

                const angle1 = Math.atan2(v1y, v1x);
                const angle2 = Math.atan2(v2y, v2x);
                totalCurvature += Math.abs(angle2 - angle1);
            }
            const averageCurvature = totalCurvature / (points.length - 2);

            const averagePressure = points.reduce((sum, p) => sum + (p.pressure || 0.5), 0) / points.length;

            let totalDistance = 0;
            for (let i = 1; i < points.length; i++) {
                const ddx = points[i].x - points[i-1].x;
                const ddy = points[i].y - points[i-1].y;
                totalDistance += Math.sqrt(ddx * ddx + ddy * ddy);
            }
            const averageVelocity = totalDistance / points.length;

            return {
                boundingBox: { minX, maxX, minY, maxY, width, height },
                aspectRatio,
                primaryDirection: { angle, dx, dy, isHorizontal },
                averageCurvature,
                averagePressure,
                averageVelocity,
                pointCount: points.length
            };
        },

        mapStrokeTo3D(points2D, strokeMetrics) {
            const params = parameters;
            const centerX = window.innerWidth * params.viewportCenter.x;
            const centerY = window.innerHeight * params.viewportCenter.y;

            let nnPrediction = null;
            if (params.nnWeight > 0 && neuralHooks.enabled) {
                const features = neuralHooks.extractFeatures(points2D, strokeMetrics);
                nnPrediction = neuralHooks.predict(features);
            }

            const points3D = [];
            const mappingData = {
                method: nnPrediction ? 'hybrid' : 'parametric',
                nnConfidence: nnPrediction ? nnPrediction.confidence : 0,
                parameters: { ...params }
            };

            for (let i = 0; i < points2D.length; i++) {
                const p = points2D[i];
                const t = i / (points2D.length - 1);

                let x = (p.x - centerX) * params.screenScale;
                x += params.horizontalBias * params.screenScale * 5;

                let y = -(p.y - centerY) * params.screenScale;
                y += params.verticalBias * params.screenScale * 5;

                let z = this.calculateZMapping(t, p, strokeMetrics, nnPrediction);

                points3D.push(new THREE.Vector3(x, y, z));
            }

            this.recordRegistration(points2D, points3D, strokeMetrics, mappingData);

            return { points3D, mappingData, metrics: strokeMetrics };
        },

        calculateZMapping(t, point2D, strokeMetrics, nnPrediction) {
            const params = parameters;

            if (nnPrediction && params.nnWeight > 0) {
                const nnZ = nnPrediction.zMapping(t);
                const parametricZ = this.calculateParametricZ(t, point2D, strokeMetrics);
                return parametricZ * (1 - params.nnWeight) + nnZ * params.nnWeight;
            }

            return this.calculateParametricZ(t, point2D, strokeMetrics);
        },

        calculateParametricZ(t, point2D, strokeMetrics) {
            const params = parameters;
            const zParams = params.zIndex;

            let z;

            switch (zParams.mode) {
                case 'linear':
                    z = (t - 0.5) * zParams.scale;
                    break;
                case 'exponential':
                    const exp = Math.pow(t, zParams.curvature);
                    z = (exp - 0.5) * zParams.scale;
                    break;
                case 'sigmoid':
                    const sig = 1 / (1 + Math.exp(-zParams.curvature * (t - 0.5) * 10));
                    z = (sig - 0.5) * zParams.scale;
                    break;
                default:
                    z = (t - 0.5) * zParams.scale;
            }

            z += zParams.bias;
            z = Math.max(zParams.min, Math.min(zParams.max, z));

            if (strokeMetrics.primaryDirection.isHorizontal) {
                z *= params.directionWeight;
            }

            return z;
        },

        recordRegistration(points2D, points3D, metrics, mappingData) {
            const record = {
                timestamp: Date.now(),
                points2D: points2D.map(p => ({ x: p.x, y: p.y, pressure: p.pressure })),
                points3D: points3D.map(p => ({ x: p.x, y: p.y, z: p.z })),
                metrics,
                mappingData,
                cameraState: this.getCameraState()
            };

            history.push(record);

            if (history.length > maxHistory) {
                history.shift();
            }

            TUBES.events.publish('registration:recorded', record);
        },

        getCameraState() {
            if (!TUBES.camera) return null;

            return {
                position: {
                    x: TUBES.camera.camera.position.x,
                    y: TUBES.camera.camera.position.y,
                    z: TUBES.camera.camera.position.z
                },
                rotation: {
                    x: TUBES.camera.controls.rotationX,
                    y: TUBES.camera.controls.rotationY
                },
                distance: TUBES.camera.controls.distance
            };
        },

        updateZMapping() {
            TUBES.events.publish('zmapping:updated', {
                zRange: [parameters.zIndex.min, parameters.zIndex.max],
                mode: parameters.zIndex.mode,
                cameraState: this.getCameraState()
            });
        },

        save() {
            try {
                const data = {
                    parameters: parameters,
                    history: history.slice(-100)
                };
                localStorage.setItem('tubes_registration', JSON.stringify(data));
            } catch (error) {
                console.error('TUBES.registration: save failed', error);
            }
        },

        load() {
            try {
                const stored = localStorage.getItem('tubes_registration');
                if (stored) {
                    const data = JSON.parse(stored);
                    if (data.parameters) {
                        Object.assign(parameters, data.parameters);
                    }
                    if (data.history) {
                        history.push(...data.history);
                    }
                }
            } catch (error) {
                console.error('TUBES.registration: load failed', error);
            }
        },

        exportTrainingData() {
            const trainingData = history.map(record => ({
                input: neuralHooks.extractFeatures(record.points2D, record.metrics),
                output: {
                    zMapping: record.points3D.map(p => p.z),
                    params: record.mappingData.parameters
                },
                metadata: {
                    timestamp: record.timestamp,
                    cameraState: record.cameraState
                }
            }));

            const json = JSON.stringify(trainingData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `tubes_training_data_${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);
            console.log('TUBES.registration: training data exported');
        }
    };
})(window.TUBES);
