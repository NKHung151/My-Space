from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

DATA = Path("data")
MEAN, STD = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)


def get_device():
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def make_transforms(size):
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(size, scale=(0.6, 1.0), ratio=(0.8, 1.25)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(0.2, 0.2, 0.2),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])
    eval_tf = transforms.Compose([
        transforms.Resize((size, size)),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])
    return train_tf, eval_tf


def get_loader(split, size, batch, train=False, workers=2):
    train_tf, eval_tf = make_transforms(size)
    ds = datasets.ImageFolder(DATA / split, transform=train_tf if train else eval_tf)
    return DataLoader(ds, batch_size=batch, shuffle=train, num_workers=workers,
                      pin_memory=True, persistent_workers=workers > 0)


class SmallCNN(nn.Module):
    def __init__(self, n_classes=2, dropout=0.3):
        super().__init__()

        def block(i, o):
            return nn.Sequential(nn.Conv2d(i, o, 3, padding=1, bias=False),
                                 nn.BatchNorm2d(o), nn.ReLU(inplace=True), nn.MaxPool2d(2))

        self.features = nn.Sequential(block(3, 32), block(32, 64), block(64, 128), block(128, 256))
        self.head = nn.Sequential(nn.AdaptiveAvgPool2d(1), nn.Flatten(),
                                  nn.Dropout(dropout), nn.Linear(256, n_classes))

    def forward(self, x):
        return self.head(self.features(x))


def build_model(name, freeze=False, pretrained=True):
    if name == "cnn":
        return SmallCNN()
    if name == "resnet18":
        w = models.ResNet18_Weights.IMAGENET1K_V1 if pretrained else None
        m = models.resnet18(weights=w)
        if freeze:
            for p in m.parameters():
                p.requires_grad = False
        m.fc = nn.Linear(m.fc.in_features, 2)   # lớp mới luôn được huấn luyện
        return m
    raise ValueError(name)


@torch.no_grad()
def run_eval(model, loader, device, criterion=None):
    """Loader phải có shuffle=False để thứ tự khớp loader.dataset.samples."""
    model.eval()
    probs, labels, total = [], [], 0.0
    for x, y in loader:
        x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        with torch.autocast(device_type=device.type, dtype=torch.float16,
                            enabled=device.type == "cuda"):
            logits = model(x)
        logits = logits.float()
        if criterion is not None:
            total += criterion(logits, y).item() * y.size(0)
        probs.append(torch.softmax(logits, 1)[:, 1].cpu())
        labels.append(y.cpu())
    probs, labels = torch.cat(probs).numpy(), torch.cat(labels).numpy()
    acc = float(((probs >= 0.5).astype(int) == labels).mean())
    return total / len(labels), acc, probs, labels