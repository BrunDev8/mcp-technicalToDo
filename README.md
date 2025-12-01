# MCP Technical ToDo Server

Servidor MCP (Model Context Protocol) para gestión de listas de tareas con PostgreSQL.

## 🚀 Características

- Crear y gestionar múltiples listas de tareas
- Agregar, actualizar y eliminar items
- Marcar tareas como completadas
- Persistencia en PostgreSQL
- Integración con Claude Desktop

## 📋 Requisitos

- Node.js v20 o superior
- PostgreSQL v12 o superior instalado y corriendo
- npm o yarn

## ⚙️ Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd mcp-technicalToDo
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar credenciales de PostgreSQL

**IMPORTANTE**: Debes configurar tus credenciales locales de PostgreSQL.

#### Opción A: Crear archivo .env (Recomendado)

Crea un archivo `.env` en la raíz del proyecto:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=postgres
DB_PASSWORD=TU_CONTRASEÑA_AQUI
DB_PORT=5432
```

Reemplaza `TU_CONTRASEÑA_AQUI` con la contraseña de tu usuario de PostgreSQL local.

#### Opción B: Modificar los valores por defecto

Si no creas un archivo `.env`, edita estos archivos y reemplaza `'Bruno'` con tu contraseña:

- `src/server.ts` línea ~60: `password: process.env.DB_PASSWORD || 'TU_CONTRASEÑA',`
- `setup-db.js` línea ~9: `password: process.env.DB_PASSWORD || 'TU_CONTRASEÑA',`
- `test-db.js` línea ~9: `password: process.env.DB_PASSWORD || 'TU_CONTRASEÑA',`

### 4. Inicializar la base de datos

```bash
npm run setup-db
```

Este comando creará automáticamente las tablas `List` e `Item` con datos de ejemplo.

### 5. Verificar la conexión (Opcional)

```bash
npm run test-db
```

Si ves "✓ Conexión exitosa!", todo está configurado correctamente.

### 6. Compilar el proyecto

```bash
npm run build
```

## 🔧 Uso con Claude Desktop

### Configuración en Windows

1. Abre el archivo de configuración:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Agrega esta configuración (ajusta la ruta y contraseña):

```json
{
  "mcpServers": {
    "mcp-technicaltodo": {
      "command": "node",
      "args": ["C:\\ruta\\completa\\mcp-technicalToDo\\dist\\server.js"],
      "env": {
        "DB_USER": "postgres",
        "DB_HOST": "localhost",
        "DB_NAME": "postgres",
        "DB_PASSWORD": "TU_CONTRASEÑA_AQUI",
        "DB_PORT": "5432"
      }
    }
  }
}
```

3. **IMPORTANTE**: Reemplaza:
   - `C:\\ruta\\completa\\mcp-technicalToDo` con la ruta real donde clonaste el proyecto
   - `TU_CONTRASEÑA_AQUI` con tu contraseña de PostgreSQL

4. Reinicia Claude Desktop

### Configuración en Mac/Linux

1. Abre el archivo de configuración:
   ```bash
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

2. Agrega la configuración similar a Windows pero con rutas Unix:
   ```json
   {
     "mcpServers": {
       "mcp-technicaltodo": {
         "command": "node",
         "args": ["/ruta/completa/mcp-technicalToDo/dist/server.js"],
         "env": {
           "DB_USER": "postgres",
           "DB_HOST": "localhost",
           "DB_NAME": "postgres",
           "DB_PASSWORD": "TU_CONTRASEÑA_AQUI",
           "DB_PORT": "5432"
         }
       }
     }
   }
   ```

## 🛠️ Herramientas disponibles en Claude

Una vez configurado, puedes usar estos comandos en Claude:

- `create_list` - Crea una nueva lista de tareas
- `get_lists` - Obtiene todas las listas con sus items
- `create_item` - Crea un nuevo item en una lista
- `update_item` - Actualiza un item existente
- `complete_item` - Marca un item como completado
- `delete_item` - Elimina un item

**Ejemplo de uso en Claude:**
```
Crea una lista llamada "Proyecto X"
Agrega un item "Completar documentación" a la lista con ID 1
Marca el item 1 como completado
Muéstrame todas mis listas
```

## 📝 Scripts disponibles

- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Compila y ejecuta el servidor
- `npm run dev` - Modo desarrollo (compila y ejecuta)
- `npm run setup-db` - Inicializa/reinicia la base de datos con tablas limpias
- `npm run test-db` - Prueba la conexión a PostgreSQL

## 🗄️ Estructura de la base de datos

### Tabla `List`
- `id` (SERIAL PRIMARY KEY) - ID auto-generado
- `name` (VARCHAR) - Nombre de la lista

### Tabla `Item`
- `id` (SERIAL PRIMARY KEY) - ID auto-generado
- `Name` (VARCHAR) - Nombre del item
- `Description` (TEXT) - Descripción del item
- `IsComplete` (BOOLEAN) - Estado de completado
- `ListId` (INTEGER, FK) - Referencia a la lista padre

## 🐛 Solución de problemas comunes

### Error: "password authentication failed"

**Causa**: La contraseña de PostgreSQL es incorrecta.

**Solución**:
1. Verifica tu contraseña de PostgreSQL
2. Actualiza el archivo `.env` o los valores por defecto en el código
3. Reinicia Claude Desktop si estás usando MCP

### Error: "ECONNREFUSED"

**Causa**: PostgreSQL no está corriendo.

**Solución**:
```bash
# Windows (desde Services o pgAdmin)
# Busca el servicio "postgresql" y inícialo

# Linux
sudo service postgresql start

# Mac
brew services start postgresql
```

### Error: "relation does not exist"

**Causa**: Las tablas no fueron creadas.

**Solución**:
```bash
npm run setup-db
```

### Error: "Cannot find module"

**Causa**: Dependencias no instaladas o proyecto no compilado.

**Solución**:
```bash
npm install
npm run build
```

## 🔒 Seguridad

⚠️ **IMPORTANTE**:
- **NUNCA** compartas tu archivo `.env`
- **NUNCA** hagas commit de contraseñas
- El `.gitignore` ya protege tu archivo `.env`
- En producción, usa variables de entorno del sistema
- Considera usar secretos de ambiente en servicios cloud

## 📄 Licencia

ISC

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Haz commit de tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Si tienes problemas:
1. Verifica la sección "Solución de problemas"
2. Revisa que PostgreSQL esté corriendo
3. Confirma que las credenciales sean correctas
4. Abre un issue en GitHub con los detalles del error
