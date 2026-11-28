/*
 * Toast « action terminée » commun à tous les modules du CHU (27/11/2026).
 * Après chaque requête d'écriture réussie (POST, PUT, PATCH, DELETE) vers les
 * services du CHU, un court message confirme l'action — sauf si la page a déjà
 * affiché sa propre confirmation, ou s'il s'agit d'une action technique
 * (lecture de notification, messagerie, brouillon, sauvegarde automatique...).
 */
(function () {
  if (typeof window === 'undefined' || window.__chuToast) return;
  window.__chuToast = true;

  // Bouton désactivé = toujours VISIBLEMENT inactif (28/11/2026) : certains
  // gardaient leurs couleurs vives et semblaient cliquables alors qu'ils ne
  // faisaient rien.
  try {
    var st = document.createElement('style');
    st.id = 'chu-boutons-inactifs';
    st.textContent =
      'button:disabled,button[aria-disabled="true"],[role="button"][aria-disabled="true"]{' +
      'cursor:not-allowed!important;opacity:.5!important;filter:grayscale(.6)!important;box-shadow:none!important;transform:none!important}';
    (document.head || document.documentElement).appendChild(st);
  } catch (e) { /* sans effet */ }

  var IGNORES = /notification|messagerie|socket\.io|\/auth\/|login|logout|refresh|token|marquer|consulter|consultee|\/lu\b|\/read|lues|brouillon|draft|heartbeat|presence|\/logs?\b|audit|tracking|\/search|recherche|\/stats|accuser|vu\b|_next|hot-update|sentry/i;
  var dernier = {};

  function libelle(methode) {
    if (methode === 'DELETE') return 'Suppression effectuée';
    if (methode === 'POST') return 'Enregistrement effectué';
    return 'Modifications enregistrées';
  }

  // La page vient-elle d'afficher SA propre confirmation ? Seuls les messages
  // apparus depuis peu comptent : un bandeau permanent (alarme de surveillance,
  // zone « aria-live » du site) ne doit pas faire taire le toast.
  var SEL = '[role="status"],[role="alert"],[data-sonner-toast],.Toastify__toast,[class*="toast" i],[class*="Toast"],[class*="snackbar" i]';
  var dernierMessagePage = 0;
  function estMessage(n) {
    return n && n.nodeType === 1 && n.id !== 'chu-toast' && !(n.closest && n.closest('#chu-toast')) &&
      ((n.matches && n.matches(SEL)) || (n.querySelector && n.querySelector(SEL)));
  }
  function surveiller() {
    try {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          for (var j = 0; j < m.addedNodes.length; j++) {
            if (estMessage(m.addedNodes[j])) { dernierMessagePage = Date.now(); return; }
          }
          var t = m.target && (m.target.nodeType === 1 ? m.target : m.target.parentElement);
          if (t && t.closest && !t.closest('#chu-toast') && t.closest(SEL) && (t.textContent || '').trim()) { dernierMessagePage = Date.now(); return; }
        }
      }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    } catch (e) { /* navigateur ancien : toast toujours affiché */ }
  }
  surveiller();
  function dejaConfirme(depuis) {
    return dernierMessagePage >= depuis - 200;
  }

  function afficher(texte) {
    var boite = document.getElementById('chu-toast');
    if (!boite) {
      boite = document.createElement('div');
      boite.id = 'chu-toast';
      boite.setAttribute('aria-hidden', 'true');
      boite.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);z-index:2147483000;' +
        'display:flex;align-items:center;gap:10px;padding:11px 18px;border-radius:12px;background:#0F5132;color:#fff;' +
        'font:600 14px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.22);' +
        'opacity:0;transition:opacity .2s ease,transform .2s ease;pointer-events:none;max-width:90vw';
      document.body.appendChild(boite);
    }
    boite.innerHTML = '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:#22C55E;align-items:center;justify-content:center;font-size:13px">✓</span><span></span>';
    boite.lastChild.textContent = texte;
    boite.style.opacity = '1';
    boite.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(boite._t);
    boite._t = setTimeout(function () {
      boite.style.opacity = '0';
      boite.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2600);
  }

  function signaler(methode, url, statut) {
    methode = String(methode || 'GET').toUpperCase();
    if (methode === 'GET' || methode === 'HEAD' || methode === 'OPTIONS') return;
    if (!(statut >= 200 && statut < 300)) return;
    var u = String(url || '');
    if (IGNORES.test(u)) return;
    // Même ressource modifiée en rafale (sauvegarde automatique) : un seul toast.
    var cle = methode + ' ' + u.split('?')[0].replace(/[0-9a-f-]{8,}|\d+/gi, '#');
    var maintenant = Date.now();
    if (dernier[cle] && maintenant - dernier[cle] < 8000) { dernier[cle] = maintenant; return; }
    dernier[cle] = maintenant;
    setTimeout(function () {
      if (!dejaConfirme(maintenant)) afficher(libelle(methode));
    }, 450);
  }

  // fetch
  var fetchOrigine = window.fetch;
  if (fetchOrigine) {
    window.fetch = function (entree, options) {
      var methode = (options && options.method) || (entree && entree.method) || 'GET';
      var url = typeof entree === 'string' ? entree : (entree && entree.url) || '';
      return fetchOrigine.apply(this, arguments).then(function (rep) {
        try { signaler(methode, url, rep.status); } catch (e) { /* jamais bloquant */ }
        return rep;
      });
    };
  }

  // XMLHttpRequest (axios)
  var ouvrir = XMLHttpRequest.prototype.open;
  var envoyer = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (methode, url) {
    this.__chu = { m: methode, u: url };
    return ouvrir.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    xhr.addEventListener('loadend', function () {
      try { if (xhr.__chu) signaler(xhr.__chu.m, xhr.__chu.u, xhr.status); } catch (e) { /* jamais bloquant */ }
    });
    return envoyer.apply(this, arguments);
  };
})();

