from setuptools import setup, find_packages

setup(
    name="chestxray_detection",
    version="1.0.0",
    author="Your Name",
    description="Pneumonia detection from Chest X-Rays using Deep Learning (CNN/ViT) with FastAPI",
    packages=find_packages(include=["src", "src.*", "api", "api.*"]),
    python_requires=">=3.9",
    install_requires=[
        "torch>=2.0.0",
        "torchvision>=0.15.0",
        "fastapi>=0.100.0",
        "uvicorn>=0.23.0",
        "timm>=0.9.0",
        "torchcam>=0.4.0",
        "mlflow>=2.5.0",
        "scikit-learn>=1.3.0",
    ],
)