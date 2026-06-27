// Realistic data pools used by seed.js to generate volume without inventing fake/placeholder records.
'use strict';

const maleFirstNames = [
  'Rajesh','Arun','Vikram','Sanjay','Anil','Suresh','Ramesh','Rohit','Vivek','Manoj',
  'Deepak','Ashok','Nitin','Pankaj','Rahul','Amit','Sunil','Ajay','Vinod','Praveen',
  'Karan','Gaurav','Sandeep','Naveen','Yogesh','Mahesh','Dinesh','Harish','Raghav','Kunal',
  'Siddharth','Aditya','Varun','Akash','Tarun','Mohit','Saurabh','Ravi','Vishal','Abhishek',
  'Manish','Rakesh','Sachin','Ankit','Shyam','Girish','Hemant','Jatin','Kiran','Lokesh'
];

const femaleFirstNames = [
  'Priya','Sunita','Kavitha','Anita','Meena','Deepa','Lakshmi','Rekha','Pooja','Neha',
  'Swati','Shalini','Geeta','Radha','Asha','Nisha','Kiran','Manju','Seema','Vandana',
  'Divya','Aparna','Smita','Kalpana','Rachna','Shobha','Usha','Bhavna','Jyoti','Sneha',
  'Preeti','Ritu','Sangeeta','Madhuri','Komal','Anjali','Ishita','Tanvi','Riya','Simran',
  'Aishwarya','Nandini','Vidya','Sarita','Mamta','Sushma','Archana','Charu','Indira','Padma'
];

const lastNames = [
  'Kumar','Sharma','Mehta','Patel','Rao','Joshi','Singh','Nair','Verma','Shah',
  'Gupta','Pillai','Reddy','Iyer','Chopra','Malhotra','Kapoor','Bhatt','Saxena','Agarwal',
  'Desai','Kulkarni','Menon','Choudhary','Bose','Mukherjee','Banerjee','Chatterjee','Das','Ghosh',
  'Pandey','Mishra','Tiwari','Yadav','Chauhan','Rana','Thakur','Bhalla','Sethi','Khanna',
  'Arora','Bajwa','Dutta','Sengupta','Krishnan','Subramaniam','Venkatesh','Naidu','Hegde','Shetty'
];

