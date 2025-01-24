// gmdh.js
class GMDH {
    constructor(maxLayers = 5, degree = 4, modelsPerLayer = 7, alpha = 0.05) {
        this.maxLayers = maxLayers;
        this.degree = degree;
        this.modelsPerLayer = modelsPerLayer;
        this.alpha = alpha;
        this.layers = [];
        this.trainErrors = [];
        this.validationErrors = [];
        this.epochTrainErrors = [];  // Track every model evaluation
        this.epochValErrors = [];    // Track every model evaluation
        this.currentLayer = 0;
        this.currentModel = 0;
        this.totalEpochs = maxLayers * modelsPerLayer;
    }

    generateData(n = 100) {
        const X = Array.from({ length: n }, (_, i) => i / (n - 1));
        const y = X.map(x => Math.sin(2 * Math.PI * x) + 0.1 * (Math.random() - 0.5));
        
        // Split into train/validation sets (80/20)
        const splitIndex = Math.floor(n * 0.8);
        return {
            X_train: X.slice(0, splitIndex),
            y_train: y.slice(0, splitIndex),
            X_val: X.slice(splitIndex),
            y_val: y.slice(splitIndex)
        };
    }

    polynomialFeatures(X, degree) {
        return X.map(x => [1, ...Array.from({ length: degree }, (_, i) => Math.pow(x, i + 1))]);
    }

