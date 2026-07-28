"""
anim.py — Micro-animations possibles en tkinter (alpha, couleurs, ellipse).

Tkinter n'a ni transitions CSS ni GPU. Ce qui reste animable proprement :
  - l'ALPHA de la fenêtre entière (fondu, crossfade entre vues) ;
  - les COULEURS des widgets (interpolation hex par pas de ~16 ms) —
    assez pour des transitions d'état (vert↔rouge), un hover qui glisse
    au lieu de claquer, et un flash d'attention qui s'éteint.

Toutes les fonctions s'appuient sur widget.after() : jamais de thread,
jamais de sleep — on reste dans la boucle d'événements de tkinter.
Chaque tween mémorise son after-id sur le widget : relancer une animation
sur la même propriété ANNULE la précédente (pas de course de couleurs).
"""


def _ease_out(t: float) -> float:
    """Ease-out cubique : démarre vite, se pose en douceur (t dans [0, 1])."""
    return 1 - (1 - t) ** 3


# --------------------------------------------------------------------------- #
# Interpolation de couleurs
# --------------------------------------------------------------------------- #

def _hex_to_rgb(color: str) -> tuple:
    h = color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _blend(start: str, end: str, t: float) -> str:
    """Couleur intermédiaire entre deux hex '#RRGGBB' (t dans [0, 1])."""
    a, b = _hex_to_rgb(start), _hex_to_rgb(end)
    return "#%02x%02x%02x" % tuple(
        round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def tween_color(widget, option: str, start: str, end: str,
                duration_ms: int = 220):
    """Fait glisser `option` (ex. "text_color", "fg_color") de `start` vers
    `end` avec un ease-out. Relancer sur la même option annule le tween en
    cours : la dernière intention gagne, pas la première lancée."""
    key = f"_tween_{option}"
    pending = getattr(widget, key, None)
    if pending is not None:
        widget.after_cancel(pending)
        setattr(widget, key, None)

    steps = max(duration_ms // 16, 1)

    def step(i=0):
        if not widget.winfo_exists():
            return
        widget.configure(**{option: _blend(start, end, _ease_out(i / steps))})
        if i < steps:
            setattr(widget, key, widget.after(16, lambda: step(i + 1)))
        else:
            setattr(widget, key, None)

    step()


def smooth_hover(button, base: str, hover: str, duration_ms: int = 150):
    """Survol qui GLISSE vers la teinte hover au lieu de claquer.
    On neutralise le swap instantané de customtkinter (hover_color = base)
    et on anime fg_color sur Enter/Leave. CTkButton n'autorise que des
    bindings CUMULATIFS (add='+') : on ne binde qu'une fois, les teintes
    vivent dans un dict porté par le bouton — ré-appeler après un changement
    de couleurs met simplement ce dict à jour."""
    button.configure(hover_color=base)
    if getattr(button, "_smooth_hover", None) is not None:
        button._smooth_hover.update(base=base, hover=hover)
        return
    button._smooth_hover = {"base": base, "hover": hover}
    colors = button._smooth_hover
    button.bind("<Enter>",
                lambda _e: tween_color(button, "fg_color", colors["base"],
                                       colors["hover"], duration_ms), add="+")
    button.bind("<Leave>",
                lambda _e: tween_color(button, "fg_color", colors["hover"],
                                       colors["base"], duration_ms), add="+")


def flash(widget, option: str, peak: str, rest: str, duration_ms: int = 600):
    """Flash d'attention : saute à `peak` puis s'éteint vers `rest`.
    Signale « ce contenu vient de changer » sans clignotement répété."""
    tween_color(widget, option, peak, rest, duration_ms)


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


class WaitingDots:
    """
    Ellipse animée pour les attentes ("Génération du bilan", ".", "..", "...").
    Indique que le programme travaille, sans spinner ni emoji.
    (Nommée WaitingDots pour ne pas masquer le builtin Python `Ellipsis`.)

        dots = WaitingDots(label, "Génération du bilan personnalisé")
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
