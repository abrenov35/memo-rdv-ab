/* AB MÉMO VISITE — module IA V3.3

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

  const instructions = [
    'Tu es l’assistant technique d’un conducteur de travaux AB RENOV 35.',
    'Ta mission n’est PAS de résumer rapidement : tu dois RELIRE, CORRIGER, REFORMULER et STRUCTURER une visite chantier afin de préparer un devis fiable.',
    '',
    'PRIORITÉ 1 — FIDÉLITÉ :',
    '- Ne jamais inventer de quantité, dimension, matériau, équipement, prestation ou demande client.',
    '- Ne jamais supprimer une information technique utile présente dans la dictée.',
    '- Conserver les noms complets des pièces et zones : Chambre 1, Chambre bébé, Mur côté fenêtre, etc.',
    '- Conserver toutes les dimensions exactement telles qu’elles figurent dans les métrés validés.',
    '- Si une phrase est ambiguë, la reformuler prudemment et la placer aussi dans points_a_confirmer.',
    '',
    'PRIORITÉ 2 — RELECTURE / RÉDACTION :',
    '- Corriger les erreurs de reconnaissance vocale évidentes quand le contexte bâtiment permet de les résoudre sans doute raisonnable.',
    '- Supprimer les hésitations, répétitions, mots parasites et ruptures de phrase.',
    '- Transformer la dictée orale en français professionnel de conducteur de travaux.',
    '- Regrouper les informations répétées sans en perdre le contenu.',
    '- Utiliser des formulations exploitables dans un devis : « Dépose de… », « Fourniture et pose… » uniquement si la fourniture ET la pose sont réellement demandées ; sinon rester neutre « Prévoir… ».',
    '',
    'PRIORITÉ 3 — PRÉPARATION DU DEVIS :',
    '- Pour chaque pièce, distinguer : état/constats, demandes/travaux, métrés validés, éléments techniques, photos/commentaires, points à confirmer.',
    '- Construire ensuite une synthèse PAR LOT : Dépose/Démolition, Plâtrerie/Isolation, Électricité, Plomberie/Sanitaires, Menuiserie, Sols/Revêtements, Carrelage/Faïence, Peinture/Finitions, Cuisine/Agencement, Chauffage/Ventilation, Autres.',
    '- Dans chaque lot, rédiger des lignes courtes de prestations à chiffrer, avec pièce et métrés lorsqu’ils sont disponibles.',
    '- Ne jamais ajouter de prix.',
    '',
    'STYLE : technique, précis, lisible, sans jargon inutile, sans phrases creuses.',
    'Le résultat doit permettre à un métreur/conducteur de préparer le devis sans devoir relire toute la transcription brute.'
  ].join('\n');

  const report = callOpenAIReportStructured_(instructions, payload);
  const rapportTexte = reportToPlainText_(report);

  saveReport_({
    idRdv: idRdv,
    version: '3.3.0',
    resumeProjet: report.synthese_projet || '',
    rapportComplet: rapportTexte,
    compteRenduClient: rapportTexte,
    actionsAbRenov: (report.actions_ab_renov || []).join('\n'),
    pointsTechniques: (report.points_a_confirmer || []).join('\n'),
    metresSynthese: (report.synthese_lots || []).map(function(l){
      return l.lot + ' : ' + (l.prestations || []).join(' | ');
    }).join('\n')
  });

  return {
    ok: true,
    idRdv: idRdv,
    report: report,
    rapportComplet: rapportTexte
  };
}

function callOpenAIReportStructured_(instructions, payloadData) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('OPENAI_API_KEY');
  const model = props.getProperty('OPENAI_MODEL') || 'gpt-5';

  if (!apiKey) throw new Error('OPENAI_API_KEY absente des propriétés du script.');

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      synthese_projet: { type: 'string' },
      pieces: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            nom: { type: 'string' },
            constats: { type: 'array', items: { type: 'string' } },
            travaux: { type: 'array', items: { type: 'string' } },
            metres: { type: 'array', items: { type: 'string' } },
            technique: { type: 'array', items: { type: 'string' } },
            photos: { type: 'array', items: { type: 'string' } },
            points_a_confirmer: { type: 'array', items: { type: 'string' } }
          },
          required: ['nom','constats','travaux','metres','technique','photos','points_a_confirmer']
        }
      },
      synthese_lots: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            lot: { type: 'string' },
            prestations: { type: 'array', items: { type: 'string' } }
          },
          required: ['lot','prestations']
        }
      },
      points_a_confirmer: { type: 'array', items: { type: 'string' } },
      actions_ab_renov: { type: 'array', items: { type: 'string' } }
    },
    required: ['synthese_projet','pieces','synthese_lots','points_a_confirmer','actions_ab_renov']
  };

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + apiKey },
    payload: JSON.stringify({
      model: model,
      instructions: instructions,
      input: 'DONNÉES BRUTES DE LA VISITE :\n' + JSON.stringify(payloadData),
      text: {
        format: {
          type: 'json_schema',
          name: 'ab_renov_visit_report',
          strict: true,
          schema: schema
        }
      }
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const raw = response.getContentText();
  let json;
  try { json = JSON.parse(raw); }
  catch (err) { throw new Error('Réponse OpenAI illisible (' + code + ').'); }

  if (code < 200 || code >= 300) {
    const msg = json && json.error && json.error.message ? json.error.message : raw;
    throw new Error('OpenAI : ' + msg);
  }

  const text = extractOpenAIOutputText_(json);
  if (!text) throw new Error('OpenAI n’a retourné aucun rapport exploitable.');

  try { return JSON.parse(text); }
  catch (err) { throw new Error('Le rapport IA structuré n’est pas un JSON valide.'); }
}

function reportToPlainText_(r) {
  const out = [];
  out.push('SYNTHÈSE DU PROJET');
  out.push(r.synthese_projet || '');

  (r.pieces || []).forEach(function(p) {
    out.push('');
    out.push(String(p.nom || 'ZONE').toUpperCase());
    if ((p.constats || []).length) { out.push('Constats'); (p.constats || []).forEach(function(x){out.push('- ' + x);}); }
    if ((p.travaux || []).length) { out.push('Travaux à prévoir'); (p.travaux || []).forEach(function(x){out.push('- ' + x);}); }
    if ((p.metres || []).length) { out.push('Métrés'); (p.metres || []).forEach(function(x){out.push('- ' + x);}); }
    if ((p.technique || []).length) { out.push('Éléments techniques'); (p.technique || []).forEach(function(x){out.push('- ' + x);}); }
    if ((p.photos || []).length) { out.push('Photos / commentaires'); (p.photos || []).forEach(function(x){out.push('- ' + x);}); }
    if ((p.points_a_confirmer || []).length) { out.push('Points à confirmer'); (p.points_a_confirmer || []).forEach(function(x){out.push('- ' + x);}); }
  });

  out.push('');
  out.push('SYNTHÈSE PAR LOT POUR CHIFFRAGE');
  (r.synthese_lots || []).forEach(function(l) {
    out.push(String(l.lot || 'AUTRES').toUpperCase());
    (l.prestations || []).forEach(function(x){out.push('- ' + x);});
  });

  if ((r.points_a_confirmer || []).length) {
    out.push('');out.push('POINTS À CONFIRMER AVANT DEVIS');
    r.points_a_confirmer.forEach(function(x){out.push('- ' + x);});
  }
  if ((r.actions_ab_renov || []).length) {
    out.push('');out.push('ACTIONS AB RENOV');
    r.actions_ab_renov.forEach(function(x){out.push('- ' + x);});
  }
  return out.join('\n').trim();
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
