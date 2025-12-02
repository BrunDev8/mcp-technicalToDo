import 'dotenv/config';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = process.env.API_BASE || "http://localhost:5083";
const DEFAULT_TIMEOUT_MS = 8000;

// Types for better type safety
interface ApiFetchResponse {
  ok: boolean;
  status?: number;
  body?: any;
  message?: string;
  isTimeout?: boolean;
}

// Helper: fetch with timeout and error handling
async function apiFetch(
  method: string,
  path: string,
  body?: any,
  expectedStatus: number = 200
): Promise<ApiFetchResponse> {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const init: RequestInit = {
    method,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    signal: controller.signal,
  };
  
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    clearTimeout(timeoutId);

    let text = "";
    try {
      text = await res.text();
    } catch (e) {
      // Ignore text parsing errors
    }

    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch (e) {
      json = undefined;
    }

    if (res.status >= 200 && res.status < 300) {
      return { ok: true, status: res.status, body: json ?? text };
    } else {
      return {
        ok: false,
        status: res.status,
        body: json ?? text,
        message: `HTTP ${res.status} on ${method} ${url}`,
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        isTimeout: true,
        message: `Request timeout (${DEFAULT_TIMEOUT_MS}ms) to ${method} ${url}`,
      };
    }
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

// Helper: format error response
function errorResponse(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

// Helper: format success response
function successResponse(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

// Helper: get field value with fallback for different naming conventions
function getField(obj: any, ...fields: string[]): any {
  for (const field of fields) {
    if (obj[field] !== undefined) return obj[field];
  }
  return undefined;
}

// Initialize MCP Server
const server = new Server(
  {
    name: "mcp-technicaltodo",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Registrar lista de herramientas (ListTools)
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
          required: ["listId", "name"],
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
      {
        name: "get_items",
        description: "Get all items or items in a specific list (optional listId).",
        inputSchema: {
          type: "object",
          properties: {
            listId: { type: "number", description: "Optional listId to filter items." },
          },
        },
      },
      {
        name: "get_item",
        description: "Get a single item by id.",
        inputSchema: {
          type: "object",
          properties: {
            itemId: { type: "number", description: "The ID of the item." },
          },
          required: ["itemId"],
        },
      },
    ],
  };
});

// Handler principal de llamadas a tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // --- create_item: POST /api/items
  if (name === "create_item") {
    const { listId, name: itemName, description } = args as any;
    if (!listId || !itemName) {
      return errorResponse("Missing required fields: listId and name.");
    }

    const payload = {
      ListId: listId,
      Name: itemName,
      Description: description ?? "",
      IsComplete: false,
    };

    const res = await apiFetch("POST", "/api/items", payload, 201);
    if (!res.ok) {
      const errText = res.message ?? JSON.stringify(res.body ?? res);
      return errorResponse(`Error creating item: ${errText}`);
    }

    const created = res.body;
    const id = getField(created, "id", "Id");
    const name = getField(created, "name", "Name", "title", "Title");
    const listIdVal = getField(created, "listId", "ListId");
    
    return successResponse(
      `Item created successfully.\nID: ${id}\nName: ${name}\nListId: ${listIdVal}`
    );
  }

  // --- update_item: PUT /api/items/{id}
  if (name === "update_item") {
    const { itemId, name: itemName, description, isComplete } = args as any;
    if (!itemId) {
      return errorResponse("Missing required field: itemId.");
    }

    const payload: any = {};
    if (itemName !== undefined) payload.Name = itemName;
    if (description !== undefined) payload.Description = description;
    if (isComplete !== undefined) payload.IsComplete = isComplete;

    if (Object.keys(payload).length === 0) {
      return successResponse("No fields to update. Provide name, description or isComplete.");
    }

    const res = await apiFetch("PUT", `/api/items/${encodeURIComponent(itemId)}`, payload);
    if (!res.ok) {
      const errText = res.message ?? JSON.stringify(res.body ?? res);
      return errorResponse(`Error updating item: ${errText}`);
    }

    const updated = res.body;
    const id = getField(updated, "id", "Id");
    const name = getField(updated, "name", "Name", "title", "Title");
    const completed = getField(updated, "isComplete", "IsComplete");
    
    return successResponse(
      `Item updated successfully.\nID: ${id}\nName: ${name}\nCompleted: ${completed}`
    );
  }

  // --- complete_item: mark as completed
  if (name === "complete_item") {
    const { itemId } = args as any;
    if (!itemId) {
      return errorResponse("Missing required field: itemId.");
    }

    const res = await apiFetch("PUT", `/api/items/${encodeURIComponent(itemId)}`, { IsComplete: true });
    if (!res.ok) {
      const errText = res.message ?? JSON.stringify(res.body ?? res);
      return errorResponse(`Error completing item: ${errText}`);
    }

    const completed = res.body;
    const id = getField(completed, "id", "Id");
    const name = getField(completed, "name", "Name", "title", "Title");
    
    return successResponse(`Item marked as completed.\nID: ${id}\nName: ${name}`);
  }

  // --- delete_item: DELETE /api/items/{id}
  if (name === "delete_item") {
    const { itemId } = args as any;
    if (!itemId) {
      return errorResponse("Missing required field: itemId.");
    }

    const res = await apiFetch("DELETE", `/api/items/${encodeURIComponent(itemId)}`);
    if (!res.ok) {
      const errText = res.message ?? JSON.stringify(res.body ?? res);
      return errorResponse(`Error deleting item: ${errText}`);
    }

    return successResponse(`Item deleted successfully. ID: ${itemId}`);
  }

  // --- create_list: POST /api/lists
  if (name === "create_list") {
    const { name: listName } = args as any;
    if (!listName) {
      return errorResponse("Missing required field: name.");
    }

    const res = await apiFetch("POST", `/api/lists`, { Name: listName }, 201);
    if (!res.ok) {
      const errText = res.message ?? JSON.stringify(res.body ?? res);
      return errorResponse(`Error creating list: ${errText}`);
    }

    const created = res.body;
    const id = getField(created, "id", "Id");
    const name = getField(created, "name", "Name");
    
    return successResponse(`List created successfully.\nID: ${id}\nName: ${name}`);
  }

  // --- get_lists: GET /api/lists with items
  if (name === "get_lists") {
    const res = await apiFetch("GET", "/api/lists");
    if (!res.ok) {
      const errText = res.message ?? JSON.stringify(res.body ?? res);
      return errorResponse(`Error retrieving lists: ${errText}`);
    }

    const lists = res.body;
    if (!Array.isArray(lists) || lists.length === 0) {
      return successResponse("No lists available.");
    }

    let out = "📋 To-Do Lists:\n\n";
    for (const list of lists) {
      const listName = getField(list, "name", "Name");
      const listId = getField(list, "id", "Id");
      out += `List: ${listName} (ID: ${listId})\n`;
      
      const items = getField(list, "items", "Items") ?? [];
      if (!items || items.length === 0) {
        out += "  No items yet.\n";
      } else {
        items.forEach((item: any, idx: number) => {
          const status = getField(item, "isComplete", "IsComplete") ? "✓" : "○";
          const itemName = getField(item, "name", "Name", "title", "Title");
          const desc = getField(item, "description", "Description");
          const itemId = getField(item, "id", "Id");
          out += `  ${idx + 1}. [${status}] ${itemName} - ${desc} (ID: ${itemId})\n`;
        });
      }
      out += "\n";
    }

    return successResponse(out);
  }

  // --- get_items: GET /api/items (optionally filter by listId)
  if (name === "get_items") {
    const { listId } = args as any;
    let path = "/api/items";
    if (listId !== undefined && listId !== null) {
      path += `?listId=${encodeURIComponent(listId)}`;
    }

    const res = await apiFetch("GET", path);
    if (!res.ok) {
      const errText = res.message ?? JSON.stringify(res.body ?? res);
      return errorResponse(`Error retrieving items: ${errText}`);
    }

    const items = res.body;
    if (!Array.isArray(items) || items.length === 0) {
      return successResponse("No items found.");
    }

    let out = "🗒️ Items:\n\n";
    items.forEach((item) => {
      const status = getField(item, "isComplete", "IsComplete") ? "✓" : "○";
      const itemName = getField(item, "name", "Name", "title", "Title");
      const desc = getField(item, "description", "Description");
      const itemId = getField(item, "id", "Id");
      out += `- [${status}] ${itemName} - ${desc} (ID: ${itemId})\n`;
    });

    return successResponse(out);
  }

  // --- get_item: GET /api/items/{id}
  if (name === "get_item") {
    const { itemId } = args as any;
    if (!itemId) {
      return errorResponse("Missing required field: itemId.");
    }
    
    const res = await apiFetch("GET", `/api/items/${encodeURIComponent(itemId)}`);
    if (!res.ok) {
      const errText = res.message ?? JSON.stringify(res.body ?? res);
      return errorResponse(`Error retrieving item: ${errText}`);
    }

    const item = res.body;
    const id = getField(item, "id", "Id");
    const name = getField(item, "name", "Name", "title", "Title");
    const desc = getField(item, "description", "Description");
    const completed = getField(item, "isComplete", "IsComplete");
    
    return successResponse(
      `ID: ${id}\nName: ${name}\nDescription: ${desc}\nCompleted: ${completed}`
    );
  }

  // Unknown tool
  throw new Error(`Unknown tool: ${name}`);
});

// Start server using stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`MCP server started. API base: ${API_BASE}`);
}

main().catch((err) => {
  console.error("Error starting MCP server:", err);
  process.exit(1);
});