    ridgeRegression(X_features, y) {
        const X_mat = math.matrix(X_features);
        const y_column = math.reshape(y, [y.length, 1]);
        const batchSize = X_features.length;
        
        try {
            const Xt = math.transpose(X_mat);
            const XtX = math.multiply(Xt, X_mat);
            const regTerm = math.multiply(math.identity(XtX.size()[0]), this.alpha);
            const XtX_alpha = math.add(XtX, regTerm);
            const XtY = math.multiply(Xt, y_column);
            const solution = math.lusolve(XtX_alpha, XtY);
            const coefficients = solution.toArray().flat();
            
            return {
                success: true,
                coefficients,
                dimensions: {
                    X_shape: X_mat.size(),
                    batchSize
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Ridge regression calculation failed'
            };
        }
    }

    predict(X_features, coefficients) {
        return X_features.map(row => 
            row.reduce((sum, xi, j) => sum + xi * coefficients[j], 0)
        );
    }

    meanSquaredError(yTrue, yPred) {
        return yTrue.reduce((sum, yi, i) => sum + Math.pow(yi - yPred[i], 2), 0) / yTrue.length;
    }

    fitLayer(X_train, y_train, X_val, y_val, layer) {
        try {
            this.currentLayer = layer;
            if (layer >= this.maxLayers) return { success: false, error: 'Maximum layers reached' };

            let candidateModels = [];
            const polyX_train = this.polynomialFeatures(X_train, this.degree);
            const polyX_val = this.polynomialFeatures(X_val, this.degree);

            let bestTrainLoss = Infinity;
            let bestValLoss = Infinity;

            // Create models with increasing complexity
            for (let i = 0; i < this.modelsPerLayer; i++) {
                this.currentModel = i;
                const currentEpoch = (layer * this.modelsPerLayer) + i;
                
                // Gradually increase model complexity
                // Start with 2 features, gradually add more as training progresses
                const progressRatio = currentEpoch / this.totalEpochs;  // 0 to 1
                const maxFeatures = Math.min(
                    2 + Math.floor(progressRatio * (this.degree - 1)), 
                    this.degree + 1
                );
                
                // Always include constant term (1) and linear term (x)
                const baseFeatures = [0, 1];  // Indices for constant and linear terms
                
                // Add higher degree terms based on progress
                const higherOrderFeatures = Array.from(
                    { length: this.degree - 1 }, 
                    (_, i) => i + 2
                ).slice(0, maxFeatures - 2);
                
                const featureIndices = [...baseFeatures, ...higherOrderFeatures];

                // Create feature matrices with selected features
                const selectedX_train = polyX_train.map(row => featureIndices.map(i => row[i]));
                const selectedX_val = polyX_val.map(row => featureIndices.map(i => row[i]));
                
                const result = this.ridgeRegression(selectedX_train, y_train);
                if (!result.success) continue;

                // Update the equation display with the current model's coefficients
                onModelUpdate(result.coefficients);

                const trainPred = this.predict(selectedX_train, result.coefficients);
                const valPred = this.predict(selectedX_val, result.coefficients);
                
                const trainMSE = this.meanSquaredError(y_train, trainPred);
                const valMSE = this.meanSquaredError(y_val, valPred);

                if (!isNaN(trainMSE) && !isNaN(valMSE) && isFinite(trainMSE) && isFinite(valMSE)) {
                    // Update best losses
                    bestTrainLoss = Math.min(bestTrainLoss, trainMSE);
                    bestValLoss = Math.min(bestValLoss, valMSE);

                    // Track losses for every model evaluation
                    this.epochTrainErrors.push(trainMSE);
                    this.epochValErrors.push(valMSE);

                    // Publish model evaluation with current model's performance
                    window.PubSub.publish('trainingStep', {
                        stage: 'model_evaluation',
                        layer: layer + 1,
                        modelIndex: i + 1,
                        maxLayers: this.maxLayers,
                        degree: this.degree,
                        modelsPerLayer: this.modelsPerLayer,
                        alpha: this.alpha,
                        trainLoss: trainMSE,
                        valLoss: valMSE,
                        bestTrainLoss: bestTrainLoss,
                        bestValLoss: bestValLoss,
                        numFeatures: featureIndices.length,
                        features: featureIndices,
                        epoch: currentEpoch + 1,
                        totalEpochs: this.totalEpochs
                    });

                    candidateModels.push({ 
                        model: result.coefficients, 
                        trainMSE,
                        valMSE,
                        features: featureIndices
                    });
                }
            }

            if (candidateModels.length === 0) {
                return { success: false, error: 'No valid models found for this layer' };
            }

            // Sort by validation loss
            candidateModels.sort((a, b) => a.valMSE - b.valMSE);
            const bestModels = candidateModels.slice(0, Math.min(this.modelsPerLayer, candidateModels.length));
            this.layers.push(bestModels);

            // Track both training and validation errors (use best model's errors)
            this.trainErrors.push(bestModels[0].trainMSE);
            this.validationErrors.push(bestModels[0].valMSE);

            // Use the best models to create input for next layer
            if (layer < this.maxLayers - 1) {
                const nextX_train = bestModels.map(model => 
                    this.predict(polyX_train.map(row => model.features.map(i => row[i])), model.model)
                );
                const nextX_val = bestModels.map(model => 
                    this.predict(polyX_val.map(row => model.features.map(i => row[i])), model.model)
                );

                X_train = nextX_train[0];  // Use predictions from best model for next layer
                X_val = nextX_val[0];
            }

            // Publish layer completion with best model's performance
            window.PubSub.publish('trainingStep', {
                stage: 'layer_complete',
                layer: layer + 1,
                maxLayers: this.maxLayers,
                degree: this.degree,
                modelsPerLayer: this.modelsPerLayer,
                alpha: this.alpha,
                trainLoss: bestModels[0].trainMSE,
                valLoss: bestModels[0].valMSE,
                bestTrainLoss: bestModels[0].trainMSE,
                bestValLoss: bestModels[0].valMSE,
                epoch: (layer + 1) * this.modelsPerLayer,
                totalEpochs: this.totalEpochs
            });

            return { 
                success: true,
                stats: {
                    trainMSE: bestModels[0].trainMSE,
                    valMSE: bestModels[0].valMSE,
                    bestModel: bestModels[0]
                }
            };
        } catch (error) {
            return { success: false, error: error.message || 'Error in layer fitting' };
        }
    }

    setAlpha(newAlpha) {
        this.alpha = newAlpha;
        console.log(`Alpha updated to: ${this.alpha}`);
        window.PubSub.publish('alphaUpdated', { alpha: this.alpha });
    }
}
