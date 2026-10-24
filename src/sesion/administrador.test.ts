import { describe, expect, it } from 'vitest';
import { contactoAdministrador } from './administrador';

/**
 * PU-35 · Ayuda para recuperar la contraseña: el contacto del administrador (RF-24, CU-01; hallazgo del desarrollo).
 * Especificación: docs/tecnica/33-recuperar-contrasena.md, sección 6
 */

describe('PU-35 · 1. El teléfono', () => {
  it('con o sin 57, con espacios, guiones o «+»: los enlaces de llamar y de WhatsApp y la forma visible', () => {
    const esperado = { visible: '300 123 4567', llamar: 'tel:+573001234567', whatsapp: 'https://wa.me/573001234567' };
    for (const escrito of ['3001234567', '300 123 4567', '300-123-4567', '+57 300 123 4567', '573001234567', '+573001234567']) {
      expect(contactoAdministrador('Daniel', escrito).telefono).toEqual(esperado);
    }
  });
});

describe('PU-35 · 2. Teléfono inválido o vacío', () => {
  it('sin un celular válido no hay botones', () => {
    for (const escrito of [undefined, '', '   ', '12345', '2001234567', '30012345678', '58 300 123 4567', 'abc']) {
      expect(contactoAdministrador('Daniel', escrito).telefono).toBeNull();
    }
  });
});

describe('PU-35 · 3 y 4. El nombre y la falta de configuración', () => {
  it('el nombre configurado, recortado; sin nombre, ninguno', () => {
    expect(contactoAdministrador('  Daniel Ramos ', '3001234567').nombre).toBe('Daniel Ramos');
    expect(contactoAdministrador(undefined, '3001234567').nombre).toBeNull();
    expect(contactoAdministrador('   ', undefined)).toEqual({ nombre: null, telefono: null });
  });

  it('solo el nombre, sin teléfono: el nombre sin botones', () => {
    expect(contactoAdministrador('Daniel Ramos', undefined)).toEqual({ nombre: 'Daniel Ramos', telefono: null });
  });
});
