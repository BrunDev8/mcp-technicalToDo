# MCP Technical ToDo

Un servidor MCP (Model Context Protocol) para gestionar listas de tareas técnicas conectado a una API REST.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Cómo Ejecutar](#cómo-ejecutar)
- [Tools Disponibles](#tools-disponibles)
- [Integración con Claude Desktop](#integración-con-claude-desktop)
- [Arquitectura](#arquitectura)
- [Ejemplos de Uso](#ejemplos-de-uso)

## Requisitos Previos

- Node.js v18 o superior
- npm o yarn
- API REST backend ejecutándose (ver sección Arquitectura)
- Claude Desktop (opcional, para integración)

## Instalación

```bash
npm install
```

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# API Base URL (requerido)
API_BASE=http://localhost:5083
```

### 2. Compilar el Proyecto

```bash
npm run build
```

## Cómo Ejecutar

**Modo desarrollo:**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

El servidor MCP utiliza comunicación stdio (entrada/salida estándar) para conectarse con clientes MCP como Claude Desktop.

## Tools Disponibles

### Gestión de Listas

- **`create_list`** - Crea una nueva lista
  - `name` (string, requerido)

- **`get_lists`** - Obtiene todas las listas con sus items

### Gestión de Items

- **`create_item`** - Crea un nuevo item
  - `listId` (number, requerido)
  - `name` (string, requerido)
  - `description` (string, opcional)

- **`get_items`** - Obtiene items, opcionalmente filtrados por lista
  - `listId` (number, opcional)

- **`get_item`** - Obtiene un item específico
  - `itemId` (number, requerido)

- **`update_item`** - Actualiza un item existente
  - `itemId` (number, requerido)
  - `name` (string, opcional)
  - `description` (string, opcional)
  - `isComplete` (boolean, opcional)

- **`complete_item`** - Marca un item como completado
  - `itemId` (number, requerido)

- **`delete_item`** - Elimina un item
  - `itemId` (number, requerido)

## Integración con Claude Desktop

### Ubicación del Archivo de Configuración

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Configuración

Edita `claude_desktop_config.json`:

```json
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:Bruno@localhost:5432/postgres"
      ]
    },
    "mcp-technicalToDo": {
      "command": "node",
      "args": [
        "C:\\Users\\2024\\Desktop\\mcp-technicalToDo\\dist\\server.js"
      ],
      "cwd": "C:\\Users\\2024\\Desktop\\mcp-technicalToDo",
      "env": {
        "DB_USER": "postgres",
        "DB_HOST": "localhost",
        "DB_NAME": "postgres",
        "DB_PASSWORD": "Bruno",
        "DB_PORT": "5432"
      }
    }
  }
```

**Nota:** Ajusta la ruta en `args` a la ubicación real de tu proyecto. En Windows, usa `\\` o `/` en las rutas.

Reinicia Claude Desktop para aplicar los cambios.

## Arquitectura

El servidor MCP actúa como intermediario entre Claude Desktop y una API REST backend.

### API REST Backend

**Puerto por defecto:** `5083`  
**URL:** `http://localhost:5083`

**Endpoints requeridos:**
- `GET /api/lists` - Listar todas las listas
- `POST /api/lists` - Crear lista
- `GET /api/items` - Listar items
- `GET /api/items/{id}` - Obtener item
- `POST /api/items` - Crear item
- `PUT /api/items/{id}` - Actualizar item
- `DELETE /api/items/{id}` - Eliminar item

**Timeout de peticiones:** 8000ms (configurable en `src/server.ts`)

## Ejemplos de Uso

### Con Claude Desktop

```
Crea una lista llamada "Proyecto Frontend" y agrega estas tareas:
- Configurar React Router
- Implementar sistema de autenticación
```

```
Muéstrame todas mis listas de tareas
```

```
Marca como completada la tarea con ID 5
```

### Testing con cURL

```bash
# Crear una lista
curl -X POST http://localhost:5083/api/lists \
  -H "Content-Type: application/json" \
  -d "{\"Name\": \"Mi Lista\"}"

# Crear un item
curl -X POST http://localhost:5083/api/items \
  -H "Content-Type: application/json" \
  -d "{\"ListId\": 1, \"Name\": \"Tarea\", \"Description\": \"Descripción\", \"IsComplete\": false}"

# Completar un item
curl -X PUT http://localhost:5083/api/items/1 \
  -H "Content-Type: application/json" \
  -d "{\"IsComplete\": true}"
```

## Troubleshooting

**MCP no se conecta:**
- Verifica que el proyecto esté compilado: `npm run build`
- Revisa la ruta en `claude_desktop_config.json`
- Reinicia Claude Desktop

**API no responde:**
- Asegúrate de que la API REST esté ejecutándose en el puerto 5083
- Verifica la variable `API_BASE` en `.env`

**Timeout en peticiones:**
- Ajusta `DEFAULT_TIMEOUT_MS` en `src/server.ts` si es necesario
