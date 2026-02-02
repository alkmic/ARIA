/**
 * Script pour régénérer les données des praticiens
 * en utilisant le dataGenerator existant
 */

import { generateDatabase } from '../src/data/dataGenerator';

// Generate new data
const data = generateDatabase(120);

// Output as JSON
console.log(JSON.stringify(data, null, 2));
