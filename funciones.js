const path = require('path');
const fs = require('fs');

const validarParametros = (...params) => {
  return params.every(param => param !== null && param !== undefined && param !== '');
};

const validarPaths = (...paths) => {
  for (const p of paths) {
    if (typeof p !== 'string' || p.trim() === '') {
      throw new Error(`La ruta proporcionada "${p}" no es una cadena válida o está vacía.`);
    }

    const resolvedPath = path.resolve(p);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`La ruta "${resolvedPath}" no existe.`);
    }

    if (!fs.statSync(resolvedPath).isFile()) {
      throw new Error(`La ruta "${resolvedPath}" no apunta a un archivo.`);
    }
  }
  return true;
};

module.exports = { validarParametros, validarPaths };