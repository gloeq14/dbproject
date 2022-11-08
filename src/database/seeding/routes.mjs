import { readFileSync } from 'fs';
import { routes } from "../mongo.mjs";
import { ROOT, boot } from "../../boot.mjs";

await boot();

const geoJSONFile = ROOT + '/../data/reseau_cyclable.geojson';
const routesFromFile = loadRoutesFromFile(geoJSONFile);

console.log("=================== Starting route seeding... ===================")
await truncateRoutes();
await insertRoutes(routesFromFile);
//await listRoutes();
console.log("=================== Route seeding ended =========================")

process.exit();

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
        table[i]['properties']["length"] = computeRouteLength(table[i]);
    }

    return table;
}

/**
 * Calcule la longueur totale d'une route
 *
 * @param route
 * @returns {number}
 */
function computeRouteLength(route){
    let sommeDistance = 0
    let coordinates = route['geometry']['coordinates'];
    if (coordinates.length <= 0) return 0;

    let pointLongDepart = coordinates[0][0];
    let pointLatDepart = coordinates[0][1];
    let pointLongArrive, pointLatArrive;

    for (let j=0; j < coordinates.length; j++ ){
        pointLongArrive = coordinates[j][0];
        pointLatArrive = coordinates[j][1];
        sommeDistance += distance(pointLatDepart, pointLatDepart, pointLatArrive, pointLongArrive, "K");
        pointLongDepart = coordinates[j][0];
        pointLatDepart = coordinates[j][1];
    }

    return sommeDistance;
}

/**
 * Calcule la distance séparant deux points en prenant en compte la courbure de la terre
 *
 * @param lat1
 * @param lon1
 * @param lat2
 * @param lon2
 * @param unit
 * @returns {number}
 */
function distance(lat1, lon1, lat2, lon2, unit) {
    if ((lat1 == lat2) && (lon1 == lon2)) {
        return 0;
    } else {
        const radlat1 = Math.PI * lat1 / 180;
        const radlat2 = Math.PI * lat2 / 180;
        const theta = lon1 - lon2;
        const radtheta = Math.PI * theta / 180;
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) dist = 1;
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit=="K") { return dist * 1.609344 }
        if (unit=="N") { return dist * 0.8684 }
    }
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
 * Liste les routes de la base de donnée
 *
 * @returns {Promise<void>}
 */
async function listRoutes() {
    const result = await routes.find();
    console.log("Listing database routes:");
    await result.forEach(element => {
        console.log(`- ${element.properties.length}`);
    });
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