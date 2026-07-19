"""Module analysis : calcul des angles + moteur de recommandations.

Logique pure (NumPy uniquement, ni Qt ni MediaPipe) : chaque fonction est
testable avec pytest sans caméra, et la logique est transposable en C++.
"""

from draft.analysis.geometry import angle_3pt, compute_joint_angles, segment_angle_to_horizontal
from draft.analysis.filters import LandmarkSmoother
from draft.analysis.session import CycleTracker, SessionRecorder
from draft.analysis.thresholds import MODES, MODE_LABELS, Range
from draft.analysis.recommender import Recommendation, evaluate

__all__ = [
    "angle_3pt", "compute_joint_angles", "segment_angle_to_horizontal",
    "LandmarkSmoother", "CycleTracker", "SessionRecorder",
    "MODES", "MODE_LABELS", "Range", "Recommendation", "evaluate",
]
