// Free, no-API-key drug intelligence sources: RxNorm (NIH) + OpenFDA.
'use strict';

const RXNORM_BASE = 'https://rxnav.nlm.nih.gov/REST';
const OPENFDA_BASE = 'https://api.fda.gov/drug';

// TTY types to show — clean, useful results only
const USEFUL_TTY = new Set(['IN', 'PIN', 'MIN', 'BN', 'SCD', 'SBD', 'SCDG', 'SBDG']);
// TTY friendly labels for the UI
const TTY_LABELS = {
  IN: 'Ingredient', PIN: 'Precise Ingredient', MIN: 'Multi-Ingredient',
  BN: 'Brand Name', SCD: 'Clinical Drug', SBD: 'Branded Drug',
  SCDG: 'Drug Group', SBDG: 'Branded Group'
};

async function searchRxNorm(name) {
  const res = await fetch(`${RXNORM_BASE}/drugs.json?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`RxNorm error ${res.status}`);
  const data = await res.json();
  const groups = data?.drugGroup?.conceptGroup || [];
  const results = [];
  for (const g of groups) {
    for (const c of g.conceptProperties || []) {
      // Skip combo packs (BPCK, GPCK) and pack items — they produce the long bracket text
      if (!USEFUL_TTY.has(c.tty)) continue;
      // Skip names with curly braces (combo pack format "{4 (amox...) / 2 (clari...)}")
      if (c.name.startsWith('{')) continue;
      results.push({
        rxcui: c.rxcui,
        name: c.name,
        synonym: c.synonym || '',
        tty: c.tty,
        ttyLabel: TTY_LABELS[c.tty] || c.tty
      });
    }
  }
  // Priority order: Ingredient first, then Brand, then Clinical Drug
  const priority = ['IN', 'PIN', 'BN', 'MIN', 'SCD', 'SBD', 'SCDG', 'SBDG'];
  results.sort((a, b) => priority.indexOf(a.tty) - priority.indexOf(b.tty));
  return results.slice(0, 15);
}

async function getRxNormDetails(rxcui) {
  const res = await fetch(`${RXNORM_BASE}/rxcui/${rxcui}/allrelated.json`);
  if (!res.ok) throw new Error(`RxNorm details error ${res.status}`);
  return res.json();
}

async function getOpenFdaLabel(genericName) {
  const query = encodeURIComponent(`openfda.generic_name:"${genericName}"`);
  const res = await fetch(`${OPENFDA_BASE}/label.json?search=${query}&limit=1`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`OpenFDA error ${res.status}`);
  }
  const data = await res.json();
  const r = data?.results?.[0];
  if (!r) return null;
  return {
    brandName: r.openfda?.brand_name?.[0],
    genericName: r.openfda?.generic_name?.[0],
    manufacturer: r.openfda?.manufacturer_name?.[0],
    route: r.openfda?.route?.[0],
    substanceName: r.openfda?.substance_name,
    purpose: r.purpose?.[0],
    indicationsAndUsage: r.indications_and_usage?.[0],
    warnings: r.warnings?.[0] || r.warnings_and_cautions?.[0],
    contraindications: r.contraindications?.[0],
    dosageAndAdministration: r.dosage_and_administration?.[0],
    pregnancy: r.pregnancy?.[0],
    pediatricUse: r.pediatric_use?.[0],
    drugInteractions: r.drug_interactions?.[0],
    storageAndHandling: r.storage_and_handling?.[0],
    adverseReactions: r.adverse_reactions?.[0],
    doNotUse: r.do_not_use?.[0],
    askDoctor: r.ask_doctor?.[0]
  };
}

module.exports = { searchRxNorm, getRxNormDetails, getOpenFdaLabel };
