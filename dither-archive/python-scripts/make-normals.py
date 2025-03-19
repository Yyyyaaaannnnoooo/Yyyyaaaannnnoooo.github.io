import cv2
import numpy as np
import os

def generate_normal_map(image_path, strength=1.0):
    # Load the image in grayscale
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Image not found or unable to load: {image_path}")
    
    # Compute gradients in x and y directions
    dx = cv2.Sobel(img, cv2.CV_32F, 1, 0, ksize=5)
    dy = cv2.Sobel(img, cv2.CV_32F, 0, 1, ksize=5)
    
    # Normalize gradients
    dx = dx / 255.0 * strength
    dy = dy / 255.0 * strength
    
    # Compute the normal vectors
    dz = np.ones_like(dx)
    length = np.sqrt(dx**2 + dy**2 + dz**2)
    normal_map = np.zeros((img.shape[0], img.shape[1], 3), dtype=np.float32)
    normal_map[..., 0] = (dx / length + 1) / 2  # X component
    normal_map[..., 1] = (dy / length + 1) / 2  # Y component
    normal_map[..., 2] = (dz / length + 1) / 2  # Z component
    
    # Convert to 8-bit image
    normal_map = (normal_map * 255).astype(np.uint8)
    
    return normal_map

def save_normal_map(image_path, output_path, strength=1.0):
    normal_map = generate_normal_map(image_path, strength)
    cv2.imwrite(output_path, normal_map)
    print(f"Normal map saved to {output_path}")

def process_folder(input_folder, output_folder, strength=1.0):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    for filename in os.listdir(input_folder):
        input_path = os.path.join(input_folder, filename)
        if os.path.isfile(input_path) and filename.lower().endswith((".jpg", ".png", ".jpeg")):
            output_path = os.path.join(output_folder, f"normal_{filename}")
            print(f"Processing {filename}...")
            save_normal_map(input_path, output_path, strength)

# Example usage
if __name__ == "__main__":
    input_folder = "/Users/ya/Documents/WEB/Yyyyaaaannnnoooo.github.io/dither-archive/imgs/media"  # Change to your input folder path
    output_folder = "/Users/ya/Documents/WEB/Yyyyaaaannnnoooo.github.io/dither-archive/imgs/normals"  # Change to your output folder path
    process_folder(input_folder, output_folder, strength=10.0)
