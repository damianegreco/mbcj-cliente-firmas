const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const argv = require('minimist')(process.argv.slice(2));

// Consigue los datos de certificados, claves y URL del servidor
const { BASE_URL, CERTS_DIR, CA_CRT, API_KEY, TEST_DOCS_PATH } = process.env;

// Importa la clase Firma
const Firma = require('./index');

/** @type {Firma} */
let firma; // Declaramos la variable 'firma' para que esté disponible globalmente tras la inicialización.

/**
 * @function firmarDocumentoTest
 * @description Firma un documento de ejemplo y guarda el resultado.
 * @param {string} docOriginalPath - Ruta del documento original a firmar.
 * @param {string} docFirmadoPath - Ruta donde se guardará el documento firmado.
 * @returns {Promise<void>} Promesa que resuelve cuando el documento es firmado y guardado.
 */
async function firmarDocumentoTest(docOriginalPath, docFirmadoPath) {
  const docEjemplo = fs.readFileSync(docOriginalPath);
  try {
    const doc_firmado = await firma.firmar(docEjemplo, { test: "ok" });
    fs.writeFileSync(docFirmadoPath, doc_firmado);
    console.log(`Documento firmado y guardado en: ${docFirmadoPath}`);
  } catch (error) {
    console.error('Error al firmar el documento:', error);
    throw error; // Propagamos el error para que sea capturado por el main try-catch
  }
}

/**
 * @function compararTest
 * @description Compara un documento firmado para verificar firmas de terceros.
 * @param {string} docOriginalPath - Ruta del documento a comparar.
 * @returns {Promise<void>} Promesa que resuelve con los datos de la comparación.
 */
async function compararTest(docOriginalPath) {
  const docEjemplo = fs.readFileSync(docOriginalPath);
  try {
    const datos_firmas = await firma.comparar(docEjemplo);
    console.log('Resultado de la comparación:', datos_firmas);
  } catch (error) {
    if (error.response && error.response.status === 422) {
      console.warn("Advertencia: Comparar documento sin firma de tercero (código 422).");
    } else {
      console.error('Error al comparar el documento:', error);
    }
    throw error; // Propagamos el error
  }
}

/**
 * @function validarFirmaTest
 * @description Obtiene y muestra las firmas de un documento.
 * @param {string} docFirmadoPath - Ruta del documento firmado.
 * @returns {Promise<void>} Promesa que resuelve con los datos de las firmas.
 */
async function validarFirmaTest(docFirmadoPath) {
  const docEjemplo = fs.readFileSync(docFirmadoPath);
  try {
    const datos_firmas = await firma.getFirmas(docEjemplo);
    console.log('Datos de las firmas:', datos_firmas);
  } catch (error) {
    console.error('Error al validar la firma:', error);
    throw error;
  }
}

/**
 * @function validarFirmaFullTest
 * @description Obtiene y muestra los detalles completos de las firmas de un documento.
 * @param {string} docFirmadoPath - Ruta del documento firmado.
 * @returns {Promise<void>} Promesa que resuelve con los detalles completos de las firmas.
 */
async function validarFirmaFullTest(docFirmadoPath) {
  const docEjemplo = fs.readFileSync(docFirmadoPath);
  try {
    const datos_firmas = await firma.getFirmasDetalles(docEjemplo);
    console.log('Detalles completos de las firmas:', datos_firmas);
  } catch (error) {
    console.error('Error al obtener detalles completos de la firma:', error);
    throw error;
  }
}

/**
 * @function validarFirmaCertsTest
 * @description Obtiene y muestra los certificados asociados a un documento.
 * @param {string} docFirmadoPath - Ruta del documento firmado.
 * @returns {Promise<void>} Promesa que resuelve con los certificados.
 */
async function validarFirmaCertsTest(docFirmadoPath) {
  const docEjemplo = fs.readFileSync(docFirmadoPath);
  try {
    const datos_firmas = await firma.getCertificados(docEjemplo);
    console.log('Certificados asociados al documento:', datos_firmas);
  } catch (error) {
    console.error('Error al obtener los certificados:', error);
    throw error;
  }
}

/**
 * @function main
 * @description Función principal asíncrona para inicializar la clase Firma y ejecutar las acciones
 * basadas en los argumentos de línea de comandos.
 * @returns {Promise<void>}
 */
async function main() {
  try {
    console.log('Inicializando servicio de Firma...');
    // Crea la instancia de la clase Firma utilizando el método estático 'build'.
    // Los parámetros CERTS_DIR, CA_CRT y API_KEY son clave para la inicialización.
    firma = await Firma.build({ BASE_URL, CERTS_DIR, CA_CRT, API_KEY });
    console.log('Servicio de Firma inicializado correctamente.');

    // Ejecuta la acción correspondiente basada en los argumentos de línea de comandos.
    // Todas las llamadas a las funciones de test ahora son directas y `await`-adas.
    if (argv['firmar']) {
      await firmarDocumentoTest(
        path.join(TEST_DOCS_PATH, 'document.pdf'),
        path.join(TEST_DOCS_PATH, 'document_nuevo.pdf')
      );
      console.log('Comando --firmar ejecutado con éxito.');
    } else if (argv['comparar']) {
      await compararTest(path.join(TEST_DOCS_PATH, 'document_firmado.pdf'));
      console.log('Comando --comparar ejecutado con éxito.');
    } else if (argv['get-firmas']) {
      await validarFirmaTest(path.join(TEST_DOCS_PATH, 'document_nuevo.pdf'));
      console.log('Comando --get-firmas ejecutado con éxito.');
    } else if (argv['get-firmas-full']) {
      await validarFirmaFullTest(path.join(TEST_DOCS_PATH, 'document_firmado.pdf'));
      console.log('Comando --get-firmas-full ejecutado con éxito.');
    } else if (argv['get-certificados']) {
      await validarFirmaCertsTest(path.join(TEST_DOCS_PATH, 'document_firmado.pdf'));
      console.log('Comando --get-certificados ejecutado con éxito.');
    } else {
      console.log('No se especificó ninguna acción. Use --firmar, --comparar, --get-firmas, --get-firmas-full, o --get-certificados.');
    }

    process.exit(0); // Sale del proceso con código de éxito.
  } catch (error) {
    console.error('Error FATAL en la aplicación:', error);
    process.exit(1); // Sale del proceso con código de error.
  }
}

// Inicia la ejecución de la función principal.
main();