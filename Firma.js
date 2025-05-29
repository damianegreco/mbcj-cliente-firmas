const axios = require('axios');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const crypto = require('crypto');

const { validarParametros, validarPaths } = require('./funciones');

/**
 * @class Firma
 * @description Clase para interactuar con un servicio de firma digital, gestionando la encriptación de la API Key.
 */
class Firma {
  /** @type {import('axios').AxiosInstance} */
  axiosInstance;
  /** @type {string} */
  encryptedApiKey; // Aquí se almacenará la API Key una vez encriptada.

  /**
   * Constructor interno de la clase `Firma`. No debe ser llamado directamente.
   * La creación de instancias debe hacerse a través del método estático `Firma.build()`.
   * @private
   * @param {object} params - Parámetros de configuración interna.
   * @param {string} params.baseURL - URL base para la instancia de Axios.
   * @param {string} params.encryptedApiKey - La API Key ya encriptada, lista para usar.
   */
  constructor({ baseURL, encryptedApiKey }) {
    this.axiosInstance = axios.create({
      baseURL: baseURL,
      timeout: 10000,
    });
    this.encryptedApiKey = encryptedApiKey;
  }

  /**
   * Método estático asíncrono para construir y devolver una instancia de `Firma` completamente inicializada.
   * Este método gestiona la obtención de la clave pública (de archivo o API) y la encriptación de la API Key.
   *
   * @param {object} params - Parámetros de configuración.
   * @param {string} params.BASE_URL - URL base del servicio de firma.
   * @param {string} params.API_KEY - Clave de API para autenticación (en texto plano).
   * @param {string} [params.CERTS_DIR] - Directorio donde se encuentran los certificados (opcional).
   * @param {string} [params.CA_CRT] - Nombre del archivo del certificado de la CA (opcional).
   * @returns {Promise<Firma>} Una promesa que resuelve con la instancia de Firma inicializada.
   * @throws {Error} Si los parámetros básicos no son indicados o si no se puede obtener una clave pública válida.
   */
  static async build({ BASE_URL, API_KEY, CERTS_DIR, CA_CRT }) {
    // Validar que los parámetros esenciales para la construcción estén presentes.
    if (!validarParametros(BASE_URL, API_KEY)) {
      throw new Error("Indique los parámetros BASE_URL y API_KEY necesarios para construir la instancia de Firma.");
    }

    // Se crea una instancia temporal de Axios para la obtención inicial de la clave pública.
    const tempAxiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });

    let publicKey;
    // Intentar cargar la clave pública desde el archivo local si se proporcionan las rutas.
    try {
      if (CERTS_DIR && CA_CRT) {
        publicKey = Firma._loadPublicKeyFromFile(CERTS_DIR, CA_CRT);
      }
    } catch (error) {
      // Si falla la carga local, emitir una advertencia y proceder a buscar en la API.
      console.warn(`Advertencia: No se pudo cargar la clave pública localmente (${error.message}). Intentando obtenerla de la API...`);
      publicKey = null;
    }

    // Si la clave pública no se obtuvo de forma local, intentar obtenerla de la API.
    if (!publicKey) {
      console.log('Obteniendo clave pública desde la API...');
      try {
        const response = await tempAxiosInstance.get('/certs/http/public-key', { responseType: 'arraybuffer' });
        publicKey = Buffer.from(response.data);
      } catch (error) {
        // Si falla la obtención de la API, lanzar un error fatal.
        throw new Error(`No se pudo obtener la clave pública de la API: ${error.message}`);
      }
    }

    // Si, después de ambos intentos, no se tiene una clave pública, lanzar un error.
    if (!publicKey) {
      throw new Error("No se pudo obtener una clave pública válida ni de archivo ni de la API.");
    }

    // Encriptar la API Key (proporcionada en texto plano a 'build') utilizando la clave pública obtenida.
    const encryptedApiKey = Firma._encryptApiKey(API_KEY, publicKey);
    
    // Finalmente, se crea y devuelve la instancia de Firma.
    // El constructor interno recibe la URL base y la API Key ya encriptada.
    const instance = new Firma({ baseURL: BASE_URL, encryptedApiKey });
    return instance;
  }

  /**
   * Carga la clave pública desde un archivo. Es un método estático y auxiliar.
   * @private
   * @param {string} CERTS_DIR - Directorio donde se encuentra el certificado.
   * @param {string} CA_CRT - Nombre del archivo del certificado.
   * @returns {Buffer} La clave pública en formato Buffer.
   * @throws {Error} Si la ruta no es válida o el archivo no puede ser leído.
   */
  static _loadPublicKeyFromFile(CERTS_DIR, CA_CRT) {
    const caPath = path.join(CERTS_DIR, CA_CRT);
    // Valida la ruta del archivo; la función `validarPaths` lanzará un error si es inválida.
    validarPaths(caPath);
    return fs.readFileSync(caPath);
  }

  /**
   * Encripta la API Key usando la clave pública proporcionada. Es un método estático y auxiliar.
   * @private
   * @param {string} apiKeyToEncrypt - La API Key a encriptar.
   * @param {Buffer} publicKeyBuffer - La clave pública en formato Buffer.
   * @returns {string} La API Key encriptada en formato Base64.
   * @throws {Error} Si ocurre un error durante la encriptación.
   */
  static _encryptApiKey(apiKeyToEncrypt, publicKeyBuffer) {
    try {
      const encrypted = crypto.publicEncrypt(
        { key: publicKeyBuffer, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
        Buffer.from(apiKeyToEncrypt)
      );
      return encrypted.toString('base64');
    } catch (error) {
      throw new Error(`Error al encriptar la API Key: ${error.message}`);
    }
  }

  /**
   * Firma un documento.
   * @param {Buffer} documentoBuffer - Buffer del documento a firmar.
   * @param {object} datos - Datos adicionales a incluir en la firma.
   * @param {object} [headers={}] - Cabeceras HTTP adicionales.
   * @returns {Promise<Buffer>} Promesa que resuelve con el documento firmado (Buffer).
   * @throws {Error} Si ocurre un error durante la firma.
   */
  firmar(documentoBuffer, datos, headers = {}) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('documento', documentoBuffer);
      form.append('datos', JSON.stringify(datos, null, 0));

      const headersDef = { ...headers, ...form.getHeaders(), 'Authorization': this.encryptedApiKey };

      this.axiosInstance.post('/sign-doc', form, { headers: headersDef, responseType: "arraybuffer" })
        .then(response => resolve(response.data))
        .catch(error => reject(error));
    });
  }

  /**
   * Compara un documento para verificar firmas de terceros.
   * @param {Buffer} documentoBuffer - Buffer del documento a comparar.
   * @param {object} [headers={}] - Cabeceras HTTP adicionales.
   * @returns {Promise<object>} Promesa que resuelve con el resultado de la comparación.
   * @throws {Error} Si ocurre un error durante la comparación.
   */
  comparar(documentoBuffer, headers = {}) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('documento', documentoBuffer);

      const headersDef = { ...headers, ...form.getHeaders(), 'Authorization': this.encryptedApiKey };

      this.axiosInstance.post('/compare', form, { headers: headersDef })
        .then(response => resolve(response.data))
        .catch(error => {
          if (error.response && error.response.status === 422)
            console.error("Sin firma de tercero para comparar");
          reject(error);
        });
    });
  }

  /**
   * Obtiene las firmas de un documento.
   * @param {Buffer} documentoBuffer - Buffer del documento.
   * @param {object} [headers={}] - Cabeceras HTTP adicionales.
   * @returns {Promise<object>} Promesa que resuelve con los datos de las firmas.
   * @throws {Error} Si ocurre un error al obtener las firmas.
   */
  getFirmas(documentoBuffer, headers = {}) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('documento', documentoBuffer);

      const headersDef = { ...headers, ...form.getHeaders(), 'Authorization': this.encryptedApiKey };

      this.axiosInstance.post('/get-data', form, { headers: headersDef })
        .then(response => resolve(response.data))
        .catch(error => reject(error));
    });
  }

  /**
   * Obtiene los detalles completos de las firmas de un documento.
   * @param {Buffer} documentoBuffer - Buffer del documento.
   * @param {object} [headers={}] - Cabeceras HTTP adicionales.
   * @returns {Promise<object>} Promesa que resuelve con los detalles completos de las firmas.
   * @throws {Error} Si ocurre un error al obtener los detalles de las firmas.
   */
  getFirmasDetalles(documentoBuffer, headers = {}) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('documento', documentoBuffer);

      const headersDef = { ...headers, ...form.getHeaders(), 'Authorization': this.encryptedApiKey };

      this.axiosInstance.post('/get-data/full', form, { headers: headersDef })
        .then(response => resolve(response.data))
        .catch(error => reject(error));
    });
  }

  /**
   * Obtiene los certificados asociados a un documento.
   * @param {Buffer} documentoBuffer - Buffer del documento.
   * @param {object} [headers={}] - Cabeceras HTTP adicionales.
   * @returns {Promise<object>} Promesa que resuelve con los certificados.
   * @throws {Error} Si ocurre un error al obtener los certificados.
   */
  getCertificados(documentoBuffer, headers = {}) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('documento', documentoBuffer);

      const headersDef = { ...headers, ...form.getHeaders(), 'Authorization': this.encryptedApiKey };

      this.axiosInstance.post('/get-data/certificados', form, { headers: headersDef })
        .then(response => resolve(response.data))
        .catch(error => reject(error));
    });
  }
}

module.exports = Firma;