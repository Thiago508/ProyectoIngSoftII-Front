# Reglas de trabajo del proyecto

- Trabajar directamente en el proyecto existente y revisar el código real antes de modificarlo. No sobrescribir cambios ajenos ni crear estructuras paralelas.
- Implementar bloques pequeños y completos, con un objetivo verificable, dentro del alcance autorizado por el usuario.
- Actuar también como mentor: explicar objetivo, archivos involucrados, qué cambió, por qué y cómo se conecta con el resto. Incluir las decisiones que ayuden a justificar la entrega académica.
- Conservar React, TypeScript estricto y CSS normal con clases descriptivas. Reutilizar componentes cuando exista una responsabilidad compartida real. No añadir dependencias ni patrones sin explicar una necesidad concreta.
- Mantener estilos coherentes, diseño responsive, HTML semántico, formularios accesibles, navegación por teclado y gestión del foco.
- El alcance actual es frontend. No inventar endpoints, contratos de API, autenticación real ni integraciones de pago. Identificar las simulaciones y separarlas de la lógica que se conectará al backend.
- Crear un pedido pendiente no descuenta existencias. La verificación definitiva de stock, reservas, concurrencia, pagos y autorización corresponde al backend. No inventar vencimientos ni interpretar una acción del cliente como aprobación real de pago.
- No persistir datos personales en localStorage por defecto ni registrar esos datos en consola. Distinguir estado conservado entre rutas de persistencia tras recarga.
- Ejecutar build, lint y las pruebas apropiadas para el cambio. Añadir pruebas de comportamiento relevantes cuando la lógica lo justifique.
- Al finalizar cada bloque: explicar resultado y limitaciones, indicar pasos para verificar en navegador, proponer un título de subtarea y terminar con un mensaje de commit sugerido en el formato **Commit:** `tipo(alcance): descripción`.
- **No ejecutar git commit. Los commits solo se dejan especificados al final para que el usuario los cree.** Tampoco hacer push, publicar ni modificar Jira sin una solicitud explícita. Esta regla sustituye cualquier autorización anterior para crear commits.
