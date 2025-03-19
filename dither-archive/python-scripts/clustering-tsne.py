import os
import json
import numpy as np
import matplotlib.pyplot as plt
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
from PIL import Image
from tqdm import tqdm

# Path to your image dataset (Update with your actual path or URLs)
image_folder = "/Users/ya/Documents/WEB/Yyyyaaaannnnoooo.github.io/dither-archive/imgs/media"

# Function to compute the average RGB values of an image
def compute_avg_rgb(image_path):
    try:
        img = Image.open(image_path).convert("RGB")  # Ensure it's in RGB mode
        img_array = np.array(img)
        avg_rgb = img_array.mean(axis=(0, 1))  # Compute mean across width & height
        return avg_rgb
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return None

# Read images and compute average RGB values
image_paths = [os.path.join(image_folder, f) for f in os.listdir(image_folder) if f.endswith(('png', 'jpg', 'jpeg'))]

features = []
valid_paths = []

for path in tqdm(image_paths, desc="Processing images"):
    avg_rgb = compute_avg_rgb(path)
    if avg_rgb is not None:
        features.append(avg_rgb)
        valid_paths.append(path)  # Store only valid paths

features = np.array(features)

# Apply t-SNE for dimensionality reduction
tsne = TSNE(n_components=2, random_state=42, perplexity=30)  # Adjust perplexity if needed
tsne_results = tsne.fit_transform(features)

# Clustering using KMeans
num_clusters = 8  # Adjust based on dataset
kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
clusters = kmeans.fit_predict(tsne_results)

# Prepare data for JSON
image_data = []
for i, path in enumerate(valid_paths):
    image_data.append({
        "image_path": path,  # You can replace with a URL if applicable
        "x": float(tsne_results[i, 0]),  # Convert to standard JSON format
        "y": float(tsne_results[i, 1]),
        "cluster": int(clusters[i])  # Ensure integer for JSON compatibility
    })

# Save to JSON
output_json_path = "image_tsne_clusters.json"
with open(output_json_path, "w") as json_file:
    json.dump(image_data, json_file, indent=4)

print(f"Saved t-SNE results to {output_json_path}")


# Plot the clustered results
plt.figure(figsize=(10, 7))
scatter = plt.scatter(tsne_results[:, 0], tsne_results[:, 1], c=clusters, cmap='viridis', alpha=0.7)
plt.colorbar(scatter, label="Cluster ID")
plt.title("t-SNE Visualization of Image Clusters (Based on Avg RGB)")
plt.xlabel("t-SNE Dimension 1")
plt.ylabel("t-SNE Dimension 2")
plt.show()