const citiesIndia = [
  { city: 'Mumbai', state: 'Maharashtra', pincodePrefix: '4000' },
  { city: 'Delhi', state: 'Delhi', pincodePrefix: '1100' },
  { city: 'Chennai', state: 'Tamil Nadu', pincodePrefix: '6000' },
  { city: 'Bengaluru', state: 'Karnataka', pincodePrefix: '5600' },
  { city: 'Hyderabad', state: 'Telangana', pincodePrefix: '5000' },
  { city: 'Kolkata', state: 'West Bengal', pincodePrefix: '7000' },
  { city: 'Pune', state: 'Maharashtra', pincodePrefix: '4110' },
  { city: 'Ahmedabad', state: 'Gujarat', pincodePrefix: '3800' },
  { city: 'Jaipur', state: 'Rajasthan', pincodePrefix: '3020' },
  { city: 'Lucknow', state: 'Uttar Pradesh', pincodePrefix: '2260' },
  { city: 'Kochi', state: 'Kerala', pincodePrefix: '6820' },
  { city: 'Chandigarh', state: 'Chandigarh', pincodePrefix: '1600' },
  { city: 'Bhopal', state: 'Madhya Pradesh', pincodePrefix: '4620' },
  { city: 'Nagpur', state: 'Maharashtra', pincodePrefix: '4400' },
  { city: 'Indore', state: 'Madhya Pradesh', pincodePrefix: '4520' },
  { city: 'Patna', state: 'Bihar', pincodePrefix: '8000' },
  { city: 'Surat', state: 'Gujarat', pincodePrefix: '3950' },
  { city: 'Coimbatore', state: 'Tamil Nadu', pincodePrefix: '6410' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', pincodePrefix: '5300' },
  { city: 'Guwahati', state: 'Assam', pincodePrefix: '7810' },
];

const streetNames = [
  'MG Road','Park Street','Anna Nagar','Civil Lines','Race Course Road','Banjara Hills',
  'Salt Lake','FC Road','Satellite Road','Malviya Nagar','Marine Drive','Sector 17',
  'Arera Colony','Dharampeth','Vijay Nagar','Boring Road','Vesu','RS Puram',
  'Dwaraka Nagar','GS Road'
];

// 15 specializations — also used as Hospital department names.
const specializations = [
  { name: 'Cardiology', qualification: 'MBBS, MD (Cardiology)', feeRange: [700, 1500] },
  { name: 'Neurology', qualification: 'MBBS, DM (Neurology)', feeRange: [800, 1800] },
  { name: 'Orthopedics', qualification: 'MBBS, MS (Orthopedics)', feeRange: [600, 1400] },
  { name: 'Dermatology', qualification: 'MBBS, MD (Dermatology)', feeRange: [500, 1200] },
  { name: 'Pediatrics', qualification: 'MBBS, MD (Pediatrics)', feeRange: [500, 1100] },
  { name: 'ENT', qualification: 'MBBS, MS (ENT)', feeRange: [500, 1100] },
  { name: 'Psychiatry', qualification: 'MBBS, MD (Psychiatry)', feeRange: [700, 1500] },
  { name: 'Nephrology', qualification: 'MBBS, DM (Nephrology)', feeRange: [800, 1700] },
  { name: 'Oncology', qualification: 'MBBS, DM (Oncology)', feeRange: [1000, 2200] },
  { name: 'Pulmonology', qualification: 'MBBS, MD (Pulmonology)', feeRange: [600, 1300] },
  { name: 'Gastroenterology', qualification: 'MBBS, DM (Gastroenterology)', feeRange: [800, 1700] },
  { name: 'Gynecology', qualification: 'MBBS, MS (Gynecology & Obstetrics)', feeRange: [600, 1400] },
  { name: 'Ophthalmology', qualification: 'MBBS, MS (Ophthalmology)', feeRange: [500, 1100] },
  { name: 'Urology', qualification: 'MBBS, MCh (Urology)', feeRange: [800, 1700] },
  { name: 'General Medicine', qualification: 'MBBS, MD (General Medicine)', feeRange: [400, 900] },
];

const languagesPool = ['English','Hindi','Marathi','Tamil','Telugu','Bengali','Gujarati','Punjabi','Kannada','Malayalam'];

const manufacturers = [
  'Sun Pharma','Cipla','Dr. Reddy\'s','Lupin','Torrent Pharma','Alkem Labs',
  'Mankind Pharma','Zydus Lifesciences','Glenmark','Aurobindo Pharma'
];

// Real generic medicines grouped by category/type (enum-safe). ~100 base entries.
const baseMedicines = [
  // analgesic / NSAID
  { name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'analgesic', type: 'tablet', sideEffects: ['Nausea','Liver strain in overdose'], contraindications: ['Severe liver disease'] },
  { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'analgesic', type: 'tablet', sideEffects: ['Stomach upset','Heartburn'], contraindications: ['Peptic ulcer','Renal impairment'] },
  { name: 'Diclofenac 50mg', genericName: 'Diclofenac Sodium', category: 'analgesic', type: 'tablet', sideEffects: ['GI irritation','Dizziness'], contraindications: ['Active GI bleeding'] },
  { name: 'Aspirin 75mg', genericName: 'Acetylsalicylic Acid', category: 'analgesic', type: 'tablet', sideEffects: ['Gastric irritation','Bleeding risk'], contraindications: ['Bleeding disorders'] },
  { name: 'Tramadol 50mg', genericName: 'Tramadol HCl', category: 'analgesic', type: 'capsule', sideEffects: ['Drowsiness','Constipation'], contraindications: ['Respiratory depression'] },
  { name: 'Naproxen 250mg', genericName: 'Naproxen', category: 'analgesic', type: 'tablet', sideEffects: ['Heartburn','Headache'], contraindications: ['Peptic ulcer'] },
  { name: 'Mefenamic Acid 500mg', genericName: 'Mefenamic Acid', category: 'analgesic', type: 'tablet', sideEffects: ['Drowsiness','Nausea'], contraindications: ['Renal impairment'] },
  // antibiotic
  { name: 'Amoxicillin 250mg', genericName: 'Amoxicillin', category: 'antibiotic', type: 'capsule', sideEffects: ['Diarrhea','Rash'], contraindications: ['Penicillin allergy'] },
  { name: 'Azithromycin 500mg', genericName: 'Azithromycin', category: 'antibiotic', type: 'tablet', sideEffects: ['GI upset','QT prolongation'], contraindications: ['Liver disease'] },
  { name: 'Ciprofloxacin 500mg', genericName: 'Ciprofloxacin', category: 'antibiotic', type: 'tablet', sideEffects: ['Tendon pain','Nausea'], contraindications: ['Tendon disorders'] },
  { name: 'Cefixime 200mg', genericName: 'Cefixime', category: 'antibiotic', type: 'tablet', sideEffects: ['Diarrhea','Abdominal pain'], contraindications: ['Cephalosporin allergy'] },
  { name: 'Doxycycline 100mg', genericName: 'Doxycycline', category: 'antibiotic', type: 'capsule', sideEffects: ['Photosensitivity','Nausea'], contraindications: ['Pregnancy'] },
  { name: 'Metronidazole 400mg', genericName: 'Metronidazole', category: 'antibiotic', type: 'tablet', sideEffects: ['Metallic taste','Nausea'], contraindications: ['First trimester pregnancy'] },
  { name: 'Levofloxacin 500mg', genericName: 'Levofloxacin', category: 'antibiotic', type: 'tablet', sideEffects: ['Tendon rupture risk','Insomnia'], contraindications: ['Myasthenia gravis'] },
  { name: 'Amoxicillin-Clavulanate 625mg', genericName: 'Co-Amoxiclav', category: 'antibiotic', type: 'tablet', sideEffects: ['Diarrhea','Rash'], contraindications: ['Penicillin allergy'] },
  // antiviral
  { name: 'Acyclovir 400mg', genericName: 'Acyclovir', category: 'antiviral', type: 'tablet', sideEffects: ['Headache','Nausea'], contraindications: ['Renal impairment'] },
  { name: 'Oseltamivir 75mg', genericName: 'Oseltamivir', category: 'antiviral', type: 'capsule', sideEffects: ['Nausea','Vomiting'], contraindications: ['Severe renal impairment'] },
  { name: 'Valacyclovir 500mg', genericName: 'Valacyclovir', category: 'antiviral', type: 'tablet', sideEffects: ['Headache','Dizziness'], contraindications: ['Renal impairment'] },
  // antifungal
  { name: 'Fluconazole 150mg', genericName: 'Fluconazole', category: 'antifungal', type: 'capsule', sideEffects: ['Nausea','Headache'], contraindications: ['Liver disease'] },
  { name: 'Clotrimazole 1%', genericName: 'Clotrimazole', category: 'antifungal', type: 'cream', sideEffects: ['Local irritation'], contraindications: ['Known hypersensitivity'] },
  { name: 'Terbinafine 250mg', genericName: 'Terbinafine', category: 'antifungal', type: 'tablet', sideEffects: ['GI upset','Taste disturbance'], contraindications: ['Chronic liver disease'] },
  { name: 'Ketoconazole 2% Shampoo', genericName: 'Ketoconazole', category: 'antifungal', type: 'cream', sideEffects: ['Scalp irritation'], contraindications: ['Known hypersensitivity'] },
  // antihistamine
  { name: 'Cetirizine 10mg', genericName: 'Cetirizine HCl', category: 'antihistamine', type: 'tablet', sideEffects: ['Drowsiness','Dry mouth'], contraindications: ['Severe renal impairment'] },
  { name: 'Levocetirizine 5mg', genericName: 'Levocetirizine', category: 'antihistamine', type: 'tablet', sideEffects: ['Drowsiness','Fatigue'], contraindications: ['Severe renal impairment'] },
  { name: 'Fexofenadine 120mg', genericName: 'Fexofenadine', category: 'antihistamine', type: 'tablet', sideEffects: ['Headache','Drowsiness'], contraindications: ['Renal impairment'] },
  { name: 'Loratadine 10mg', genericName: 'Loratadine', category: 'antihistamine', type: 'tablet', sideEffects: ['Headache','Dry mouth'], contraindications: ['Known hypersensitivity'] },
  { name: 'Chlorpheniramine 4mg', genericName: 'Chlorpheniramine Maleate', category: 'antihistamine', type: 'tablet', sideEffects: ['Drowsiness','Dizziness'], contraindications: ['Glaucoma'] },
  // antihypertensive
  { name: 'Amlodipine 5mg', genericName: 'Amlodipine Besylate', category: 'antihypertensive', type: 'tablet', sideEffects: ['Ankle swelling','Flushing'], contraindications: ['Severe hypotension'] },
  { name: 'Telmisartan 40mg', genericName: 'Telmisartan', category: 'antihypertensive', type: 'tablet', sideEffects: ['Dizziness','Back pain'], contraindications: ['Pregnancy'] },
  { name: 'Losartan 50mg', genericName: 'Losartan Potassium', category: 'antihypertensive', type: 'tablet', sideEffects: ['Dizziness','Hyperkalemia'], contraindications: ['Pregnancy'] },
  { name: 'Metoprolol 50mg', genericName: 'Metoprolol Tartrate', category: 'antihypertensive', type: 'tablet', sideEffects: ['Fatigue','Bradycardia'], contraindications: ['Severe bradycardia'] },
  { name: 'Ramipril 5mg', genericName: 'Ramipril', category: 'antihypertensive', type: 'tablet', sideEffects: ['Dry cough','Hypotension'], contraindications: ['Pregnancy'] },
  { name: 'Hydrochlorothiazide 25mg', genericName: 'Hydrochlorothiazide', category: 'antihypertensive', type: 'tablet', sideEffects: ['Hypokalemia','Dizziness'], contraindications: ['Anuria'] },
  { name: 'Atenolol 50mg', genericName: 'Atenolol', category: 'antihypertensive', type: 'tablet', sideEffects: ['Fatigue','Cold extremities'], contraindications: ['Severe bradycardia'] },
  // antidiabetic
  { name: 'Metformin 500mg', genericName: 'Metformin HCl', category: 'antidiabetic', type: 'tablet', sideEffects: ['GI upset','Lactic acidosis (rare)'], contraindications: ['Severe renal impairment'] },
  { name: 'Glimepiride 2mg', genericName: 'Glimepiride', category: 'antidiabetic', type: 'tablet', sideEffects: ['Hypoglycemia','Weight gain'], contraindications: ['Type 1 diabetes'] },
  { name: 'Sitagliptin 100mg', genericName: 'Sitagliptin', category: 'antidiabetic', type: 'tablet', sideEffects: ['Headache','Nasopharyngitis'], contraindications: ['Severe renal impairment'] },
  { name: 'Insulin Glargine 100IU', genericName: 'Insulin Glargine', category: 'antidiabetic', type: 'injection', sideEffects: ['Hypoglycemia','Injection site reaction'], contraindications: ['Hypoglycemia episodes'] },
  { name: 'Voglibose 0.3mg', genericName: 'Voglibose', category: 'antidiabetic', type: 'tablet', sideEffects: ['Flatulence','Diarrhea'], contraindications: ['Severe hepatic impairment'] },
  { name: 'Empagliflozin 10mg', genericName: 'Empagliflozin', category: 'antidiabetic', type: 'tablet', sideEffects: ['UTI risk','Dehydration'], contraindications: ['Type 1 diabetes'] },
  // cardiac
  { name: 'Atorvastatin 20mg', genericName: 'Atorvastatin Calcium', category: 'cardiac', type: 'tablet', sideEffects: ['Muscle pain','Liver enzyme rise'], contraindications: ['Active liver disease'] },
  { name: 'Rosuvastatin 10mg', genericName: 'Rosuvastatin Calcium', category: 'cardiac', type: 'tablet', sideEffects: ['Myalgia','Headache'], contraindications: ['Active liver disease'] },
  { name: 'Clopidogrel 75mg', genericName: 'Clopidogrel Bisulfate', category: 'cardiac', type: 'tablet', sideEffects: ['Bleeding risk','Bruising'], contraindications: ['Active bleeding'] },
  { name: 'Digoxin 0.25mg', genericName: 'Digoxin', category: 'cardiac', type: 'tablet', sideEffects: ['Nausea','Arrhythmia'], contraindications: ['Ventricular fibrillation'] },
  { name: 'Isosorbide Mononitrate 20mg', genericName: 'Isosorbide Mononitrate', category: 'cardiac', type: 'tablet', sideEffects: ['Headache','Hypotension'], contraindications: ['Severe hypotension'] },
  { name: 'Nebivolol 5mg', genericName: 'Nebivolol', category: 'cardiac', type: 'tablet', sideEffects: ['Fatigue','Dizziness'], contraindications: ['Severe bradycardia'] },
  // respiratory
  { name: 'Salbutamol Inhaler 100mcg', genericName: 'Salbutamol', category: 'respiratory', type: 'inhaler', sideEffects: ['Tremor','Tachycardia'], contraindications: ['Hypersensitivity to salbutamol'] },
  { name: 'Budesonide-Formoterol Inhaler', genericName: 'Budesonide/Formoterol', category: 'respiratory', type: 'inhaler', sideEffects: ['Throat irritation','Headache'], contraindications: ['Untreated fungal infections'] },
  { name: 'Montelukast 10mg', genericName: 'Montelukast Sodium', category: 'respiratory', type: 'tablet', sideEffects: ['Headache','Abdominal pain'], contraindications: ['Known hypersensitivity'] },
  { name: 'Theophylline 200mg', genericName: 'Theophylline', category: 'respiratory', type: 'tablet', sideEffects: ['Nausea','Palpitations'], contraindications: ['Uncontrolled seizures'] },
  { name: 'Ambroxol Syrup', genericName: 'Ambroxol HCl', category: 'respiratory', type: 'syrup', sideEffects: ['GI discomfort'], contraindications: ['Known hypersensitivity'] },
  { name: 'Levosalbutamol Nebulizer Solution', genericName: 'Levosalbutamol', category: 'respiratory', type: 'drops', sideEffects: ['Tremor','Tachycardia'], contraindications: ['Tachyarrhythmia'] },
  // gastrointestinal
  { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'gastrointestinal', type: 'capsule', sideEffects: ['Headache','Diarrhea'], contraindications: ['Hypersensitivity to PPIs'] },
  { name: 'Pantoprazole 40mg', genericName: 'Pantoprazole', category: 'gastrointestinal', type: 'tablet', sideEffects: ['Headache','Nausea'], contraindications: ['Hypersensitivity to PPIs'] },
  { name: 'Ondansetron 4mg', genericName: 'Ondansetron HCl', category: 'gastrointestinal', type: 'tablet', sideEffects: ['Headache','Constipation'], contraindications: ['QT prolongation'] },
  { name: 'Domperidone 10mg', genericName: 'Domperidone', category: 'gastrointestinal', type: 'tablet', sideEffects: ['Dry mouth','Cramps'], contraindications: ['Cardiac arrhythmia'] },
  { name: 'Ranitidine 150mg', genericName: 'Ranitidine HCl', category: 'gastrointestinal', type: 'tablet', sideEffects: ['Headache','Constipation'], contraindications: ['Porphyria'] },
  { name: 'Loperamide 2mg', genericName: 'Loperamide HCl', category: 'gastrointestinal', type: 'capsule', sideEffects: ['Constipation','Bloating'], contraindications: ['Bacterial colitis'] },
  { name: 'ORS Powder', genericName: 'Oral Rehydration Salts', category: 'gastrointestinal', type: 'powder', sideEffects: ['Mild nausea'], contraindications: ['Severe renal failure'] },
  // neurological
  { name: 'Gabapentin 300mg', genericName: 'Gabapentin', category: 'neurological', type: 'capsule', sideEffects: ['Drowsiness','Dizziness'], contraindications: ['Severe renal impairment'] },
  { name: 'Pregabalin 75mg', genericName: 'Pregabalin', category: 'neurological', type: 'capsule', sideEffects: ['Dizziness','Weight gain'], contraindications: ['Severe renal impairment'] },
  { name: 'Levetiracetam 500mg', genericName: 'Levetiracetam', category: 'neurological', type: 'tablet', sideEffects: ['Drowsiness','Irritability'], contraindications: ['Known hypersensitivity'] },
  { name: 'Sodium Valproate 500mg', genericName: 'Sodium Valproate', category: 'neurological', type: 'tablet', sideEffects: ['Tremor','Weight gain'], contraindications: ['Liver disease'] },
  { name: 'Phenytoin 100mg', genericName: 'Phenytoin Sodium', category: 'neurological', type: 'capsule', sideEffects: ['Gum hyperplasia','Ataxia'], contraindications: ['Sinus bradycardia'] },
  { name: 'Donepezil 5mg', genericName: 'Donepezil HCl', category: 'neurological', type: 'tablet', sideEffects: ['Nausea','Insomnia'], contraindications: ['Severe hepatic impairment'] },
  // psychiatric
  { name: 'Sertraline 50mg', genericName: 'Sertraline HCl', category: 'psychiatric', type: 'tablet', sideEffects: ['Nausea','Insomnia'], contraindications: ['MAOI use'] },
  { name: 'Escitalopram 10mg', genericName: 'Escitalopram Oxalate', category: 'psychiatric', type: 'tablet', sideEffects: ['Nausea','Drowsiness'], contraindications: ['MAOI use'] },
  { name: 'Alprazolam 0.25mg', genericName: 'Alprazolam', category: 'psychiatric', type: 'tablet', sideEffects: ['Sedation','Dependence risk'], contraindications: ['Acute narrow-angle glaucoma'] },
  { name: 'Olanzapine 5mg', genericName: 'Olanzapine', category: 'psychiatric', type: 'tablet', sideEffects: ['Weight gain','Sedation'], contraindications: ['Known hypersensitivity'] },
  { name: 'Risperidone 2mg', genericName: 'Risperidone', category: 'psychiatric', type: 'tablet', sideEffects: ['Weight gain','Tremor'], contraindications: ['Known hypersensitivity'] },
  { name: 'Fluoxetine 20mg', genericName: 'Fluoxetine HCl', category: 'psychiatric', type: 'capsule', sideEffects: ['Nausea','Insomnia'], contraindications: ['MAOI use'] },
  // vitamin/supplement
  { name: 'Vitamin D3 60000IU', genericName: 'Cholecalciferol', category: 'vitamin_supplement', type: 'capsule', sideEffects: ['Hypercalcemia (overdose)'], contraindications: ['Hypercalcemia'] },
  { name: 'Vitamin B Complex', genericName: 'B-Complex Vitamins', category: 'vitamin_supplement', type: 'tablet', sideEffects: ['Mild GI upset'], contraindications: ['Known hypersensitivity'] },
  { name: 'Calcium Carbonate 500mg', genericName: 'Calcium Carbonate', category: 'vitamin_supplement', type: 'tablet', sideEffects: ['Constipation','Bloating'], contraindications: ['Hypercalcemia'] },
  { name: 'Folic Acid 5mg', genericName: 'Folic Acid', category: 'vitamin_supplement', type: 'tablet', sideEffects: ['Mild nausea'], contraindications: ['Untreated B12 deficiency'] },
  { name: 'Iron + Folic Acid Tablet', genericName: 'Ferrous Sulfate + Folic Acid', category: 'vitamin_supplement', type: 'tablet', sideEffects: ['Constipation','Dark stools'], contraindications: ['Hemochromatosis'] },
  { name: 'Multivitamin Syrup', genericName: 'Multivitamin', category: 'vitamin_supplement', type: 'syrup', sideEffects: ['Mild GI upset'], contraindications: ['Known hypersensitivity'] },
  { name: 'Zinc Sulfate 20mg', genericName: 'Zinc Sulfate', category: 'vitamin_supplement', type: 'tablet', sideEffects: ['Nausea'], contraindications: ['Known hypersensitivity'] },
  { name: 'Vitamin C 500mg', genericName: 'Ascorbic Acid', category: 'vitamin_supplement', type: 'tablet', sideEffects: ['Mild GI upset'], contraindications: ['Kidney stones history'] },
  { name: 'Omega-3 Fish Oil 1000mg', genericName: 'Omega-3 Fatty Acids', category: 'vitamin_supplement', type: 'capsule', sideEffects: ['Fishy aftertaste'], contraindications: ['Bleeding disorders'] },
  // other / topical / misc
  { name: 'Mupirocin 2% Ointment', genericName: 'Mupirocin', category: 'other', type: 'cream', sideEffects: ['Local burning'], contraindications: ['Known hypersensitivity'] },
  { name: 'Betamethasone Cream', genericName: 'Betamethasone Valerate', category: 'other', type: 'cream', sideEffects: ['Skin thinning'], contraindications: ['Untreated skin infections'] },
  { name: 'Povidone-Iodine Solution', genericName: 'Povidone-Iodine', category: 'other', type: 'drops', sideEffects: ['Local irritation'], contraindications: ['Thyroid disorder (prolonged use)'] },
  { name: 'Diclofenac Gel', genericName: 'Diclofenac Diethylamine', category: 'other', type: 'cream', sideEffects: ['Local irritation'], contraindications: ['Broken skin'] },
  { name: 'Hydrocortisone 1% Cream', genericName: 'Hydrocortisone', category: 'other', type: 'cream', sideEffects: ['Skin thinning (prolonged use)'], contraindications: ['Untreated skin infections'] },
  { name: 'Nicotine Patch 21mg', genericName: 'Nicotine', category: 'other', type: 'patch', sideEffects: ['Skin irritation','Insomnia'], contraindications: ['Recent MI'] },
  { name: 'Glycerin Suppository', genericName: 'Glycerin', category: 'other', type: 'suppository', sideEffects: ['Rectal irritation'], contraindications: ['Rectal bleeding'] },
  { name: 'Ondansetron Syrup', genericName: 'Ondansetron HCl', category: 'gastrointestinal', type: 'syrup', sideEffects: ['Headache','Constipation'], contraindications: ['QT prolongation'] },
  { name: 'Amoxicillin Suspension 125mg/5ml', genericName: 'Amoxicillin', category: 'antibiotic', type: 'syrup', sideEffects: ['Diarrhea','Rash'], contraindications: ['Penicillin allergy'] },
  { name: 'Cefpodoxime 200mg', genericName: 'Cefpodoxime Proxetil', category: 'antibiotic', type: 'tablet', sideEffects: ['Diarrhea','Nausea'], contraindications: ['Cephalosporin allergy'] },
  { name: 'Cough Syrup (Dextromethorphan)', genericName: 'Dextromethorphan', category: 'respiratory', type: 'syrup', sideEffects: ['Drowsiness','Dizziness'], contraindications: ['MAOI use'] },
  { name: 'Paracetamol Syrup (Pediatric)', genericName: 'Acetaminophen', category: 'analgesic', type: 'syrup', sideEffects: ['Rare liver strain (overdose)'], contraindications: ['Severe liver disease'] },
  { name: 'Norfloxacin 400mg', genericName: 'Norfloxacin', category: 'antibiotic', type: 'tablet', sideEffects: ['Nausea','Tendon pain'], contraindications: ['Tendon disorders'] },
  { name: 'Lactulose Solution', genericName: 'Lactulose', category: 'gastrointestinal', type: 'syrup', sideEffects: ['Flatulence','Cramping'], contraindications: ['Galactosemia'] },
  { name: 'Itraconazole 100mg', genericName: 'Itraconazole', category: 'antifungal', type: 'capsule', sideEffects: ['Nausea','Headache'], contraindications: ['Heart failure'] },
  { name: 'Amitriptyline 25mg', genericName: 'Amitriptyline HCl', category: 'psychiatric', type: 'tablet', sideEffects: ['Dry mouth','Drowsiness'], contraindications: ['Recent MI'] },
  { name: 'Carbamazepine 200mg', genericName: 'Carbamazepine', category: 'neurological', type: 'tablet', sideEffects: ['Dizziness','Rash'], contraindications: ['Bone marrow suppression'] },
  { name: 'Furosemide 40mg', genericName: 'Furosemide', category: 'cardiac', type: 'tablet', sideEffects: ['Dehydration','Hypokalemia'], contraindications: ['Anuria'] },
  { name: 'Spironolactone 25mg', genericName: 'Spironolactone', category: 'cardiac', type: 'tablet', sideEffects: ['Hyperkalemia','Gynecomastia'], contraindications: ['Hyperkalemia'] },
  { name: 'Tamsulosin 0.4mg', genericName: 'Tamsulosin HCl', category: 'other', type: 'capsule', sideEffects: ['Dizziness','Orthostatic hypotension'], contraindications: ['Severe hypotension'] },
  { name: 'Finasteride 5mg', genericName: 'Finasteride', category: 'other', type: 'tablet', sideEffects: ['Decreased libido'], contraindications: ['Pregnancy (handling)'] },
  { name: 'Sildenafil 50mg', genericName: 'Sildenafil Citrate', category: 'other', type: 'tablet', sideEffects: ['Headache','Flushing'], contraindications: ['Nitrate use'] },
  { name: 'Ranolazine 500mg', genericName: 'Ranolazine', category: 'cardiac', type: 'tablet', sideEffects: ['Dizziness','Constipation'], contraindications: ['Severe hepatic impairment'] },
  { name: 'Esomeprazole 40mg', genericName: 'Esomeprazole', category: 'gastrointestinal', type: 'tablet', sideEffects: ['Headache','Diarrhea'], contraindications: ['Hypersensitivity to PPIs'] },
  { name: 'Rabeprazole 20mg', genericName: 'Rabeprazole', category: 'gastrointestinal', type: 'tablet', sideEffects: ['Headache','Nausea'], contraindications: ['Hypersensitivity to PPIs'] },
  { name: 'Diazepam 5mg', genericName: 'Diazepam', category: 'psychiatric', type: 'tablet', sideEffects: ['Sedation','Dependence risk'], contraindications: ['Acute narrow-angle glaucoma'] },
  { name: 'Hydroxyzine 25mg', genericName: 'Hydroxyzine HCl', category: 'antihistamine', type: 'tablet', sideEffects: ['Drowsiness','Dry mouth'], contraindications: ['QT prolongation'] },
];

const equipmentTemplates = [
  { name: 'Stethoscope', category: 'diagnostic', unitCost: 2500 },
  { name: 'Digital Blood Pressure Monitor', category: 'diagnostic', unitCost: 3500 },
  { name: 'Pulse Oximeter', category: 'diagnostic', unitCost: 2000 },
  { name: 'Infrared Thermometer', category: 'diagnostic', unitCost: 1200 },
  { name: 'Glucometer', category: 'diagnostic', unitCost: 1500 },
  { name: 'Otoscope', category: 'diagnostic', unitCost: 4000 },
  { name: 'ECG Machine', category: 'medical_equipment', unitCost: 45000 },
  { name: 'Defibrillator', category: 'medical_equipment', unitCost: 120000 },
  { name: 'Ventilator', category: 'medical_equipment', unitCost: 350000 },
  { name: 'Infusion Pump', category: 'medical_equipment', unitCost: 28000 },
  { name: 'Patient Monitor', category: 'medical_equipment', unitCost: 65000 },
  { name: 'Wheelchair', category: 'medical_equipment', unitCost: 8000 },
  { name: 'Hospital Bed (Electric)', category: 'medical_equipment', unitCost: 55000 },
  { name: 'IV Drip Stand', category: 'medical_equipment', unitCost: 1500 },
  { name: 'Suction Machine', category: 'medical_equipment', unitCost: 18000 },
  { name: 'Nebulizer', category: 'medical_equipment', unitCost: 2500 },
  { name: 'Surgical Gloves (Box)', category: 'ppe', unitCost: 350 },
  { name: 'N95 Masks (Box)', category: 'ppe', unitCost: 800 },
  { name: 'Disposable Gowns (Pack)', category: 'ppe', unitCost: 1200 },
  { name: 'Face Shields (Pack)', category: 'ppe', unitCost: 600 },
  { name: 'Shoe Covers (Pack)', category: 'ppe', unitCost: 250 },
  { name: 'Surgical Scissors', category: 'surgical_instruments', unitCost: 600 },
  { name: 'Scalpel Set', category: 'surgical_instruments', unitCost: 1800 },
  { name: 'Forceps Set', category: 'surgical_instruments', unitCost: 1400 },
  { name: 'Surgical Retractor', category: 'surgical_instruments', unitCost: 2200 },
  { name: 'Needle Holder', category: 'surgical_instruments', unitCost: 900 },
  { name: 'Syringes (Box of 100)', category: 'consumables', unitCost: 450 },
  { name: 'IV Cannula (Box)', category: 'consumables', unitCost: 700 },
  { name: 'Gauze Rolls (Pack)', category: 'consumables', unitCost: 300 },
  { name: 'Surgical Sutures (Box)', category: 'consumables', unitCost: 1600 },
  { name: 'Catheters (Box)', category: 'consumables', unitCost: 900 },
  { name: 'Examination Table', category: 'furniture', unitCost: 15000 },
  { name: 'Bedside Locker', category: 'furniture', unitCost: 4500 },
  { name: 'OPD Waiting Chairs (Set of 4)', category: 'furniture', unitCost: 6000 },
  { name: 'Reception Desk', category: 'furniture', unitCost: 22000 },
  { name: 'Desktop Computer', category: 'it_equipment', unitCost: 38000 },
  { name: 'Barcode Scanner', category: 'it_equipment', unitCost: 3200 },
  { name: 'Network Printer', category: 'it_equipment', unitCost: 14000 },
  { name: 'UPS Backup Unit', category: 'it_equipment', unitCost: 9000 },
  { name: 'CCTV Camera Unit', category: 'it_equipment', unitCost: 5500 },
  { name: 'Autoclave Sterilizer', category: 'medical_equipment', unitCost: 75000 },
];

const labTestCatalog = [
  { testName: 'Complete Blood Count (CBC)', testCode: 'CBC', category: 'hematology', sampleType: 'Whole Blood', price: 350 },
  { testName: 'Lipid Profile', testCode: 'LIPID', category: 'biochemistry', sampleType: 'Serum', price: 600 },
  { testName: 'Liver Function Test (LFT)', testCode: 'LFT', category: 'biochemistry', sampleType: 'Serum', price: 700 },
  { testName: 'Kidney Function Test (KFT)', testCode: 'KFT', category: 'biochemistry', sampleType: 'Serum', price: 650 },
  { testName: 'Thyroid Profile (T3 T4 TSH)', testCode: 'THYROID', category: 'biochemistry', sampleType: 'Serum', price: 800 },
  { testName: 'Fasting Blood Sugar', testCode: 'FBS', category: 'biochemistry', sampleType: 'Plasma', price: 150 },
  { testName: 'HbA1c', testCode: 'HBA1C', category: 'biochemistry', sampleType: 'Whole Blood', price: 500 },
  { testName: 'Urine Routine Examination', testCode: 'URINE', category: 'pathology', sampleType: 'Urine', price: 200 },
  { testName: 'Chest X-Ray', testCode: 'XRAYCHEST', category: 'radiology', sampleType: 'N/A', price: 450 },
  { testName: 'ECG', testCode: 'ECG', category: 'cardiology', sampleType: 'N/A', price: 300 },
  { testName: 'Stool Routine Examination', testCode: 'STOOL', category: 'pathology', sampleType: 'Stool', price: 180 },
  { testName: 'Blood Culture', testCode: 'BCULT', category: 'microbiology', sampleType: 'Whole Blood', price: 900 },
  { testName: 'Urine Culture', testCode: 'UCULT', category: 'microbiology', sampleType: 'Urine', price: 750 },
  { testName: 'Vitamin D Level', testCode: 'VITD', category: 'biochemistry', sampleType: 'Serum', price: 1500 },
  { testName: 'Vitamin B12 Level', testCode: 'VITB12', category: 'biochemistry', sampleType: 'Serum', price: 1200 },
  { testName: 'CRP (C-Reactive Protein)', testCode: 'CRP', category: 'immunology', sampleType: 'Serum', price: 600 },
  { testName: 'Widal Test', testCode: 'WIDAL', category: 'microbiology', sampleType: 'Serum', price: 250 },
  { testName: 'Dengue NS1 Antigen', testCode: 'DENGUE', category: 'immunology', sampleType: 'Serum', price: 800 },
  { testName: 'Malaria Antigen Test', testCode: 'MALARIA', category: 'microbiology', sampleType: 'Whole Blood', price: 400 },
  { testName: 'Echocardiogram', testCode: 'ECHO', category: 'cardiology', sampleType: 'N/A', price: 2000 },
  { testName: 'USG Abdomen', testCode: 'USGABD', category: 'radiology', sampleType: 'N/A', price: 1200 },
  { testName: 'MRI Brain', testCode: 'MRIBRAIN', category: 'radiology', sampleType: 'N/A', price: 8000 },
  { testName: 'CT Scan Chest', testCode: 'CTCHEST', category: 'radiology', sampleType: 'N/A', price: 6000 },
  { testName: 'PSA (Prostate Specific Antigen)', testCode: 'PSA', category: 'biochemistry', sampleType: 'Serum', price: 1000 },
  { testName: 'Pap Smear', testCode: 'PAPSMEAR', category: 'pathology', sampleType: 'Cervical Swab', price: 700 },
];

const chronicConditionsList = ['Hypertension','Type 2 Diabetes','Asthma','Coronary Artery Disease','Hypothyroidism','Chronic Kidney Disease','Osteoarthritis','COPD','Migraine','GERD'];
const allergensList = ['Penicillin','Aspirin','Sulfa drugs','Peanuts','Latex','Dust','Pollen','Shellfish','Iodine contrast','None known'];
const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

module.exports = {
  maleFirstNames, femaleFirstNames, lastNames, citiesIndia, streetNames,
  specializations, languagesPool, manufacturers, baseMedicines, equipmentTemplates,
  labTestCatalog, chronicConditionsList, allergensList, bloodGroups
};
