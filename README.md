# mbcj-cliente-firma

## Descripción del Proyecto

El módulo `mbcj-cliente-firma` funciona como un puente entre tu aplicación y un servicio externo de firma y validación de documentos. Su principal objetivo es simplificar la manera en que te conectas y usas este servicio.

En lugar de que tu proyecto deba manejar toda la comunicación compleja con el servicio de firmas, esta librería te ofrece un conjunto de funciones claras y fáciles de usar. Así, puedes integrar funcionalidades de firma electrónica —como enviar documentos a firmar o validarlos— de forma más rápida y sencilla, permitiéndote concentrarte en las tareas principales de tu aplicación.

## Características / Funcionalidades

`mbcj-cliente-firma` está diseñado para simplificar la interacción con un servicio de firma digital, ofreciendo funcionalidades como:

* **Configuración Sencilla del Cliente:**
    * Permite inicializar y configurar fácilmente el cliente con credenciales (API keys, tokens) y la URL del servicio de firma.
    * Posibilidad de establecer parámetros por defecto para las solicitudes.

* **Envío de Documentos para Firma:**
    * Soporte para cargar documentos (ej. PDFs, Word) desde el sistema de archivos o buffers de memoria para ser enviados al proceso de firma (utilizando `form-data` si es necesario).
    * Capacidad para especificar uno o múltiples firmantes, incluyendo su información (nombre, email, rol).
    * Opción de definir el orden de firma si el proceso es secuencial.

* **Gestión del Proceso de Firma:**
    * Funciones para iniciar un nuevo sobre o solicitud de firma con los documentos y firmantes configurados.
    * Posibilidad de añadir metadatos a la solicitud (ej. mensajes personalizados para los firmantes, fechas de caducidad).

* **Validación de Firmas (Opcional):**
    * (Si aplica) Herramientas para verificar la validez e integridad de las firmas en un documento ya procesado, posiblemente interactuando con el servicio.

* **Manejo de Errores Específicos:**
    * Proporciona información clara y detallada sobre errores devueltos por el servicio de firma, facilitando la depuración.

* **Flexibilidad en la Comunicación:**
    * Utiliza `axios` para una comunicación HTTP robusta y configurable con el servicio de firma.

## Estructura del Proyecto

Una estructura típica para este proyecto podría ser:
```
/
├── index.js              # Punto de entrada principal (exporta la clase Firma)
├── funciones.js          # Módulo con funciones auxiliares (ej: validarParametros)
├── test.js               # Script para pruebas y ejecución de ejemplos
├── .env.example          # Ejemplo de archivo de variables de entorno
├── package.json          # Metadatos del proyecto, dependencias y scripts
└── README.md             # Este archivo
```
*(Esta estructura se basa en los archivos `index.js` (Firma.js) y `test.js` que proporcionaste).*

## Tecnologías / Dependencias

* **Node.js**: (Versión no especificada, se recomienda indicar la versión de desarrollo/prueba, ej: >=18.x. Usa CommonJS).
* **Peer Dependencies**:
    * `axios`: `^1.9.0` (Cliente HTTP para comunicación con el servicio).
    * `form-data`: `^4.0.2` (Para enviar datos de formulario, incluyendo archivos).
    * *Nota: Quien instale `mbcj-cliente-firma` debe tener estas dependencias en su proyecto.*
* **Dev Dependencies**:
    * `dotenv`: `^16.5.0` (Para cargar variables de entorno desde `.env` en desarrollo).
    * `minimist`: `^1.2.8` (Para parsear argumentos de línea de comandos en `test.js`).
* **Módulos Nativos de Node.js Utilizados**:
    * `path`: Para manejo de rutas de archivos.
    * `fs`: Para operaciones del sistema de archivos (leer documentos).
    * `crypto`: Para operaciones de encriptación (encriptar la API Key).

## Instalación

Para instalar `mbcj-cliente-firma` como una dependencia en tu proyecto:

```bash
npm install mbcj-cliente-firma
# o
yarn add mbcj-cliente-firma
```

Asegúrate también de tener instaladas las `peerDependencies` (`axios`, `form-data`) en tu proyecto:
```bash
npm install axios form-data
# o
yarn add axios form-data
```

## Uso

