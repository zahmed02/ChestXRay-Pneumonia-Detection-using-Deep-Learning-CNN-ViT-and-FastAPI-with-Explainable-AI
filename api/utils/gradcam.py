import torch
import torch.nn.functional as F
import cv2
import numpy as np
from PIL import Image

def generate_gradcam(model, input_tensor, target_class, original_image=None, save_path=None):
    """
    Generate Grad-CAM heatmap and blend it with the original image (preserving original size).
    """
    model.eval()
    gradients = []
    activations = []

    def forward_hook(module, inp, outp):
        activations.append(outp)

    def backward_hook(module, grad_in, grad_out):
        gradients.append(grad_out[0])

    target_layer = model.layer4[-1].conv3
    forward_handle = target_layer.register_forward_hook(forward_hook)
    backward_handle = target_layer.register_backward_hook(backward_hook)

    output = model(input_tensor)
    model.zero_grad()
    loss = output[0, target_class]
    loss.backward()

    grad = gradients[0]   # (1, C, H, W)   H=W=7 for ResNet50 after layer4
    act = activations[0]  # (1, C, H, W)

    forward_handle.remove()
    backward_handle.remove()

    # Weighted average
    weights = grad.mean(dim=(2, 3), keepdim=True)          # (1, C, 1, 1)
    cam = (weights * act).sum(dim=1, keepdim=True)         # (1, 1, H, W)
    cam = F.relu(cam)
    cam = cam.squeeze().cpu().detach().numpy()             # (H, W)   typically 7x7
    # Resize to 224x224 (model input size)
    cam = cv2.resize(cam, (224, 224))
    cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

    # If original image provided, blend with heatmap at original size
    if original_image is not None:
        orig_w, orig_h = original_image.size
        # Resize heatmap to original image size
        cam_resized = cv2.resize(cam, (orig_w, orig_h))
        heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
        # Convert original to numpy (no resizing)
        original_np = np.array(original_image)
        # Ensure we have 3 channels (RGB)
        if original_np.shape[-1] == 4:
            original_np = cv2.cvtColor(original_np, cv2.COLOR_RGBA2RGB)
        overlay = cv2.addWeighted(original_np, 0.5, heatmap, 0.5, 0)
        result = Image.fromarray(overlay)
    else:
        # No original – just the heatmap
        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        result = Image.fromarray(heatmap)

    if save_path:
        result.save(save_path)

    return result