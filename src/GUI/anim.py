"""
anim.py — Micro-animations possibles en tkinter (alpha de fenêtre, ellipse).

Tkinter n'a ni transitions CSS ni GPU : la seule propriété animable sans
redessiner les widgets est l'ALPHA de la fenêtre entière
(attributes("-alpha")). C'est peu, mais bien utilisé (fondu d'apparition,
crossfade entre deux vues) ça suffit à supprimer les "téléportations".

Toutes les fonctions s'appuient sur window.after() : jamais de thread,
jamais de sleep — on reste dans la boucle d'événements de tkinter.
"""


def _ease_out(t: float) -> float:
    """Ease-out cubique : démarre vite, se pose en douceur (t dans [0, 1])."""
    return 1 - (1 - t) ** 3


def fade_in(window, duration_ms: int = 180, then=None):
    """Fait apparaître la fenêtre (alpha 0 → 1) avec un ease-out."""
    _fade(window, 0.0, 1.0, duration_ms, then)


def fade_out(window, duration_ms: int = 120, then=None):
    """Fait disparaître la fenêtre (alpha 1 → 0). `then` : callback à la fin
    (typiquement : reconstruire la vue puis fade_in)."""
    _fade(window, 1.0, 0.0, duration_ms, then)


def _fade(window, start: float, end: float, duration_ms: int, then):
    steps = max(duration_ms // 16, 1)      # ~60 fps

    def step(i=0):
        if not window.winfo_exists():
            return
        t = _ease_out(i / steps)
        window.attributes("-alpha", start + (end - start) * t)
        if i < steps:
            window.after(16, lambda: step(i + 1))
        elif then:
            then()

    window.attributes("-alpha", start)
    step()


class Ellipsis:
    """
    Ellipse animée pour les attentes ("Génération du bilan", ".", "..", "...").
    Indique que le programme travaille, sans spinner ni emoji.

        dots = Ellipsis(label, "Génération du bilan personnalisé")
        dots.start()
        ...quand la réponse arrive :
        dots.stop()
    """

    def __init__(self, label, base_text: str, period_ms: int = 400):
        self._label = label          # CTkLabel ou CTkTextbox-setter, voir set()
        self._base = base_text
        self._period = period_ms
        self._running = False
        self._count = 0

    def start(self):
        self._running = True
        self._tick()

    def stop(self):
        self._running = False

    def _tick(self):
        if not self._running or not self._label.winfo_exists():
            return
        self._count = (self._count % 3) + 1
        self._label.configure(text=self._base + "." * self._count)
        self._label.after(self._period, self._tick)
