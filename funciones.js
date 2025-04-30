const path = require('path');
const fs = require('fs')

function validarParametros(...params) {
  return params.every(param => param !== null && param !== undefined && param !== '');
}

function validarPaths(...paths) {
  return paths.every(p => {
    if (typeof p !== 'string' || p.trim() === '') return false;
    
    const resolvedPath = path.resolve(p);
    return fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
  });
}

module.exports = {validarParametros, validarPaths}