Esta librería está diseñada para ser instanciada a través de un método constructor asíncrono `build`, que maneja la configuración inicial, incluyendo la obtención de una clave pública y la encriptación de tu API Key.

### 1. Inicialización del Cliente

Para comenzar a usar el cliente de firma, primero debes importarlo y luego construir una instancia usando el método estático `Firma.build()`. Este método requiere tu URL base del servicio y tu API Key. Opcionalmente, puedes proporcionar rutas a certificados locales.

```javascript
// Requerir la clase Firma
const Firma = require('mbcj-cliente-firma'); // O la ruta a tu archivo index.js

// Cargar variables de entorno (recomendado para API keys y URLs)
// Ejemplo: require('dotenv').config();

async function inicializarCliente() {
  try {
    const firmaClient = await Firma.build({
      BASE_URL: process.env.BASE_URL,         // URL base del servicio de firma
      API_KEY: process.env.API_KEY,           // Tu API Key en texto plano
      CERTS_DIR: process.env.CERTS_DIR,       // (Opcional) Directorio de certificados locales
      CA_CRT: process.env.CA_CRT              // (Opcional) Nombre del archivo CA si usas CERTS_DIR
    });
    console.log('Cliente de Firma inicializado correctamente.');
    return firmaClient;
  } catch (error) {
    console.error('Error al inicializar el cliente de Firma:', error.message);
    throw error;
  }
}

// Uso:
// inicializarCliente().then(cliente => {
//   // Ahora puedes usar 'cliente' para llamar a los métodos de firma
//   // Ejemplo: usarCliente(cliente);
// }).catch(error => {
//   // Manejar error de inicialización
// });
```
**Nota sobre la obtención de la Clave Pública:**
El método `Firma.build()` intentará primero cargar una clave pública desde un archivo local si se proporcionan `CERTS_DIR` y `CA_CRT`. Si esto falla o no se proporcionan, intentará obtener la clave pública desde el endpoint `/certs/http/public-key` de tu `BASE_URL`. La `API_KEY` que proporciones se encriptará con esta clave pública antes de ser utilizada en las solicitudes.

### 2. Funcionalidades Principales

Una vez que la instancia de `Firma` (ej. `firmaClient`) está inicializada, puedes usar sus métodos para interactuar con el servicio de firma. Todos los métodos que realizan llamadas de red devuelven Promesas.

#### a. Firmar un Documento

Para firmar un documento, necesitas el contenido del documento como un `Buffer` y un objeto con datos adicionales.

```javascript
const fs = require('fs');
const path = require('path');

async function firmarUnDocumento(firmaClient, rutaDocumentoOriginal, datosParaFirma) {
  try {
    const documentoBuffer = fs.readFileSync(rutaDocumentoOriginal);
    const documentoFirmadoBuffer = await firmaClient.firmar(documentoBuffer, datosParaFirma);
    
    const rutaFirmado = path.join(__dirname, 'documento_firmado_ejemplo.pdf'); // Ajusta la ruta y nombre
    fs.writeFileSync(rutaFirmado, documentoFirmadoBuffer);
    console.log(`Documento firmado y guardado en: ${rutaFirmado}`);
    return documentoFirmadoBuffer;
  } catch (error) {
    console.error('Error al firmar el documento:', error.message);
  }
}

// Ejemplo de uso (asumiendo que 'cliente' es una instancia inicializada de Firma):
// const datosAdicionales = { usuarioId: "usr_123", motivo: "Aprobación de contrato" };
// firmarUnDocumento(cliente, './documentos/contrato.pdf', datosAdicionales);
```

#### b. Comparar Documento (Verificar Firmas de Terceros)

Este método permite enviar un documento para que el servicio verifique si contiene firmas de terceros.

```javascript
async function compararUnDocumento(firmaClient, rutaDocumento) {
  try {
    const documentoBuffer = fs.readFileSync(rutaDocumento);
    const resultadoComparacion = await firmaClient.comparar(documentoBuffer);
    console.log('Resultado de la comparación:', resultadoComparacion);
    return resultadoComparacion;
  } catch (error) {
    if (error.response && error.response.status === 422) {
      console.warn("Advertencia: El documento no contiene firmas de terceros para comparar (código 422).");
    } else {
      console.error('Error al comparar el documento:', error.message);
    }
  }
}

// Ejemplo de uso:
// compararUnDocumento(cliente, './documentos/documento_recibido.pdf');
```

