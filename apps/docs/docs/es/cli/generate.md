# dialex generate

Compila los diccionarios `.content.ts` en módulos estáticos para una ejecución en el servidor sin sobrecarga.

Salidas:

- `src/i18n.generated.ts`, el mapa estático de diccionarios que pasas como `dictionaries`.
- `src/dialex-env.d.ts`, la [ampliación del registro de tipos](../guide/type-safety.md).

```bash
dialex generate
dialex generate --watch
dialex gen -o src/custom.generated.ts
```

| Opción                | Descripción                                                  |
| --------------------- | ------------------------------------------------------------ |
| `-w, --watch`         | Vigila los archivos de diccionario y regenera al cambiar     |
| `-o, --output <path>` | Ruta de salida personalizada para los diccionarios generados |
| `-c, --config <path>` | Ruta de configuración personalizada                          |

Ejecútalo antes de compilar o iniciar cualquier aplicación de servidor, normalmente mediante el script `i18n:generate` que añade `init`.
