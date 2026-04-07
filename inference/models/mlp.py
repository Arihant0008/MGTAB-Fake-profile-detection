"""
MLP Classifier for MGTAB Bot Detection (V1 — Feature-Only).

Architecture: 788 → 256 → 128 → 2
- 788 input dims = 20 property features + 768 LaBSE tweet embedding
- 2 output classes = [human, bot]
- Dropout + BatchNorm for regularization
- Designed to match the hidden dimensions of the RGCN model for Phase 2 continuity

This model is intentionally simple: it ignores graph structure and only uses
the concatenated feature vector. Phase 2 will replace this with the full RGCN
that leverages the social graph topology via message passing.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class MLPClassifier(nn.Module):
    """
    3-layer MLP with BatchNorm and Dropout for bot detection.
    
    Input:  [batch_size, 788]  (20 property + 768 LaBSE)
    Output: [batch_size, 2]    (logits for [human, bot])
    """

    def __init__(
        self,
        input_dim: int = 788,
        hidden1: int = 256,
        hidden2: int = 128,
        num_classes: int = 2,
        dropout: float = 0.3,
    ) -> None:
        super().__init__()

        self.layer1 = nn.Sequential(
            nn.Linear(input_dim, hidden1),
            nn.BatchNorm1d(hidden1),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
        )

        self.layer2 = nn.Sequential(
            nn.Linear(hidden1, hidden2),
            nn.BatchNorm1d(hidden2),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
        )

        self.classifier = nn.Linear(hidden2, num_classes)

        # Initialize weights with Kaiming normal for ReLU layers
        self._init_weights()

    def _init_weights(self) -> None:
        """Initialize weights using Kaiming normal (He initialization)."""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.kaiming_normal_(module.weight, nonlinearity="relu")
                if module.bias is not None:
                    nn.init.zeros_(module.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        
        Args:
            x: Feature tensor of shape [batch_size, 788].
            
        Returns:
            Logits tensor of shape [batch_size, 2].
        """
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.classifier(x)
        return x

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """
        Get class probabilities via softmax.
        
        Args:
            x: Feature tensor of shape [batch_size, 788].
            
        Returns:
            Probability tensor of shape [batch_size, 2].
        """
        logits = self.forward(x)
        return F.softmax(logits, dim=1)
