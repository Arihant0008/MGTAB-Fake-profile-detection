"""
LaBSE tweet embedding utilities for MGTAB Detector.

Uses the sentence-transformers library to encode tweet texts into
768-dimensional LaBSE (Language-Agnostic BERT Sentence Embedding) vectors.

The model is lazy-loaded on first use to avoid startup cost when
tweets are not provided. Mean-pooling across multiple tweets produces
a single 768-dim vector representing the user's tweet content.
"""

import logging
import sys
from typing import List, Optional

import numpy as np

logger = logging.getLogger(__name__)

# Lazy-loaded model reference
_labse_model = None


def _load_labse_model():
    """
    Lazy-load the LaBSE model from sentence-transformers.
    Only called when tweets are actually provided.
    """
    global _labse_model
    if _labse_model is not None:
        return _labse_model

    try:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading LaBSE model (first use — this may take a moment)...")
        _labse_model = SentenceTransformer("sentence-transformers/LaBSE")
        logger.info("LaBSE model loaded successfully.")
        return _labse_model
    except ImportError:
        logger.error(
            "sentence-transformers not installed. "
            "Install with: pip install sentence-transformers"
        )
        return None
    except Exception as e:
        logger.error(f"Failed to load LaBSE model: {e}")
        return None


def encode_tweets(
    tweets: List[str],
    embedding_dim: int = 768,
) -> Optional[List[float]]:
    """
    Encode a list of tweets into a single 768-dim embedding via mean pooling.
    
    Process:
    1. Each tweet is encoded independently by LaBSE → [num_tweets, 768]
    2. Mean-pooling across all tweets → [768]
    3. L2-normalize the final vector
    
    Args:
        tweets: List of tweet text strings.
        embedding_dim: Expected embedding dimension (768 for LaBSE).
        
    Returns:
        768-dim embedding as a list of floats, or None on failure.
    """
    if not tweets:
        return None

    # Filter empty strings
    valid_tweets = [t.strip() for t in tweets if t.strip()]
    if not valid_tweets:
        return None

    model = _load_labse_model()
    if model is None:
        logger.warning("LaBSE unavailable — falling back to zero vector.")
        return None

    try:
        # Encode all tweets at once (batch mode)
        embeddings = model.encode(
            valid_tweets,
            batch_size=32,
            show_progress_bar=False,
            normalize_embeddings=True,
        )

        # Mean pool across tweets → single vector
        mean_embedding = np.mean(embeddings, axis=0)

        # L2 normalize the mean vector
        norm = np.linalg.norm(mean_embedding)
        if norm > 0:
            mean_embedding = mean_embedding / norm

        # Verify dimension
        if len(mean_embedding) != embedding_dim:
            logger.error(
                f"Unexpected embedding dim: {len(mean_embedding)} != {embedding_dim}"
            )
            return None

        return mean_embedding.tolist()

    except Exception as e:
        logger.error(f"Tweet encoding failed: {e}")
        return None
