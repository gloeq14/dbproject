import { readFileSync } from 'fs';
import { routes } from "../mongo.mjs";
import { ROOT, boot } from "../../boot.mjs";

await boot();

const geoJSONFile = ROOT + '/../data/reseau_cyclable.geojson';
const routesFromFile = loadRoutesFromFile(geoJSONFile);

console.log("=================== Starting route seeding... ===================")
if (await routes.countDocuments() <= 0) {
    await truncateRoutes();
    await createGeoIndex();
    await insertRoutes(routesFromFile);
} else {
    console.log("Route database already seeded")
}
console.log("=================== Route seeding ended =========================")

process.exit();

/**
 * Créé un index géospatial sur les routes
 */
async function createGeoIndex() {
    await routes.createIndex({ geometry: "2dsphere" });
}

/**
 * Charge les routes dans un tableau depuis le fichier geoJSON
 *
 * @returns {any}
 */
function loadRoutesFromFile(file) {
    let geoJSON  = JSON.parse(readFileSync(file));

    let table = geoJSON["features"];

    for (let i=0; i < table.length; i++ ){
        table[i]['properties']["reference"] = 'route_'+(new Array(4).join('0') + i+1).substr(-4);
    }

    return table;
}

/**
 * Insère les routes dans la base de donnée
 *
 * @param list
 * @returns {Promise<void>}
 */
async function insertRoutes(list) {
    const result = await routes.insertMany(list);
    console.log(`Inserted ${result.insertedCount} routes successfully`);
}

/**
 * Supprime les routes de la base de donnée
 *
 * @returns {Promise<void>}
 */
async function truncateRoutes() {
    const result = await routes.deleteMany({});
    console.log(`Dropped ${result.deletedCount} routes successfully`)
}