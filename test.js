const path = require('path');
const fs = require('fs');
require('dotenv').config({path: path.join(__dirname, '.env')});
const argv = require('minimist')(process.argv.slice(2));

/*
  npm run dev -- --firmar
  npm run dev -- --comparar
  npm run dev -- --get-firmas
  npm run dev -- --get-firmas-full
  npm run dev -- --get-certificados

*/

//consigue los datos de certificados, claves y url del servidor
const {BASE_URL, CERTS_DIR, CA_CRT, CLIENT_CRT, CLIENT_KEY, API_KEY, TEST_DOCS_PATH} = process.env;

//importa la clase
const Firma = require('./index');

//crea la instancia del objeto con los parametros
const firma = new Firma({BASE_URL, CERTS_DIR, CA_CRT, CLIENT_CRT, CLIENT_KEY, API_KEY});

function firmarDocumentoTest (docOriginalPath, docFirmadoPath){
  return new Promise((resolve, reject) => {
    const docEjemplo = fs.readFileSync(docOriginalPath);

    firma.firmar(docEjemplo, {test:"ok"})
    .then((doc_firmado) => {
      fs.writeFileSync(docFirmadoPath, doc_firmado)
      resolve();
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
  })
}

function compararTest (docOriginalPath){
  return new Promise((resolve, reject) => {
    const docEjemplo = fs.readFileSync(docOriginalPath);

    firma.comparar(docEjemplo)
    .then((datos_firmas) => {
      console.log(datos_firmas);
      resolve();
    })
    .catch((error) => {
      if (error.response.status !== 422)
        console.error(error);
      process.exit(1);
    })
  })
}

function validarFirmaTest (docFirmadoPath){
  return new Promise((resolve, reject) => {
    const docEjemplo = fs.readFileSync(docFirmadoPath);
    
    firma.getFirmas(docEjemplo)
    .then((datos_firmas) => {
      console.log(datos_firmas);
      resolve()
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
  })
}
function validarFirmaFullTest (docFirmadoPath){
  return new Promise((resolve, reject) => {
    const docEjemplo = fs.readFileSync(docFirmadoPath);
    
    firma.getFirmasDetalles(docEjemplo)
    .then((datos_firmas) => {
      console.log(datos_firmas);
      resolve()
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
  })
}
function validarFirmaCertsTest (docFirmadoPath){
  return new Promise((resolve, reject) => {
    const docEjemplo = fs.readFileSync(docFirmadoPath);
    
    firma.getCertificados(docEjemplo)
    .then((datos_firmas) => {
      console.log(datos_firmas);
      resolve()
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
  })
}

if (argv['firmar']) {
  firmarDocumentoTest(
    path.join(TEST_DOCS_PATH, 'document.pdf'),
    path.join(TEST_DOCS_PATH, 'document_nuevo.pdf')
  )
}

if (argv['comparar']) {
  compararTest(
    path.join(TEST_DOCS_PATH, 'document_firmado.pdf')
  )
}

if (argv['get-firmas']) {
  validarFirmaTest(
    path.join(TEST_DOCS_PATH, 'document_firmado.pdf')
  )
}

if (argv['get-firmas-full']) {
  validarFirmaFullTest(
    path.join(TEST_DOCS_PATH, 'document_firmado.pdf')
  )
}

if (argv['get-certificados']) {
  validarFirmaCertsTest(
    path.join(TEST_DOCS_PATH, 'document_firmado.pdf')
  )
}