"""Module pose : capture vidéo + détection des articulations.

Règle d'architecture (portage C++ futur) : ce module ne connaît ni Qt ni
l'interface. Entrées = images NumPy (BGR), sorties = dataclasses pures.
"""

from pose.base import JOINTS, PoseEstimator, PoseFrame
from pose.video import VideoSource

__all__ = ["JOINTS", "PoseEstimator", "PoseFrame", "VideoSource"]
