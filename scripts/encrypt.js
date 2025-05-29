// encryptApiKey.js
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const argv = require('minimist')(process.argv.slice(2));

// Importa la clase Firma. Asegúrate de que el path sea correcto (e.g., './Firma' o './index')
const Firma = require('../Firma.js'); // Asumiendo que tu clase Firma está en 'Firma.js'

// Consigue los datos de configuración desde las variables de entorno
const { BASE_URL, CERTS_DIR, CA_CRT } = process.env;

/**
 * @function main
 * @description Función principal asíncrona para encriptar la API Key desde la línea de comandos,
 * utilizando la clase Firma para la obtención de la clave pública y la encriptación.
 * @returns {Promise<void>}
 */
async function main() {
  const apiKeyToEncrypt = argv['api_key']; // Recibe la API Key del argumento --api_key

  if (!apiKeyToEncrypt || !BASE_URL) {
    console.error('Uso: node encryptApiKey.js --api_key=<TU_API_KEY>');
    console.error('Asegúrate de que BASE_URL esté configurado en tu archivo .env.');
    process.exit(1);
  }

  try {
    console.log('Iniciando el proceso de obtención de clave pública y encriptación...');
    // Creamos una instancia "dummy" de Firma con la API_KEY a encriptar.
    // Aunque esta instancia no se usará para realizar llamadas de firma,
    // su método 'build' encapsula la lógica para obtener la publicKey y encriptar la apiKey.
    const firmaInstance = await Firma.build({
      BASE_URL: BASE_URL,
      CERTS_DIR: CERTS_DIR,
      CA_CRT: CA_CRT,
      API_KEY: apiKeyToEncrypt // Pasamos la API Key que queremos encriptar
    });

    console.log('Clave pública obtenida y API Key encriptada por la clase Firma.');

    // La API Key encriptada ya está disponible en la instancia
    const encryptedApiKey = firmaInstance.encryptedApiKey;

    console.log('\n--- API Key Encriptada (Base64) ---');
    console.log(encryptedApiKey);
    console.log('----------------------------------\n');
    process.exit(0);

  } catch (error) {
    console.error(`Error fatal durante la encriptación de la API Key: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar la función principal
main();