/*
 * En-tête officiel des documents imprimés (28/11/2026), identique dans tous
 * les modules : Ministère de la Santé Publique, nom du CHU et service (lus dans
 * le jeton de connexion, jamais écrits en dur), REPOBLIKAN'I MADAGASIKARA et la
 * devise. Ajouté juste avant l'impression : page imprimée elle-même (zone
 * .zone-impression / .print-area / .imprimable) ou fenêtre ouverte pour
 * imprimer. Rien n'est ajouté si le document porte déjà l'en-tête.
 */
(function () {
  if (typeof window === 'undefined' || window.__chuEntete) return;
  window.__chuEntete = true;

  var jetonBrut = '';
  function lireJeton() {
    var vus = [];
    try { for (var i = 0; i < localStorage.length; i++) vus.push(localStorage.getItem(localStorage.key(i))); } catch (e) {}
    try { for (var j = 0; j < sessionStorage.length; j++) vus.push(sessionStorage.getItem(sessionStorage.key(j))); } catch (e) {}
    try { document.cookie.split(';').forEach(function (c) { vus.push(decodeURIComponent(c.split('=').slice(1).join('='))); }); } catch (e) {}
    for (var k = 0; k < vus.length; k++) {
      var m = String(vus[k] || '').match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
      if (!m) continue;
      try {
        var b = m[0].split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        var p = JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4)))));
        if (p && Array.isArray(p.services) && p.services.length) { jetonBrut = m[0]; return p; }
      } catch (e) {}
    }
    return null;
  }

  function infos() {
    var p = lireJeton();
    var s = (p && p.services && p.services[0]) || {};
    var chu = s.chu || {};
    return { chu: chu.name || '', logo: chu.logoUrl || chu.logo || '', service: s.serviceName || '' };
  }

  // Logo du CHU : son adresse exige le jeton, qu'une simple image n'envoie pas.
  // Chargé une fois avec le jeton et gardé prêt pour l'impression.
  var logoPret = '';
  var logoEnCours = false;
  function prechargerLogo() {
    if (logoPret || logoEnCours) return;
    var i = infos();
    if (!i.logo || !jetonBrut || typeof fetch !== 'function') return;
    logoEnCours = true;
    fetch(i.logo, { headers: { Authorization: 'Bearer ' + jetonBrut } })
      .then(function (r) { return r.ok ? r.blob() : null; })
      .then(function (b) {
        if (!b) return;
        var fr = new FileReader();
        fr.onload = function () { logoPret = String(fr.result || ''); };
        fr.readAsDataURL(b);
      })
      .catch(function () {})
      .then(function () { logoEnCours = false; });
  }
  setTimeout(prechargerLogo, 3000);
  document.addEventListener('click', prechargerLogo, { once: true, capture: true });

  function esc(t) {
    return String(t || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function html() {
    var i = infos();
    var trait = '<div style="width:60px;border-top:1px solid #000;margin:3px auto"></div>';
    return '' +
      '<div data-chu-entete style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;' +
      'font-family:\'Times New Roman\',Times,serif;color:#000;margin:0 0 14px;padding-bottom:8px;border-bottom:1.5px solid #000">' +
      '<div style="display:flex;align-items:center;gap:10px;min-width:0">' +
      (logoPret ? '<img src="' + logoPret + '" alt="" style="width:58px;height:58px;object-fit:contain"/>' : '') +
      '<div style="text-align:center;font-size:11px;line-height:1.35;text-transform:uppercase">' +
      '<div style="font-weight:bold">Ministère de la Santé Publique</div>' + trait +
      (i.chu ? '<div style="font-weight:bold">' + esc(i.chu) + '</div>' + trait : '') +
      (i.service ? '<div>Service : ' + esc(i.service) + '</div>' : '') +
      '</div></div>' +
      '<div style="text-align:center;font-size:11px;line-height:1.35">' +
      '<div style="font-weight:bold;letter-spacing:.5px">REPOBLIKAN\'I MADAGASIKARA</div>' +
      '<div style="font-style:italic">Fitiavana – Tanindrazana – Fandrosoana</div>' + trait +
      '</div></div>';
  }

  function dejaEntete(racine) {
    return /REPOBLIKAN.?I MADAGASIKARA/i.test((racine && racine.textContent) || '') || !!(racine && racine.querySelector && racine.querySelector('[data-chu-entete]'));
  }

  // 1. Page imprimée elle-même
  var ajoute = null;
  window.addEventListener('beforeprint', function () {
    try {
      var zones = document.querySelectorAll('.zone-impression, .print-area, .imprimable');
      var cible = null;
      for (var z = 0; z < zones.length; z++) {
        var r = zones[z].getBoundingClientRect();
        if (r.width > 0 && r.height > 0) { cible = zones[z]; break; }
      }
      cible = cible || document.body;
      if (dejaEntete(cible)) return;
      var d = document.createElement('div');
      d.innerHTML = html();
      ajoute = d.firstChild;
      cible.insertBefore(ajoute, cible.firstChild);
    } catch (e) {}
  });
  window.addEventListener('afterprint', function () {
    try { if (ajoute && ajoute.parentNode) ajoute.parentNode.removeChild(ajoute); } catch (e) {}
    ajoute = null;
  });

  // 2. Fenêtre ouverte pour imprimer
  var ouvrirOrigine = window.open;
  if (ouvrirOrigine) {
    window.open = function () {
      var w = ouvrirOrigine.apply(this, arguments);
      try {
        if (w && typeof w.print === 'function') {
          var imprimerOrigine = w.print;
          w.print = function () {
            try {
              var b = w.document && w.document.body;
              if (b && !dejaEntete(b)) b.insertAdjacentHTML('afterbegin', html());
            } catch (e) {}
            return imprimerOrigine.apply(w, arguments);
          };
        }
      } catch (e) {}
      return w;
    };
  }
})();
