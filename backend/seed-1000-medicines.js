'use strict';
require('./src/models/User');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/medcare360').then(async () => {
  const Medicine = require('./src/models/Medicine');

  // Step 1: Fix missing IDs — find max existing number and increment from there
  const withIds = await Medicine.find({ medicineId: { $ne: null, $exists: true } }, 'medicineId').lean();
  let maxNum = 0;
  for (const m of withIds) {
    const n = parseInt((m.medicineId || '').replace('MED', '')) || 0;
    if (n > maxNum) maxNum = n;
  }

  const toFix = await Medicine.find({ $or: [{ medicineId: null }, { medicineId: { $exists: false } }] });
  let fixed = 0;
  for (const m of toFix) {
    maxNum++;
    m.medicineId = `MED${String(maxNum).padStart(6, '0')}`;
    try { await m.save({ validateBeforeSave: false }); fixed++; } catch (e) { maxNum++; }
  }
  console.log(`Fixed ${fixed} medicines with missing IDs. Max ID now: MED${String(maxNum).padStart(6,'0')}`);

  // Step 2: Generate additional medicines up to 1000 total
  const current = await Medicine.countDocuments();
  if (current >= 1000) { console.log(`Already ${current} medicines. Done.`); mongoose.disconnect(); return; }

  const needed = 1000 - current;
  console.log(`Currently ${current} medicines. Adding ${needed} more...`);

  const categories = ['antibiotic','analgesic','antiviral','antifungal','antihistamine','antihypertensive','antidiabetic','cardiac','respiratory','gastrointestinal','neurological','psychiatric','vitamin_supplement','other'];
  const types = ['tablet','capsule','syrup','injection','cream','drops','inhaler','powder'];
  const manufacturers = ['Cipla','Sun Pharma','Dr. Reddys','Lupin','Zydus','Abbott','Pfizer','GSK','Novartis','Sanofi','Ranbaxy','Alkem','Glenmark','Torrent','Cadila','IPCA','Mankind','Alembic'];

  const drugNames = [
    ['Ranitidine','gastrointestinal','150mg',['GI upset']],
    ['Cimetidine','gastrointestinal','400mg',['Headache']],
    ['Lactulose','gastrointestinal','10g/15mL',['Bloating','Flatulence']],
    ['Bisacodyl','gastrointestinal','5mg',['Abdominal cramps']],
    ['Sucralfate','gastrointestinal','1g',['Constipation']],
    ['Esomeprazole','gastrointestinal','40mg',['Headache','Nausea']],
    ['Rabeprazole','gastrointestinal','20mg',['Diarrhea']],
    ['Mosapride','gastrointestinal','5mg',['Diarrhea']],
    ['Loperamide','gastrointestinal','2mg',['Constipation']],
    ['Norfloxacin','antibiotic','400mg',['Nausea','Rash']],
    ['Ofloxacin','antibiotic','200mg',['GI upset']],
    ['Levofloxacin','antibiotic','500mg',['Tendinitis']],
    ['Moxifloxacin','antibiotic','400mg',['QT prolongation']],
    ['Cephalexin','antibiotic','500mg',['Diarrhea','Rash']],
    ['Cefpodoxime','antibiotic','200mg',['GI upset']],
    ['Cefuroxime','antibiotic','500mg',['Nausea']],
    ['Nitrofurantoin','antibiotic','100mg',['GI upset','Pulmonary reactions']],
    ['Trimethoprim','antibiotic','200mg',['Rash','GI upset']],
    ['Erythromycin','antibiotic','500mg',['GI upset']],
    ['Clarithromycin','antibiotic','500mg',['Metallic taste','GI upset']],
    ['Clindamycin','antibiotic','300mg',['Pseudomembranous colitis']],
    ['Rifampicin','antibiotic','450mg',['Orange urine','Hepatotoxicity']],
    ['Isoniazid','antibiotic','300mg',['Peripheral neuropathy']],
    ['Ethambutol','antibiotic','800mg',['Optic neuritis']],
    ['Pyrazinamide','antibiotic','500mg',['Hyperuricemia','GI upset']],
    ['Acyclovir','antiviral','400mg',['Nausea','Headache']],
    ['Valacyclovir','antiviral','500mg',['Nausea']],
    ['Oseltamivir','antiviral','75mg',['Nausea','Vomiting']],
    ['Hydroxychloroquine','other','200mg',['Retinopathy','GI upset']],
    ['Ivermectin','other','12mg',['Dizziness','Nausea']],
    ['Ketoconazole','antifungal','200mg',['Hepatotoxicity','Nausea']],
    ['Itraconazole','antifungal','100mg',['GI upset','Headache']],
    ['Terbinafine','antifungal','250mg',['GI upset','Rash']],
    ['Nystatin','antifungal','500000IU',['GI upset']],
    ['Naproxen','analgesic','500mg',['GI upset','Dizziness']],
    ['Piroxicam','analgesic','20mg',['GI bleeding']],
    ['Meloxicam','analgesic','15mg',['GI upset']],
    ['Celecoxib','analgesic','200mg',['CV risk','GI upset']],
    ['Etoricoxib','analgesic','90mg',['Hypertension']],
    ['Paracetamol+Caffeine','analgesic','500mg+65mg',['Insomnia']],
    ['Codeine','analgesic','30mg',['Constipation','Dependency']],
    ['Morphine','analgesic','10mg',['Respiratory depression','Dependency']],
    ['Gabapentin','neurological','300mg',['Dizziness','Somnolence']],
    ['Carbamazepine','neurological','200mg',['Stevens-Johnson syndrome','Dizziness']],
    ['Phenytoin','neurological','100mg',['Gingival hyperplasia','Ataxia']],
    ['Valproate','neurological','500mg',['Hepatotoxicity','Weight gain']],
    ['Levetiracetam','neurological','500mg',['Irritability','Somnolence']],
    ['Topiramate','neurological','50mg',['Cognitive slowing','Kidney stones']],
    ['Clonazepam','neurological','0.5mg',['Drowsiness','Dependency']],
    ['Donepezil','neurological','10mg',['GI upset','Insomnia']],
    ['Memantine','neurological','10mg',['Dizziness','Confusion']],
    ['Risperidone','psychiatric','2mg',['EPS','Weight gain']],
    ['Olanzapine','psychiatric','10mg',['Weight gain','Sedation']],
    ['Quetiapine','psychiatric','25mg',['Sedation','Weight gain']],
    ['Haloperidol','psychiatric','5mg',['EPS','Tardive dyskinesia']],
    ['Lithium Carbonate','psychiatric','300mg',['Tremor','Polyuria','Thyroid effects']],
    ['Fluoxetine','psychiatric','20mg',['Nausea','Insomnia']],
    ['Escitalopram','psychiatric','10mg',['Nausea','Sexual dysfunction']],
    ['Paroxetine','psychiatric','20mg',['Weight gain','Withdrawal effects']],
    ['Venlafaxine','psychiatric','75mg',['Hypertension','Nausea']],
    ['Duloxetine','psychiatric','60mg',['Nausea','Dry mouth']],
    ['Mirtazapine','psychiatric','15mg',['Sedation','Weight gain']],
    ['Bupropion','psychiatric','150mg',['Seizures','Insomnia']],
    ['Diazepam','psychiatric','5mg',['Dependency','Sedation']],
    ['Lorazepam','psychiatric','1mg',['Dependency','Amnesia']],
    ['Bisoprolol','antihypertensive','5mg',['Bradycardia','Fatigue']],
    ['Metoprolol','antihypertensive','50mg',['Bradycardia','Fatigue']],
    ['Carvedilol','cardiac','12.5mg',['Dizziness','Hypotension']],
    ['Ramipril','antihypertensive','5mg',['Dry cough','Angioedema']],
    ['Perindopril','antihypertensive','4mg',['Dry cough']],
    ['Valsartan','antihypertensive','80mg',['Dizziness','Hyperkalemia']],
    ['Irbesartan','antihypertensive','150mg',['Dizziness']],
    ['Candesartan','antihypertensive','8mg',['Dizziness','Hyperkalemia']],
    ['Olmesartan','antihypertensive','20mg',['Dizziness']],
    ['Hydrochlorothiazide','antihypertensive','25mg',['Hypokalemia','Hyperuricemia']],
    ['Spironolactone','cardiac','25mg',['Gynecomastia','Hyperkalemia']],
    ['Hydralazine','antihypertensive','25mg',['Lupus-like syndrome','Tachycardia']],
    ['Clonidine','antihypertensive','0.1mg',['Dry mouth','Sedation']],
    ['Prazosin','antihypertensive','1mg',['First-dose hypotension']],
    ['Nitroglycerin','cardiac','0.5mg SL',['Headache','Hypotension']],
    ['Isosorbide Mononitrate','cardiac','20mg',['Headache','Hypotension']],
    ['Ivabradine','cardiac','5mg',['Visual disturbances','Bradycardia']],
    ['Amiodarone','cardiac','200mg',['Thyroid dysfunction','Pulmonary toxicity']],
    ['Warfarin','cardiac','2mg',['Bleeding']],
    ['Rivaroxaban','cardiac','10mg',['Bleeding']],
    ['Dabigatran','cardiac','110mg',['Bleeding','Dyspepsia']],
    ['Apixaban','cardiac','5mg',['Bleeding']],
    ['Heparin','cardiac','5000IU',['Heparin-induced thrombocytopenia']],
    ['Atorvastatin 40mg','cardiac','40mg',['Myopathy']],
    ['Rosuvastatin 20mg','cardiac','20mg',['Myopathy']],
    ['Ezetimibe','cardiac','10mg',['GI upset','Myalgia']],
    ['Fenofibrate','cardiac','145mg',['GI upset','Myopathy']],
    ['Gemfibrozil','cardiac','600mg',['GI upset','Myopathy']],
    ['Allopurinol','other','100mg',['Rash','Gout flare']],
    ['Colchicine','other','0.5mg',['GI upset','Myopathy']],
    ['Prednisolone','other','10mg',['Hyperglycemia','Immunosuppression']],
    ['Methylprednisolone','other','4mg',['Hypertension','Insomnia']],
    ['Hydrocortisone','other','10mg',['Hyperglycemia']],
    ['Fexofenadine 180mg','antihistamine','180mg',['Headache']],
    ['Desloratadine','antihistamine','5mg',['Headache','Dry mouth']],
    ['Loratadine','antihistamine','10mg',['Headache','Dry mouth']],
    ['Diphenhydramine','antihistamine','25mg',['Sedation','Dry mouth']],
    ['Promethazine','antihistamine','25mg',['Sedation']],
    ['Hydroxyzine','antihistamine','25mg',['Sedation','Dry mouth']],
    ['Montelukast 5mg','respiratory','5mg',['Headache']],
    ['Theophylline 400mg SR','respiratory','400mg',['Palpitations','GI upset']],
    ['Ipratropium','respiratory','20mcg',['Dry mouth','Constipation']],
    ['Tiotropium','respiratory','18mcg',['Dry mouth','Constipation']],
    ['Formoterol','respiratory','12mcg',['Tachycardia','Tremor']],
    ['Salmeterol','respiratory','50mcg',['Tachycardia','Tremor']],
    ['Beclomethasone','respiratory','100mcg',['Oral candidiasis']],
    ['Fluticasone','respiratory','250mcg',['Oral candidiasis']],
    ['N-Acetylcysteine','respiratory','600mg',['GI upset']],
    ['Bromhexine','respiratory','8mg',['GI upset']],
    ['Ambroxol','respiratory','30mg',['GI upset']],
    ['Guaifenesin','respiratory','200mg',['GI upset']],
    ['Dextromethorphan','respiratory','10mg',['Dizziness','GI upset']],
    ['Vitamin B1 Thiamine','vitamin_supplement','100mg',['Rare']],
    ['Vitamin B6 Pyridoxine','vitamin_supplement','40mg',['Peripheral neuropathy high dose']],
    ['Folic Acid','vitamin_supplement','5mg',['Rare']],
    ['Vitamin C','vitamin_supplement','500mg',['GI upset high doses']],
    ['Vitamin E','vitamin_supplement','400IU',['Bleeding risk high doses']],
    ['Zinc Sulfate','vitamin_supplement','20mg',['GI upset']],
    ['Magnesium','vitamin_supplement','250mg',['Diarrhea']],
    ['Omega 3 Fish Oil','vitamin_supplement','1000mg',['Fishy taste']],
    ['Glucosamine','vitamin_supplement','500mg',['GI upset']],
    ['Pioglitazone','antidiabetic','15mg',['Edema','Weight gain','Bladder cancer risk']],
    ['Empagliflozin','antidiabetic','10mg',['UTI','DKA risk']],
    ['Dapagliflozin','antidiabetic','10mg',['UTI','Genital infections']],
    ['Canagliflozin','antidiabetic','100mg',['UTI','Amputations risk']],
    ['Liraglutide','antidiabetic','1.2mg',['GI upset','Pancreatitis']],
    ['Vildagliptin','antidiabetic','50mg',['Nasopharyngitis','Hypoglycemia']],
    ['Saxagliptin','antidiabetic','5mg',['Nasopharyngitis']],
    ['Linagliptin','antidiabetic','5mg',['Nasopharyngitis']],
    ['Acarbose','antidiabetic','50mg',['Flatulence','Diarrhea']],
    ['NPH Insulin','antidiabetic','100IU/mL',['Hypoglycemia']],
    ['Insulin Glargine','antidiabetic','100IU/mL',['Hypoglycemia','Injection site reactions']],
    ['Insulin Aspart','antidiabetic','100IU/mL',['Hypoglycemia']],
    ['Diltiazem','cardiac','60mg',['Bradycardia','Edema']],
    ['Verapamil','cardiac','80mg',['Constipation','Bradycardia']],
    ['Nifedipine','antihypertensive','10mg',['Tachycardia','Headache']],
    ['Felodipine','antihypertensive','5mg',['Ankle edema','Headache']],
    ['Lacidipine','antihypertensive','4mg',['Headache','Edema']],
    ['Adenosine','cardiac','6mg',['Chest tightness','Flushing']],
    ['Atenolol 100mg','antihypertensive','100mg',['Bradycardia','Fatigue']],
    ['Levothyroxine 25mcg','other','25mcg',['Palpitations']],
    ['Levothyroxine 75mcg','other','75mcg',['Palpitations','Tremor']],
    ['Propylthiouracil','other','100mg',['Agranulocytosis','Hepatotoxicity']],
    ['Carbimazole','other','5mg',['Agranulocytosis']],
    ['Senna','gastrointestinal','15mg',['Abdominal cramps']],
    ['Magnesium Hydroxide','gastrointestinal','400mg',['Diarrhea']],
    ['Metoclopramide','gastrointestinal','10mg',['EPS','Tardive dyskinesia']],
    ['Hyoscine','gastrointestinal','20mg',['Dry mouth','Urinary retention']],
    ['Dicyclomine','gastrointestinal','10mg',['Dry mouth','Constipation']],
    ['Simethicone','gastrointestinal','40mg',['Rare']],
    ['Mesalazine','gastrointestinal','400mg',['GI upset','Nephrotoxicity']],
    ['Sulfasalazine','gastrointestinal','500mg',['GI upset','Oligospermia']],
    ['Infliximab','other','100mg/vial',['Immunosuppression','TB reactivation']],
    ['Methotrexate','other','2.5mg',['Hepatotoxicity','Bone marrow suppression']],
    ['Hydroxychloroquine 400mg','other','400mg',['Retinopathy']],
    ['Leflunomide','other','10mg',['Hepatotoxicity','Teratogenicity']],
    ['Calcium Gluconate','other','1g',['Hypercalcemia IV']],
    ['Potassium Chloride','other','600mg',['GI irritation']],
    ['Sodium Bicarbonate','other','650mg',['Metabolic alkalosis']],
    ['Activated Charcoal','other','50g',['Black stools']],
    ['Atropine','cardiac','0.6mg',['Tachycardia','Dry mouth']],
    ['Adrenaline','cardiac','1mg/mL',['Hypertension','Arrhythmia']],
    ['Norepinephrine','cardiac','4mg/mL',['Ischemia','Arrhythmia']],
    ['Dopamine','cardiac','200mg/5mL',['Tachycardia','Arrhythmia']],
    ['Dobutamine','cardiac','250mg/5mL',['Tachycardia','GI upset']],
    ['Sodium Chloride 0.9%','other','500mL',['Fluid overload']],
    ['Dextrose 5%','other','500mL',['Hyperglycemia']],
    ['Ringer Lactate','other','500mL',['Fluid overload']],
    ['Meropenem','antibiotic','1g',['GI upset','Seizures']],
    ['Imipenem','antibiotic','500mg',['Seizures','GI upset']],
    ['Piperacillin-Tazobactam','antibiotic','4.5g',['GI upset','Rash']],
    ['Vancomycin','antibiotic','500mg',['Red man syndrome','Nephrotoxicity']],
    ['Linezolid','antibiotic','600mg',['Thrombocytopenia','Serotonin syndrome']],
    ['Colistin','antibiotic','150mg',['Nephrotoxicity','Neurotoxicity']],
    ['Tigecycline','antibiotic','50mg',['GI upset']],
    ['Ganciclovir','antiviral','250mg',['Bone marrow suppression']],
    ['Lopinavir+Ritonavir','antiviral','200+50mg',['GI upset','Hyperlipidemia']],
    ['Tenofovir','antiviral','300mg',['Nephrotoxicity','Bone loss']],
    ['Lamivudine','antiviral','150mg',['GI upset']],
    ['Nevirapine','antiviral','200mg',['Hepatotoxicity','Rash']],
    ['Paracetamol Syrup 120mg/5mL','analgesic','120mg/5mL',['Hepatotoxicity overdose']],
    ['Ibuprofen Syrup 100mg/5mL','analgesic','100mg/5mL',['GI upset']],
    ['Amoxicillin Syrup 125mg/5mL','antibiotic','125mg/5mL',['Diarrhea','Rash']],
    ['Cetirizine Syrup 5mg/5mL','antihistamine','5mg/5mL',['Drowsiness']],
    ['Azithromycin Syrup 200mg/5mL','antibiotic','200mg/5mL',['GI upset']],
    ['Metronidazole Syrup 200mg/5mL','antibiotic','200mg/5mL',['Metallic taste']],
    ['ORS Sachet','other','21.8g',['Rare']],
    ['Zinc Syrup 10mg/5mL','vitamin_supplement','10mg/5mL',['GI upset']],
    ['Vitamin D Drops 400IU','vitamin_supplement','400IU',['Hypercalcemia overdose']],
    ['Iron Syrup 50mg/5mL','vitamin_supplement','50mg/5mL',['Black stools','Constipation']],
  ];

  let added = 0;
  let idx = 0;
  // use maxNum from Step 1 to generate sequential IDs without relying on countDocuments
  while (added < needed && idx < drugNames.length * 5) {
    const drug = drugNames[idx % drugNames.length];
    const mfr = manufacturers[idx % manufacturers.length];
    const cat = categories.includes(drug[1]) ? drug[1] : 'other';
    const typeIdx = Math.floor(idx / drugNames.length);
    const suffix = typeIdx === 0 ? '' : typeIdx === 1 ? ' SR' : typeIdx === 2 ? ' Forte' : typeIdx === 3 ? ' ER' : ' XL';
    const qty = 100 + (idx % 500) * 4;
    const minQ = Math.floor(qty * 0.1);
    const pp = 5 + (idx % 40);
    const sp = pp + Math.floor(pp * 0.4);
    maxNum++;
    try {
      await Medicine.create({
        medicineId: `MED${String(maxNum).padStart(6, '0')}`,
        name: `${drug[0]}${suffix}`,
        genericName: drug[0].split('+')[0].trim(),
        brand: mfr.substring(0,4) + drug[0].split(' ')[0].substring(0,4),
        category: cat,
        type: ['tablet','capsule','tablet','tablet','capsule'][idx % 5],
        manufacturer: mfr,
        batchNumber: `BX${String(maxNum).padStart(4,'0')}`,
        expiryDate: new Date(`202${7 + (idx % 2)}-${String((idx % 12) + 1).padStart(2,'0')}-01`),
        quantity: qty,
        minStockLevel: minQ,
        purchasePrice: pp,
        sellingPrice: sp,
        dosageInstructions: 'As directed by physician',
        sideEffects: drug[3] || [],
        contraindications: [],
        requiresPrescription: true,
        isActive: true
      });
      added++;
    } catch (e) { /* skip dupes — increment maxNum already done */ }
    idx++;
  }

  const total = await Medicine.countDocuments();
  console.log(`Added ${added} medicines. Total: ${total}`);
  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
