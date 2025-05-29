// index.test.js
const Firma = require('../index'); // Tu clase Firma
const { validarParametros, validarPaths } = require('../funciones');
const fs = require('fs');
const crypto = require('crypto');
const axios =require('axios');
const FormData = require('form-data');
const path = require('path');

// Mockear todos los módulos de los que depende Firma
jest.mock('../funciones');
jest.mock('fs');
jest.mock('crypto');
jest.mock('axios');

describe('Firma Class', () => {
  const mockBaseURL = 'http://fake-api.com';
  const mockApiKey = 'test-api-key-plain';
  const mockEncryptedApiKey = 'encrypted-base64-api-key';
  const mockPublicKeyBuffer = Buffer.from('fake-public-key-content');
  const mockDocumentoBuffer = Buffer.from('fake-document-content');
  const mockCertsDir = '/fake/certs/dir';
  const mockCaCrt = 'ca-certificate.crt';
  const mockCaPath = path.join(mockCertsDir, mockCaCrt);

  let mockAxiosGetFn;
  let mockAxiosPostFn;
  let mockAxiosCreateInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    validarParametros.mockReturnValue(true);
    validarPaths.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(mockPublicKeyBuffer);
    crypto.publicEncrypt.mockImplementation((options, buffer) => {
      // Simula una encriptación simple para el test, devolviendo un buffer
      return Buffer.from(`encrypted_${buffer.toString()}`);
    });
    // Aseguramos que crypto.constants está disponible si la implementación real lo usa
     crypto.constants = { RSA_PKCS1_OAEP_PADDING: 'mock_padding_value', OaepHash: 'sha256' };


    mockAxiosGetFn = jest.fn();
    mockAxiosPostFn = jest.fn();
    mockAxiosCreateInstance = {
      get: mockAxiosGetFn,
      post: mockAxiosPostFn,
    };
    axios.create.mockReturnValue(mockAxiosCreateInstance);

    // Mock para los métodos estáticos internos para simplificar el setup de `build` en algunos tests
    // Si queremos probar la lógica interna de build, estos spies se configuran específicamente en esos tests
    jest.spyOn(Firma, '_loadPublicKeyFromFile').mockImplementation(
        () => mockPublicKeyBuffer // Por defecto, simula carga exitosa desde archivo
    );
    jest.spyOn(Firma, '_encryptApiKey').mockImplementation(
        (apiKey, pubKey) => Buffer.from(`encrypted_${apiKey}`).toString('base64') // Simula encriptación
    );
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Importante para limpiar spies
  });

  // --- Pruebas para Métodos Estáticos Auxiliares (_loadPublicKeyFromFile, _encryptApiKey) ---
  // (Estas pruebas son como las que te mostré antes, verificando la lógica interna de estos helpers)
  // Por brevedad, las omito aquí, pero deberían estar presentes.
  // Ejemplo rápido para _loadPublicKeyFromFile:
  describe('Static _loadPublicKeyFromFile', () => {
    beforeEach(() => {
        // Quitamos el mock general para probar este método específicamente
        Firma._loadPublicKeyFromFile.mockRestore(); 
    });
    it('should load public key from file successfully', () => {
      const result = Firma._loadPublicKeyFromFile(mockCertsDir, mockCaCrt);
      expect(validarPaths).toHaveBeenCalledWith(mockCaPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockCaPath);
      expect(result).toEqual(mockPublicKeyBuffer);
    });
    // ... más tests para _loadPublicKeyFromFile
  });

  describe('Static _encryptApiKey', () => {
    beforeEach(() => {
        Firma._encryptApiKey.mockRestore();
    });
    it('should encrypt API key successfully', () => {
      const apiKeyToEncrypt = 'plain-api-key';
      const publicKey = Buffer.from('some-public-key');
      // crypto.publicEncrypt ya está mockeado para devolver un buffer simple
      const result = Firma._encryptApiKey(apiKeyToEncrypt, publicKey);
      
      expect(crypto.publicEncrypt).toHaveBeenCalledWith(
        { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
        Buffer.from(apiKeyToEncrypt)
      );
      expect(result).toBe(Buffer.from(`encrypted_${apiKeyToEncrypt}`).toString('base64'));
    });
    // ... más tests para _encryptApiKey
  });


  // --- Pruebas para el Método Estático `build` ---
  // (Estas pruebas son como las que te mostré antes, muy detalladas para cada escenario de build)
  // Por brevedad, las omito aquí, pero deberían estar presentes.
  // Ejemplo de un caso para build:
  describe('Static build method', () => {
    // Restaurar los mocks de _loadPublicKeyFromFile y _encryptApiKey para que se ejecute la lógica real (mockeada a nivel de módulo)
    // o espiarlos de nuevo si queremos un control más fino por test de build.
    beforeEach(() => {
        Firma._loadPublicKeyFromFile.mockRestore(); // Dejamos que el build llame a la versión espiada/mockeada a nivel superior o la real mockeada por jest.mock
        Firma._encryptApiKey.mockRestore();
        
        // Configuramos el mock de crypto.publicEncrypt para que devuelva una cadena base64 directamente
        // ya que _encryptApiKey espera eso.
        const mockActualEncryptedBase64 = "finalEncryptedBase64String";
        crypto.publicEncrypt.mockReturnValue(Buffer.from(mockActualEncryptedBase64, 'utf-8')); // Simula que crypto devuelve un buffer
                                                                                             // y _encryptApiKey lo convierte a base64
        
        // Re-espiamos _encryptApiKey para que use el mock de crypto.publicEncrypt y haga el toString('base64')
        // Esto es un poco redundante si ya probamos _encryptApiKey unitariamente, pero útil para el flujo de build.
        // Una alternativa es mockear _encryptApiKey para que devuelva directamente la base64.
        jest.spyOn(Firma, '_encryptApiKey').mockReturnValue(mockEncryptedApiKey); // Usamos el mockEncryptedApiKey global
    });
    
    it('should build instance by loading public key from file if paths provided', async () => {
      // Aseguramos que _loadPublicKeyFromFile es llamado y devuelve la clave mock
      jest.spyOn(Firma, '_loadPublicKeyFromFile').mockReturnValue(mockPublicKeyBuffer);

      const instance = await Firma.build({ 
        BASE_URL: mockBaseURL, 
        API_KEY: mockApiKey, 
        CERTS_DIR: mockCertsDir, 
        CA_CRT: mockCaCrt 
      });
      
      expect(Firma._loadPublicKeyFromFile).toHaveBeenCalledWith(mockCertsDir, mockCaCrt);
      expect(axios.create).toHaveBeenCalledTimes(2); // Solo la instancia final.
      expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({ baseURL: mockBaseURL }));
      expect(Firma._encryptApiKey).toHaveBeenCalledWith(mockApiKey, mockPublicKeyBuffer);
      expect(instance.encryptedApiKey).toBe(mockEncryptedApiKey); // Usamos el mock global
      expect(instance.axiosInstance).toBe(mockAxiosCreateInstance);
    });
    // ... todos los demás casos de prueba para `build` que te proporcioné antes
  });

  // --- Pruebas para Métodos de Instancia (Usando Firma.build()) ---
  describe('Instance methods (initialized via Firma.build())', () => {
    let firmaInstance;

    beforeEach(async () => {
      // Configurar mocks para un Firma.build() exitoso
      // Esto asume que _loadPublicKeyFromFile y _encryptApiKey están correctamente espiados/mockeados
      // en el beforeEach general o aquí específicamente si es necesario.

      // Caso: Carga de clave pública desde archivo (el más común según el código)
      Firma._loadPublicKeyFromFile.mockReturnValue(mockPublicKeyBuffer); // Ya está en el beforeEach general
      Firma._encryptApiKey.mockReturnValue(mockEncryptedApiKey); // Ya está en el beforeEach general

      // Limpiar mocks de axios ANTES de llamar a build, para no contar llamadas de un build previo (si lo hubiera)
      mockAxiosGetFn.mockClear();
      mockAxiosPostFn.mockClear();
      // Asegurar que axios.create devuelve la instancia mockeada para la instancia de Firma
      axios.create.mockReturnValue(mockAxiosCreateInstance);


      firmaInstance = await Firma.build({
        BASE_URL: mockBaseURL,
        API_KEY: mockApiKey, // API Key en texto plano
        CERTS_DIR: mockCertsDir,
        CA_CRT: mockCaCrt
      });

      // Después de que build() haya podido usar axios.create y .get() (para clave API),
      // limpiamos los mocks de la instancia para las pruebas de los métodos POST.
      mockAxiosGetFn.mockClear(); // Limpiar llamadas 'get' que build pudo haber hecho
      mockAxiosPostFn.mockClear(); // Limpiar llamadas 'post' (improbable en build, pero por si acaso)
    });

    // Helper para verificar FormData y Headers en los métodos POST
    const checkPostCall = (methodName, endpoint, includeDatosField = false, expectArrayBuffer = false) => {
      const mockDatos = { test: "ok" };
      const mockCustomHeaders = { 'X-Custom-Test-Header': 'TestValue123' };
      
      const appendSpy = jest.spyOn(FormData.prototype, 'append');
      const getHeadersSpy = jest.spyOn(FormData.prototype, 'getHeaders').mockReturnValue({ 'form-data-boundary-header': 'boundary-value' });

      let promise;
      if (includeDatosField) { // Para 'firmar'
        promise = firmaInstance[methodName](mockDocumentoBuffer, mockDatos, mockCustomHeaders);
      } else { // Para los otros métodos
        promise = firmaInstance[methodName](mockDocumentoBuffer, mockCustomHeaders);
      }
      
      const expectedAxiosHeaders = {
        ...mockCustomHeaders,
        'form-data-boundary-header': 'boundary-value',
        'Authorization': mockEncryptedApiKey // La API key encriptada por build()
      };

      const expectedAxiosConfig = { headers: expectedAxiosHeaders };
      if (expectArrayBuffer) {
        expectedAxiosConfig.responseType = "arraybuffer";
      }
      
      expect(mockAxiosPostFn).toHaveBeenCalledWith(
        endpoint,
        expect.any(FormData), // El objeto FormData en sí
        expectedAxiosConfig
      );

      // Verificar que FormData.append fue llamado correctamente
      expect(appendSpy).toHaveBeenCalledWith('documento', mockDocumentoBuffer);
      if (includeDatosField) {
        expect(appendSpy).toHaveBeenCalledWith('datos', JSON.stringify(mockDatos, null, 0));
      }

      appendSpy.mockRestore();
      getHeadersSpy.mockRestore();
      return promise; // Devolvemos la promesa para aserciones de resolución/rechazo
    };

    it('firmar: should call API correctly and resolve with response data on success', async () => {
      const mockServerResponseBuffer = Buffer.from('signed document content');
      mockAxiosPostFn.mockResolvedValueOnce({ data: mockServerResponseBuffer });
      
      const promise = checkPostCall('firmar', '/sign-doc', true, true);
      await expect(promise).resolves.toEqual(mockServerResponseBuffer);
    });

    it('firmar: should reject if API call fails', async () => {
      const apiError = new Error('API Sign Error During Firmar');
      mockAxiosPostFn.mockRejectedValueOnce(apiError);
      
      const promise = checkPostCall('firmar', '/sign-doc', true, true);
      await expect(promise).rejects.toThrow(apiError);
    });

    it('comparar: should call API correctly and resolve with response data on success', async () => {
      const mockServerResponseData = { comparison: 'ok' };
      mockAxiosPostFn.mockResolvedValueOnce({ data: mockServerResponseData });

      const promise = checkPostCall('comparar', '/compare', false, false);
      await expect(promise).resolves.toEqual(mockServerResponseData);
    });
    
    it('comparar: should reject and log specific error message on 422 status', async () => {
      const apiError422 = { response: { status: 422, data: 'No third party signature' } };
      mockAxiosPostFn.mockRejectedValueOnce(apiError422);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const promise = checkPostCall('comparar', '/compare', false, false);
      await expect(promise).rejects.toEqual(apiError422);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Sin firma de tercero para comparar");
      
      consoleErrorSpy.mockRestore();
    });

    it('comparar: should reject on generic API error', async () => {
        const genericApiError = new Error('API Compare Generic Error');
        mockAxiosPostFn.mockRejectedValueOnce(genericApiError);
  
        const promise = checkPostCall('comparar', '/compare', false, false);
        await expect(promise).rejects.toThrow(genericApiError);
    });

    // Pruebas para getFirmas, getFirmasDetalles, getCertificados
    const createInstanceMethodTest = (methodName, apiEndpoint, responseData, includeDatos = false, expectBuffer = false) => {
      describe(methodName, () => {
        it('should call API correctly and resolve with response data on success', async () => {
          mockAxiosPostFn.mockResolvedValueOnce({ data: responseData });
          const promise = checkPostCall(methodName, apiEndpoint, includeDatos, expectBuffer);
          await expect(promise).resolves.toEqual(responseData);
        });

        it('should reject if API call fails', async () => {
          const apiError = new Error(`API Error for ${methodName}`);
          mockAxiosPostFn.mockRejectedValueOnce(apiError);
          const promise = checkPostCall(methodName, apiEndpoint, includeDatos, expectBuffer);
          await expect(promise).rejects.toThrow(apiError);
        });
      });
    };

    createInstanceMethodTest('getFirmas', '/get-data', { firmas: ['firma1'] });
    createInstanceMethodTest('getFirmasDetalles', '/get-data/full', { firmas_full: { detail: 'completo'} });
    createInstanceMethodTest('getCertificados', '/get-data/certificados', { certificados: ['cert1'] });
  });
});