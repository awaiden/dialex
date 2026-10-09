# dialex generate

Compila los diccionarios `.content.ts` en módulos estáticos para una ejecución en el servidor sin sobrecarga.

Salidas:

- `src/dialex.generated.ts`, que exporta `dictionaries` (el export por defecto, para los adaptadores de servidor), `config` (una copia de tu configuración segura para el cliente) y `dialex` (`{ dictionaries, config }`, que se pasa con spread a `<DialexProvider {...dialex}>` o `createDialex({ ...dialex })`). Con `lazy: true` contiene imports dinámicos y un export `loaders` en su lugar. También exporta `locales` (una tupla de solo lectura, útil para un selector de idioma) y el tipo unión `Locale` correspondiente. Con `lazy: "locale"` los diccionarios se dividen además por locale, en una carpeta `dialex.locales/`.
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

Ejecútalo antes de compilar o iniciar cualquier aplicación de servidor, normalmente mediante el script `dx:generate` que añade `init`.

Nada genera este archivo por ti, así que mantenlo al día: ejecuta `dialex generate --watch` en una segunda terminal (reacciona a diccionarios añadidos, editados y eliminados y a cambios de configuración), usa la extensión de VS Code de Dialex (regenera al guardar) o ejecuta `dx generate` antes de `dev` y `build`. [`dialex check`](./check.md) informa de un archivo desactualizado como error, y `dialex check --fix` lo reescribe. Sin `dialex.config.*` se aplican los valores por defecto y los `locales` salen de tus diccionarios. `check` compara los archivos generados ignorando el formato (espacios, comillas, comas finales), así que un formateador como Prettier, Biome u oxfmt puede reescribirlos. Añadirlos a su lista de ignorados evita diffs ruidosos.
