'use client';

interface PatientHeaderProps {
  nom: string;
  prenom: string;
  id: string;
  groupeSanguin: string;
  age: number;
  sexe: string;
  chambre: string;
  lit: string;
  allergies?: string;
  categorie?: string;
}

export function PatientHeader({
  nom, prenom, id, groupeSanguin, age, sexe, chambre, lit,
  allergies = 'Pénicilline',
  categorie = 'BANQUE',
}: PatientHeaderProps) {
  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Gauche : avatar + infos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', overflow: 'hidden', flexShrink: 0 }}>
          👤
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            {sexe === 'M' ? 'M.' : 'Mme.'} {prenom} {nom}
          </h2>
          <div style={{ marginTop: '6px' }}>
            <span style={{ backgroundColor: '#1e293b', color: 'white', fontSize: '11px', padding: '2px 10px', borderRadius: '4px', fontFamily: 'monospace' }}>
              ID: #{id}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '32px', marginTop: '10px' }}>
            <div>
              <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Groupe sanguin</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', margin: 0 }}>{groupeSanguin}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Âge / Sexe</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', margin: 0 }}>{age} ans / {sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Chambre</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', margin: 0 }}>{chambre} – {lit}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Droite : allergies + catégorie */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        {allergies && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 500 }}>
            ⚠ ALLERGIES : {allergies}
          </div>
        )}
        <span style={{ backgroundColor: '#05668D', color: 'white', fontSize: '12px', fontWeight: 700, padding: '6px 20px', borderRadius: '4px' }}>
          {categorie}
        </span>
      </div>
    </div>
  );
}
