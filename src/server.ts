import 'dotenv/config';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
CallToolRequestSchema,
ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pkg from 'pg';
const { Pool } = pkg;

interface CreateItemArgs {
    listId: number;
    name: string;
    description: string;
}

interface UpdateItemArgs {
    itemId: number;
    name?: string;
    description?: string;
    isComplete?: boolean;
}

interface CompleteItemArgs {
    itemId: number;
}

interface DeleteItemArgs {
    itemId: number;
}

interface CreateListArgs {
    name: string;
}

// Estructura de datos basada en las tablas de la BD
interface Item {
    id: number;
    name: string;
    description: string;
    iscomplete: boolean;
    listid: number;
}

interface List {
    id: number;
    name: string;
}

// Configuración de conexión a PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password',
    port: parseInt(process.env.DB_PORT || '5432'),
});

const server = new Server(
    {
        name: "mcp-technicaltodo",
        version: "0.0.1",
    },
    {
        capabilities: {
            tools: {},
        },
    },
);
//Register herramienta disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "create_item",
                description: "Creates a new to-do item in a specific list.",
                inputSchema: {
                    type: "object",
                    properties: {
                        listId: { type: "number", description: "The ID of the list where the item will be created." },
                        name: { type: "string", description: "The name of the to-do item." },
                        description: { type: "string", description: "The description of the to-do item." },
                    },
                    required: ["listId", "name", "description"],
                },
            },
            {
                name: "update_item",
                description: "Updates an existing to-do item (e.g., change its name or description).",
                inputSchema: {
                    type: "object",
                    properties: {
                        itemId: { type: "number", description: "The ID of the item to update." },
                        name: { type: "string", description: "The new name for the item." },
                        description: { type: "string", description: "The new description for the item." },
                        isComplete: { type: "boolean", description: "Whether the item is complete." },
                    },
                    required: ["itemId"],
                },
            },
            {
                name: "complete_item",
                description: "Marks a to-do item as completed.",
                inputSchema: {
                    type: "object",
                    properties: {
                        itemId: { type: "number", description: "The ID of the item to complete." },
                    },
                    required: ["itemId"],
                },
            },
            {
                name: "delete_item",
                description: "Deletes a to-do item from a list.",
                inputSchema: {
                    type: "object",
                    properties: {
                        itemId: { type: "number", description: "The ID of the item to delete." },
                    },
                    required: ["itemId"],
                },
            },
            {
                name: "create_list",
                description: "Creates a new to-do list.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "The name of the new list." },
                    },
                    required: ["name"],
                },
            },
            {
                name: "get_lists",
                description: "Retrieves all to-do lists with their items.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});

//Handle tool requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const {name, arguments: args} = request.params;

    // Crear un ítem en una lista específica
    if (name === "create_item") {
        const { listId, name: itemName, description } = args as unknown as CreateItemArgs;
        
        try {
            // Verificar que la lista existe
            const listCheck = await pool.query('SELECT id, name FROM "List" WHERE id = $1', [listId]);
            if (listCheck.rows.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: List with ID '${listId}' not found. Please create the list first.`,
                        },
                    ],
                    isError: true,
                };
            }

            // Insertar el nuevo ítem
            const result = await pool.query(
                'INSERT INTO "Item" ("Name", "Description", "IsComplete", "ListId") VALUES ($1, $2, $3, $4) RETURNING *',
                [itemName, description, false, listId]
            );

            const newItem = result.rows[0];
            const listName = listCheck.rows[0].name;

            return {
                content: [
                    {
                        type: "text",
                        text: `Item created successfully!\nID: ${newItem.id}\nName: ${newItem.Name}\nDescription: ${newItem.Description}\nList: ${listName}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error creating item: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    // Actualizar un ítem existente
    if (name === "update_item") {
        const { itemId, name: itemName, description, isComplete } = args as unknown as UpdateItemArgs;
        
        try {
            // Verificar que el ítem existe
            const itemCheck = await pool.query('SELECT * FROM "Item" WHERE id = $1', [itemId]);
            if (itemCheck.rows.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: Item with ID '${itemId}' not found.`,
                        },
                    ],
                    isError: true,
                };
            }

            // Construir la consulta de actualización dinámicamente
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (itemName !== undefined) {
                updates.push(`"Name" = $${paramIndex}`);
                values.push(itemName);
                paramIndex++;
            }
            if (description !== undefined) {
                updates.push(`"Description" = $${paramIndex}`);
                values.push(description);
                paramIndex++;
            }
            if (isComplete !== undefined) {
                updates.push(`"IsComplete" = $${paramIndex}`);
                values.push(isComplete);
                paramIndex++;
            }

            if (updates.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No fields to update. Please provide at least one field (name, description, or isComplete).",
                        },
                    ],
                };
            }

            values.push(itemId);
            const query = `UPDATE "Item" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
            const result = await pool.query(query, values);
            const updatedItem = result.rows[0];

            return {
                content: [
                    {
                        type: "text",
                        text: `Item updated successfully!\nID: ${updatedItem.id}\nName: ${updatedItem.Name}\nDescription: ${updatedItem.Description}\nCompleted: ${updatedItem.IsComplete}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error updating item: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    // Completar un ítem (marcarlo como finalizado)
    if (name === "complete_item") {
        const { itemId } = args as unknown as CompleteItemArgs;
        
        try {
            const result = await pool.query(
                'UPDATE "Item" SET "IsComplete" = true WHERE id = $1 RETURNING *',
                [itemId]
            );

            if (result.rows.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: Item with ID '${itemId}' not found.`,
                        },
                    ],
                    isError: true,
                };
            }

            const completedItem = result.rows[0];

            return {
                content: [
                    {
                        type: "text",
                        text: `Item marked as completed! ✓\nID: ${completedItem.id}\nName: ${completedItem.Name}\nDescription: ${completedItem.Description}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error completing item: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    // Eliminar un ítem de una lista
    if (name === "delete_item") {
        const { itemId } = args as unknown as DeleteItemArgs;
        
        try {
            // Obtener información del ítem antes de eliminarlo
            const itemQuery = await pool.query(
                'SELECT i.*, l.name as list_name FROM "Item" i JOIN "List" l ON i."ListId" = l.id WHERE i.id = $1',
                [itemId]
            );

            if (itemQuery.rows.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: Item with ID '${itemId}' not found.`,
                        },
                    ],
                    isError: true,
                };
            }

            const deletedItem = itemQuery.rows[0];

            // Eliminar el ítem
            await pool.query('DELETE FROM "Item" WHERE id = $1', [itemId]);

            return {
                content: [
                    {
                        type: "text",
                        text: `Item deleted successfully!\nDeleted item: ${deletedItem.Name}\nFrom list: ${deletedItem.list_name}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error deleting item: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    // Crear una nueva lista
    if (name === "create_list") {
        const { name: listName } = args as unknown as CreateListArgs;
        
        try {
            const result = await pool.query(
                'INSERT INTO "List" (name) VALUES ($1) RETURNING *',
                [listName]
            );

            const newList = result.rows[0];

            return {
                content: [
                    {
                        type: "text",
                        text: `List created successfully!\nID: ${newList.id}\nName: ${newList.name}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error creating list: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    // Obtener todas las listas
    if (name === "get_lists") {
        try {
            const listsResult = await pool.query('SELECT * FROM "List" ORDER BY id');
            
            if (listsResult.rows.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No lists found. Create a list first using 'create_list'.",
                        },
                    ],
                };
            }

            let result = "📋 To-Do Lists:\n\n";
            
            for (const list of listsResult.rows) {
                const itemsResult = await pool.query(
                    'SELECT * FROM "Item" WHERE "ListId" = $1 ORDER BY id',
                    [list.id]
                );

                result += `List: ${list.name} (ID: ${list.id})\n`;
                
                if (itemsResult.rows.length === 0) {
                    result += "  No items yet.\n";
                } else {
                    itemsResult.rows.forEach((item: any, index: number) => {
                        const status = item.IsComplete ? "✓" : "○";
                        result += `  ${index + 1}. [${status}] ${item.Name} - ${item.Description} (ID: ${item.id})\n`;
                    });
                }
                result += "\n";
            }

            return {
                content: [
                    {
                        type: "text",
                        text: result,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error retrieving lists: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new Error(`Unknown tool: ${name}`);
});   
    
//Iniciar el servidor con transporte stdio
async function main(): Promise<void> {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Error starting server:", error);
    process.exit(1);
});