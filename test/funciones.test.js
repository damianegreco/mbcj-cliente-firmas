const fs = require('fs');
const path = require('path');
const { validarParametros, validarPaths } = require('../funciones'); // Asumiendo que funciones.js está en el mismo directorio

// Mockear el módulo fs para controlar existSync y statSync
jest.mock('fs');

describe('funciones.js', () => {
  describe('validarParametros', () => {
    it('should return true if all params are valid', () => {
      expect(validarParametros('a', 1, true, {})).toBe(true);
    });

    it('should return false if any param is null', () => {
      expect(validarParametros('a', null, 'c')).toBe(false);
    });

    it('should return false if any param is undefined', () => {
      expect(validarParametros('a', undefined, 'c')).toBe(false);
    });

    it('should return false if any param is an empty string', () => {
      expect(validarParametros('a', '', 'c')).toBe(false);
    });

    it('should return true for no parameters (vacuously true)', () => {
      // params.every() en un array vacío devuelve true
      expect(validarParametros()).toBe(true);
    });
  });

  describe('validarPaths', () => {
    const mockFilePath = '/fake/dir/file.txt';
    const mockDirPath = '/fake/dir';

    beforeEach(() => {
      // Reset mocks antes de cada prueba
      fs.existsSync.mockReset();
      fs.statSync.mockReset();
      // path.resolve se usará tal cual, no necesita mock complejo aquí a menos que queramos forzar errores específicos en él.
    });

    it('should return true for valid file paths', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => true });

      // path.resolve es idempotente si ya es una ruta absoluta, o la resuelve.
      // Para la prueba, nos aseguramos que la ruta que existSync y statSync "ven" es la que esperamos.
      jest.spyOn(path, 'resolve').mockImplementation(p => p === mockFilePath ? mockFilePath : p);


      expect(() => validarPaths(mockFilePath)).not.toThrow();
      expect(validarPaths(mockFilePath)).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
      expect(fs.statSync).toHaveBeenCalledWith(mockFilePath);
    });

    it('should throw an error if path is not a string', () => {
      expect(() => validarPaths(123)).toThrow('La ruta proporcionada "123" no es una cadena válida o está vacía.');
    });

    it('should throw an error if path is an empty string', () => {
      expect(() => validarPaths('  ')).toThrow('La ruta proporcionada "  " no es una cadena válida o está vacía.');
    });

    it('should throw an error if path does not exist', () => {
      const nonExistentPath = '/fake/nonexistent.txt';
      jest.spyOn(path, 'resolve').mockImplementation(p => p === nonExistentPath ? nonExistentPath : p);
      fs.existsSync.mockReturnValue(false);

      expect(() => validarPaths(nonExistentPath)).toThrow(`La ruta "${nonExistentPath}" no existe.`);
      expect(fs.existsSync).toHaveBeenCalledWith(nonExistentPath);
    });

    it('should throw an error if path is not a file (e.g., it is a directory)', () => {
      jest.spyOn(path, 'resolve').mockImplementation(p => p === mockDirPath ? mockDirPath : p);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => false }); // Simula que es un directorio

      expect(() => validarPaths(mockDirPath)).toThrow(`La ruta "${mockDirPath}" no apunta a un archivo.`);
      expect(fs.existsSync).toHaveBeenCalledWith(mockDirPath);
      expect(fs.statSync).toHaveBeenCalledWith(mockDirPath);
    });

    it('should validate multiple paths successfully', () => {
      const mockFilePath2 = '/fake/dir/file2.txt';
      jest.spyOn(path, 'resolve').mockImplementation(p => {
        if (p === mockFilePath) return mockFilePath;
        if (p === mockFilePath2) return mockFilePath2;
        return p;
      });

      fs.existsSync.mockImplementation(p => p === mockFilePath || p === mockFilePath2);
      fs.statSync.mockReturnValue({ isFile: () => true });

      expect(() => validarPaths(mockFilePath, mockFilePath2)).not.toThrow();
      expect(validarPaths(mockFilePath, mockFilePath2)).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath2);
    });

    it('should throw if any of multiple paths is invalid', () => {
      const mockFilePath2 = '/fake/dir/file2.txt';
      jest.spyOn(path, 'resolve').mockImplementation(p => {
        if (p === mockFilePath) return mockFilePath;
        if (p === mockFilePath2) return mockFilePath2;
        return p;
      });

      fs.existsSync.mockImplementation(p => p === mockFilePath); // Solo el primero existe
      fs.statSync.mockImplementation(p => p === mockFilePath ? { isFile: () => true } : { isFile: () => false } );


      expect(() => validarPaths(mockFilePath, mockFilePath2))
        .toThrow(`La ruta "${mockFilePath2}" no existe.`);
    });
  });
});