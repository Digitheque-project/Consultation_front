// Flux SSE lu avec fetch : la passerelle exige le jeton dans l'en-tête
// Authorization, ce qu'EventSource ne sait pas envoyer (d'où les 401).
// Reconnexion automatique après une coupure, comme EventSource.

function jetonStocke(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("auth_token") || localStorage.getItem("access_token") || null;
  } catch {
    return null;
  }
}

/** Écoute un flux SSE ; `onMessage` reçoit le contenu de chaque événement. Renvoie la fonction d'arrêt. */
export function ecouterFlux(url: string, onMessage: (donnees: string) => void): () => void {
  let arrete = false;
  let controleur: AbortController | null = null;
  let minuterie: ReturnType<typeof setTimeout> | null = null;

  const relancer = (delai: number) => {
    if (arrete) return;
    minuterie = setTimeout(() => void lire(), delai);
  };

  const lire = async () => {
    const jeton = jetonStocke();
    if (!jeton) return relancer(15_000);
    controleur = new AbortController();
    try {
      const res = await fetch(url, {
        headers: { Accept: "text/event-stream", Authorization: `Bearer ${jeton}` },
        signal: controleur.signal,
        cache: "no-store",
      });
      if (!res.ok || !res.body) return relancer(30_000);
      const lecteur = res.body.getReader();
      const decodeur = new TextDecoder();
      let tampon = "";
      for (;;) {
        const { value, done } = await lecteur.read();
        if (done) break;
        tampon += decodeur.decode(value, { stream: true });
        let fin: number;
        while ((fin = tampon.search(/\r?\n\r?\n/)) >= 0) {
          const bloc = tampon.slice(0, fin);
          tampon = tampon.slice(fin).replace(/^\r?\n\r?\n/, "");
          const donnees = bloc
            .split(/\r?\n/)
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trimStart())
            .join("\n");
          if (donnees) onMessage(donnees);
        }
      }
      relancer(3_000);
    } catch {
      relancer(10_000);
    }
  };

  void lire();
  return () => {
    arrete = true;
    controleur?.abort();
    if (minuterie) clearTimeout(minuterie);
  };
}
