
# Cliente de firmador

Librería para acceder a los recursos del firmador/validador de firmas del Ministerio de Bienestar Ciduadano y Justicia.

Tiene los métodos necesarios para poder firmar, comparar, obtener datos, obtener detalles y obtener certificados de las firmas de los documentos.

## Instalación

Instalar la librería con NPM

```bash
  npm i mbcj-cliente-firma
```


## Uso y ejemplo

### Importar y crear una instancia de la clase

```javascript
import {Firma} from 'mbcj-cliente-firma';


const firma = new Firma({BASE_URL, CERTS_DIR, CA_CRT, CLIENT_CRT, CLIENT_KEY, API_KEY});
```

### Firmar un documento
```javascript
firma.firmar(docEjemplo, {test:"ok"})
.then((doc_firmado) => {
    fs.writeFileSync(docFirmadoPath, doc_firmado)
    resolve();
})
.catch((error) => {
    console.error(error);
    process.exit(1);
})
```

### Comparar firmas de un documento
```javascript
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
```

### Obtener firmas (resumen) de un documento
```javascript
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
```

### Obtener detalle de firmas de un documento
```javascript
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
```

### Obtener certificados de firmas del documetno
```javascript
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
```


## Variables de entorno

Se recomienda tener en el .env los datos del constructor:

`BASE_URL` URL del servicio de firmas. Ej.: https://mbcj.tierradelfuego.gob.ar/api/firmas

`CERTS_DIR` Ruta absulta al directorio de certificados.

`CA_CRT` Nombre del certificado de la Autoridad Certificante (dentro del directorio de certificados).

`CLIENT_CRT` Nombre del certificado del cliente (dentro del directorio de certificados).

`CLIENT_KEY` Nombre del archivo key del cliente(dentro del directorio de certificados).

`API_KEY` Clave secreta otorgada al cliente,