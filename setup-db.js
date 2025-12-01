import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function setupDatabase() {
    try {
        console.log('🔧 Configurando la base de datos...\n');

        console.log('1. Eliminando tablas existentes (si existen)...');
        await pool.query('DROP TABLE IF EXISTS "Item" CASCADE');
        await pool.query('DROP TABLE IF EXISTS "List" CASCADE');
        console.log('   ✓ Tablas eliminadas\n');

        console.log('2. Creando tabla List...');
        await pool.query(`
            CREATE TABLE "List" (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            )
        `);
        console.log('   ✓ Tabla List creada con auto-incremento\n');

        console.log('3. Creando tabla Item...');
        await pool.query(`
            CREATE TABLE "Item" (
                id SERIAL PRIMARY KEY,
                "Name" VARCHAR(255) NOT NULL,
                "Description" TEXT,
                "IsComplete" BOOLEAN DEFAULT FALSE,
                "ListId" INTEGER NOT NULL,
                FOREIGN KEY ("ListId") REFERENCES "List"(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✓ Tabla Item creada con auto-incremento\n');

        console.log('4. Insertando datos de ejemplo...');
        const listResult = await pool.query(
            'INSERT INTO "List" (name) VALUES ($1) RETURNING id',
            ['Mi Primera Lista']
        );
        const listId = listResult.rows[0].id;

        await pool.query(
            'INSERT INTO "Item" ("Name", "Description", "IsComplete", "ListId") VALUES ($1, $2, $3, $4)',
            ['Tarea de ejemplo', 'Esta es una tarea de ejemplo', false, listId]
        );
        console.log('   ✓ Datos de ejemplo insertados\n');

        console.log('5. Verificando la configuración...');
        const lists = await pool.query('SELECT * FROM "List"');
        const items = await pool.query('SELECT * FROM "Item"');
        console.log(`   ✓ Listas en la BD: ${lists.rows.length}`);
        console.log(`   ✓ Items en la BD: ${items.rows.length}\n`);

        console.log('✅ Base de datos configurada correctamente!');
        console.log('\nAhora puedes usar las siguientes operaciones:');
        console.log('  - create_list: Crear nuevas listas');
        console.log('  - create_item: Crear items en una lista');
        console.log('  - get_lists: Ver todas las listas e items');
        console.log('  - update_item: Actualizar un item');
        console.log('  - complete_item: Marcar un item como completado');
        console.log('  - delete_item: Eliminar un item');

    } catch (error) {
        console.error('❌ Error configurando la base de datos:', error);
    } finally {
        await pool.end();
    }
}

setupDatabase();
