/* AB MÉMO VISITE — module IA V3.2.0

À ajouter au projet Google Apps Script existant.
Dans doPost(e), ajouter dans le switch :

case 'generateReportAI':
  result = generateReportAI_(body);
  break;

Puis créer dans Apps Script > Paramètres du projet > Propriétés du script :
OPENAI_API_KEY = votre clé API
OPENAI_MODEL = gpt-5   (optionnel ; gpt-5 par défaut)

La clé ne doit jamais être placée dans GitHub ou dans index.html.
*/

function generateReportAI_(data) {
  const idRdv = data.idRdv;
  if (!idRdv) throw new Error('ID_RDV manquant.');

  const dossier = getRdvData_(idRdv);
  if (!dossier || !dossier.rdv) throw new Error('RDV introuvable : ' + idRdv);

  const payload = {
    rdv: dossier.rdv,
    transcription: dossier.transcription || [],
    metres: dossier.metres || [],
    photos: (dossier.photos || []).map(function(p) {
      return {
        Piece: p.Piece || '',
        Description_Vocale: p.Description_Vocale || '',
        Description_IA: p.Description_IA || '',
        URL_Photo: p.URL_Photo || ''
      };
    }),
    points: dossier.points || []
  };

  const prompt = [
    'Tu rédiges un compte-rendu professionnel de visite travaux pour AB RENOV 35.',
    'Le document doit aider un conducteur de travaux à préparer un devis.',
    '',
    'RÈGLES IMPÉRATIVES :',
    '- Ne jamais inventer une dimension, un équipement, une prestation ou une demande.',
    '- Corriger la grammaire et reformuler la dictée brute en français professionnel.',
    '- Conserver les noms complets des pièces : Chambre 1, Chambre bébé, Salle de bains étage, etc.',
    '- Associer chaque métré à sa pièce et à son ouvrage.',
    '- Associer les commentaires photos à la bonne pièce.',
    '- Signaler explicitement les informations ambiguës dans POINTS À CONFIRMER.',
    '- Ne pas transformer une hypothèse en fait.',
    '',
    'STRUCTURE DU RAPPORT :',
    '1. SYNTHÈSE DU PROJET',
    '2. DÉTAIL PIÈCE PAR PIÈCE',
    '   Pour chaque pièce : état/constats, travaux demandés, métrés, éléments techniques, photos/commentaires, points à confirmer.',
    '3. SYNTHÈSE PAR LOT POUR CHIFFRAGE',
    '   Dépose/Démolition ; Plâtrerie/Isolation ; Électricité ; Plomberie/Sanitaires ; Menuiserie ; Sols/Revêtements ; Peinture/Finitions ; Cuisine ; Autres.',
    '4. POINTS À CONFIRMER AVANT DEVIS',
    '5. ACTIONS AB RENOV À PRÉVOIR',
    '',
    'Le style doit être clair, concis, technique et exploitable. Évite les répétitions.',
    '',
    'DONNÉES DU RENDEZ-VOUS :',
    JSON.stringify(payload)
  ].join('\n');

  const rapport = callOpenAIReport_(prompt);

  saveReport_({
    idRdv: idRdv,
    version: '3.2.0',
    resumeProjet: rapport.substring(0, 4000),
    rapportComplet: rapport,
    compteRenduClient: rapport,
    actionsAbRenov: '',
    pointsTechniques: '',
    metresSynthese: ''
  });

  return {
    ok: true,
    idRdv: idRdv,
    rapportComplet: rapport
  };
}

function callOpenAIReport_(inputText) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('OPENAI_API_KEY');
  const model = props.getProperty('OPENAI_MODEL') || 'gpt-5';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY absente des propriétés du script.');
  }

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + apiKey
    },
    payload: JSON.stringify({
      model: model,
      input: inputText
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const raw = response.getContentText();
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new Error('Réponse OpenAI illisible (' + code + ').');
  }

  if (code < 200 || code >= 300) {
    const msg = json && json.error && json.error.message ? json.error.message : raw;
    throw new Error('OpenAI : ' + msg);
  }

  const text = extractOpenAIOutputText_(json);
  if (!text) throw new Error('OpenAI n’a retourné aucun texte exploitable.');
  return text.trim();
}

function extractOpenAIOutputText_(response) {
  if (response.output_text) return response.output_text;
  const out = response.output || [];
  const chunks = [];
  out.forEach(function(item) {
    (item.content || []).forEach(function(c) {
      if (c.text) chunks.push(c.text);
    });
  });
  return chunks.join('\n');
}