#### c. Obtener Datos de Firmas

Puedes obtener información sobre las firmas contenidas en un documento.

```javascript
async function obtenerDatosFirmas(firmaClient, rutaDocumento) {
  try {
    const documentoBuffer = fs.readFileSync(rutaDocumento);
    const datosFirmas = await firmaClient.getFirmas(documentoBuffer);
    console.log('Datos de las firmas:', datosFirmas);
    return datosFirmas;
  } catch (error) {
    console.error('Error al obtener las firmas:', error.message);
  }
}

// Ejemplo de uso:
// obtenerDatosFirmas(cliente, './documentos/documento_para_verificar.pdf');
```

#### d. Obtener Detalles Completos de Firmas

Para una información más exhaustiva de las firmas.

```javascript
async function obtenerDetallesCompletosFirmas(firmaClient, rutaDocumento) {
  try {
    const documentoBuffer = fs.readFileSync(rutaDocumento);
    const detallesCompletos = await firmaClient.getFirmasDetalles(documentoBuffer);
    console.log('Detalles completos de las firmas:', detallesCompletos);
    return detallesCompletos;
  } catch (error) {
    console.error('Error al obtener los detalles completos de las firmas:', error.message);
  }
}

// Ejemplo de uso:
// obtenerDetallesCompletosFirmas(cliente, './documentos/documento_auditado.pdf');
```

#### e. Obtener Certificados del Documento

Permite recuperar los certificados asociados a las firmas de un documento.

```javascript
async function obtenerCertificadosDeDocumento(firmaClient, rutaDocumento) {
  try {
    const documentoBuffer = fs.readFileSync(rutaDocumento);
    const certificados = await firmaClient.getCertificados(documentoBuffer);
    console.log('Certificados del documento:', certificados);
    return certificados;
  } catch (error) {
    console.error('Error al obtener los certificados:', error.message);
  }
}

// Ejemplo de uso:
// obtenerCertificadosDeDocumento(cliente, './documentos/documento_con_certificados.pdf');
```

### 3. Script de Prueba (`test.js`)

El archivo `test.js` que acompaña a esta librería sirve como un script de demostración y prueba. Utiliza `dotenv` para cargar la configuración (como `BASE_URL`, `API_KEY`, etc.) desde un archivo `.env` y `minimist` para procesar argumentos de línea de comandos que determinan la acción a ejecutar.

**Configuración para `test.js`:**
Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
```env
BASE_URL=[https://tu.api.servicio.firma](https://tu.api.servicio.firma)
API_KEY=TU_API_KEY_EN_TEXTO_PLANO
CERTS_DIR=./ruta/a/tus/certificados_locales (opcional)
CA_CRT=nombre_de_tu_ca.crt (opcional, si usas CERTS_DIR)
TEST_DOCS_PATH=./ruta/a/tus/documentos_de_prueba
```

**Ejecución de `test.js`:**
Una vez configurado el `.env`, puedes ejecutar las diferentes acciones:
```bash
# Para firmar un documento (definido en test.js, usualmente desde TEST_DOCS_PATH)
node test.js --firmar

# Para comparar un documento
node test.js --comparar

# Para obtener datos de firmas de un documento
node test.js --get-firmas 

# Para obtener detalles completos de firmas
node test.js --get-firmas-full

# Para obtener certificados
node test.js --get-certificados
```
Revisa el contenido de `test.js` para entender las rutas de archivo específicas que utiliza y cómo maneja las operaciones.

## Pruebas

El archivo `test.js` sirve como el principal medio para probar las funcionalidades de la librería de forma manual o mediante scripts. Para ejecutarlo, sigue las instrucciones de la sección "Script de Prueba (`test.js`)" dentro del apartado de "Uso".

No se incluye un framework de pruebas automatizadas formal (como Jest o Mocha) en las `devDependencies` listadas. Si deseas implementar pruebas unitarias o de integración más robustas, considera añadir el framework de tu elección.

## Licencia

Distribuido bajo la Licencia ISC. (Según lo especificado en el `package.json` del proyecto).

## Contacto

Autor: **damianegreco**