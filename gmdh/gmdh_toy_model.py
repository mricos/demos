# Fixed version ensuring feature consistency
import numpy as np
import matplotlib.pyplot as plt
import imageio.v2 as imageio
import os
from itertools import combinations, chain
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import Ridge

# Set random seed for reproducibility
np.random.seed(42)

# Function to generate synthetic data
def true_function(x):
    return np.sin(2 * np.pi * x)

# Generate data
X = np.linspace(0, 1, 100)
y = true_function(X) + 0.1 * np.random.randn(*X.shape)

# Split into training and validation sets
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.3, random_state=42)
X_train = X_train.reshape(-1, 1)
X_val = X_val.reshape(-1, 1)

# GMDH Parameters
max_layers = 5
degree = 4  # Reduce overfitting
models_per_layer = 7  # Keep more models
alpha = 0.05  # Slightly increase regularization

current_inputs = [X_train]
gmdh_models = []
frames = []
prev_mse = float('inf')
layer_statistics = []

for layer in range(max_layers):
    candidate_models = []
    input_combinations = list(chain(combinations(current_inputs, 1), combinations(current_inputs, 2))) if layer > 0 else [(X_train,)]

    if not input_combinations:
        break

    for _, inputs in enumerate(input_combinations):
        X_combined = np.hstack(inputs)
        X_combined_val = np.hstack([X_val] * len(inputs))  # Ensure consistent shape for validation

        poly = PolynomialFeatures(degree, include_bias=False)
        X_poly_train = poly.fit_transform(X_combined)
        X_poly_val = poly.transform(X_combined_val)

        model = Ridge(alpha=alpha)
        model.fit(X_poly_train, y_train)

        y_pred = model.predict(X_poly_val)
        mse = mean_squared_error(y_val, y_pred)

        candidate_models.append((mse, model, poly))

    if not candidate_models:
        break

    candidate_models.sort(key=lambda x: x[0])
    best_models = candidate_models[:models_per_layer]
    gmdh_models.append(best_models)

    train_errors = []
    val_errors = []

    current_inputs = []
    for _, model, poly in best_models:
        y_train_pred = model.predict(poly.transform(X_combined))
        y_val_pred = model.predict(poly.transform(X_combined_val))
        
        train_mse = mean_squared_error(y_train, y_train_pred)
        val_mse = mean_squared_error(y_val, y_val_pred)
        
        train_errors.append(train_mse)
        val_errors.append(val_mse)

        current_inputs.append(y_train_pred.reshape(-1, 1))

    # Compute statistics for the layer
    avg_train_mse = np.mean(train_errors)
    avg_val_mse = np.mean(val_errors)
    amortization_factor = avg_val_mse / avg_train_mse if avg_train_mse != 0 else float('inf')

    layer_statistics.append((layer + 1, avg_train_mse, avg_val_mse, amortization_factor))

    if avg_val_mse > prev_mse:
        print(f"Stopping early at Layer {layer} due to increasing MSE")
        break
    prev_mse = avg_val_mse

    # Generate a plot for this layer
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.scatter(X_train, y_train, color='blue', label='Training Data')
    ax.scatter(X_val, y_val, color='green', label='Validation Data')
    ax.plot(X, true_function(X), color='red', label='True Function')

    for _, model, poly in best_models:
        X_val_final = poly.transform(X_combined_val)
        y_final_pred = model.predict(X_val_final)
        sorted_indices = np.argsort(X_val.flatten())
        ax.plot(X_val[sorted_indices], y_final_pred[sorted_indices], color='orange', alpha=0.7)

    ax.legend()
    ax.set_xlabel('X')
    ax.set_ylabel('y')
    ax.set_title(f'GMDH Training Progression - Layer {layer + 1}\nTrain MSE: {avg_train_mse:.4f}, Val MSE: {avg_val_mse:.4f}, Amortization: {amortization_factor:.4f}')
    
    # Save frame for GIF
    frame_path = f"gmdh_layer_{layer+1}.png"
    plt.savefig(frame_path)
    frames.append(frame_path)
    plt.close()

# Save GIF
gif_path = "gmdh_training_progression_final.gif"
imageio.mimsave(gif_path, [imageio.imread(frame) for frame in frames], duration=0.25)

# Print layer statistics summary
print("\nGMDH Layer Summary:")
print("Layer | Train MSE | Val MSE | Amortization")
print("-----------------------------------------")
for layer, train_mse, val_mse, amortization in layer_statistics:
    print(f"{layer:5} | {train_mse:.6f} | {val_mse:.6f} | {amortization:.4f}")

# Return path to GIF
gif_path
