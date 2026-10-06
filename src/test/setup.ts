/**
 * Configuración común de las pruebas.
 *
 * Las pruebas corren en Node, donde no existe IndexedDB. fake-indexeddb implementa la misma
 * especificación W3C en memoria, de modo que Dexie se comporta igual que en el navegador
 * y cada archivo de pruebas parte de una base de datos vacía.
 */
import 'fake-indexeddb/auto';
