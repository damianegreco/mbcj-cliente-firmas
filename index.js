const axios = require('axios');
const path = require('path');
const fs = require('fs')
const { Agent } = require('https');
const FormData = require('form-data');

const { validarParametros, validarPaths } = require('./funciones');

class Firma {
  httpsAgent;
  axiosInstance;
  api_key;

  constructor({BASE_URL, CERTS_DIR, CA_CRT, CLIENT_CRT, CLIENT_KEY, API_KEY}){
    if (!validarParametros(BASE_URL, CERTS_DIR, CA_CRT, CLIENT_CRT, CLIENT_KEY, API_KEY)) 
      throw new Error("Indique los parametros necesarios");
      
    this.api_key = API_KEY;

    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });

    this.getCertificadosCliente(CERTS_DIR, CA_CRT, CLIENT_CRT, CLIENT_KEY)
  }

  getCertificadosCliente(CERTS_DIR, CA_CRT, CLIENT_CRT, CLIENT_KEY){

    const certPath = path.join(CERTS_DIR, CLIENT_CRT);
    const keyPath = path.join(CERTS_DIR, CLIENT_KEY);
    const caPath = path.join(CERTS_DIR, CA_CRT);

    if(!validarPaths(certPath, keyPath, caPath))
      throw new Error("Certificados no encontrados");
      
    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    const ca = fs.readFileSync(caPath);

    try {
      this.httpsAgent = new Agent({
        cert, key, ca,
        rejectUnauthorized: true 
      });
    } catch (error) {
      throw new Error("Problema al cargar certificados");
    }
  }

  firmar(documentoBuffer, datos, headers = {}){
    return new Promise((resolve, reject) => {
      let form = new FormData();
      form.append('documento', documentoBuffer);
      form.append('datos', JSON.stringify(datos, null, 0));
  
      const headersDef = { ...headers, ...form.getHeaders(), authorization: this.api_key }
  
      this.axiosInstance.post('/sign-doc', form, { httpsAgent: this.httpsAgent, headers: headersDef, responseType: "arraybuffer" } )
      .then((response) => resolve(response.data))
      .catch((error) => reject(error));
    })     
  }

  comparar(documentoBuffer, headers = {}){
    return new Promise((resolve, reject) => {
      let form = new FormData();
      form.append('documento', documentoBuffer);

      const headersDef = { ...headers, ...form.getHeaders(), authorization: this.api_key }
    
      this.axiosInstance.post('/compare', form, { httpsAgent: this.httpsAgent, headers: headersDef })
      .then((response) => resolve(response.data))
      .catch((error) => {
        
        if (error.response && error.response.status === 422) {
          console.error("Sin firma de tercero para comparar");
        }
        reject(error)
      });
    })
  }

  getFirmas(documentoBuffer, headers = {}){
    return new Promise((resolve, reject) => {
      let form = new FormData();
      form.append('documento', documentoBuffer);

      const headersDef = { ...headers, ...form.getHeaders()}
    
      this.axiosInstance.post('/get-data', form, { httpsAgent: this.httpsAgent, headers: headersDef })
      .then((response) => resolve(response.data))
      .catch((error) => reject(error));
    })
  }

  getFirmasDetalles(documentoBuffer, headers = {}){
    return new Promise((resolve, reject) => {
      let form = new FormData();
      form.append('documento', documentoBuffer);

      const headersDef = { ...headers, ...form.getHeaders() }

      this.axiosInstance.post('/get-data/full', form, { httpsAgent: this.httpsAgent, headers: headersDef })
      .then((response) => resolve(response.data))
      .catch((error) => reject(error));
    })
  }

  getCertificados(documentoBuffer, headers = {}){
    return new Promise((resolve, reject) => {
      let form = new FormData();
      form.append('documento', documentoBuffer);

      const headersDef = { ...headers, ...form.getHeaders() }

      this.axiosInstance.post('/get-data/certificados', form, { httpsAgent: this.httpsAgent, headers: headersDef })
      .then((response) => resolve(response.data))
      .catch((error) => reject(error));
    })
  }
}

module.exports = Firma;