import {boot, ROOT} from "../../boot.mjs";
import {routes} from "../mongo.mjs";
import {restaurants} from "../mongo.mjs";
import {readFileSync} from "fs";

await boot();

const radius = 2000;
const geoJSONFile = ROOT + '/../data/restaurants.geojson';
const restaurantsFromFile = loadRestaurantsFromFile(geoJSONFile);

console.log("=================== Starting restaurant seeding... ===================")
await truncateRestaurants()
await insertRestaurants(restaurantsFromFile);
console.log("=================== Restaurant seeding ended =========================")

process.exit();

/**
 * Charge une liste de restaurant depuis un fichier
 *
 * @param file
 * @returns {*}
 */
function loadRestaurantsFromFile(file) {
    let geoJSON  = JSON.parse(readFileSync(file));

    let table = geoJSON["features"];

    for (let i=0; i < table.length; i++ ){
        table[i]['properties']["reference"] = 'restaurant_'+(new Array(4).join('0') + i+1).substr(-4);
    }

    return table;
}

/**
 * Relie les restaurants aux routes par rapport à leur distance
 *
 * @returns {Promise<void>}
 */
async function linkRestaurants() {
    await routes.findOne().then(async route => {
        route.properties["restaurants"] = await findRoadRestaurants(route);
        await routes.updateOne({_id: route._id}, {$set: {properties: route.properties}});
    });
}

/**
 * Trouve les restaurants proches d'une route
 *
 * @param road
 * @returns {Promise<*[]>}
 */
async function findRoadRestaurants(road) {
    let restaurants = [];
    const points = road['geometry']['coordinates'];
    if (points.length <= 0) return restaurants;

    for (let i of [0, points.length-1]) {
        const newRestaurants = await findRestaurantsNearToPoint(points[i]);
        restaurants = concatRestaurants(restaurants, newRestaurants);
    }

    return restaurants;
}

/**
 * Trouve et extraits les restaurants prêts d'un point
 *
 * @param point
 * @returns {Promise<*[]>}
 */
async function findRestaurantsNearToPoint(point) {
    let lat = point[1];
    let lng = point[0];

    let restaurants = [];

    return restaurants;
}

/**
 * Ajoute des restaurants à une liste de restaurants en vérifiant les duplicatas
 *
 * @param restaux1
 * @param restaux2
 * @returns {*}
 */
function concatRestaurants(restaux1, restaux2) {
    restaux2.forEach(rest2 => {
        if (!restaux1.find(r => r.id === rest2.id)) restaux1.push(rest2);
    });
    return restaux1;
}

/**
 * Supprime les restaurants de la base de donnée
 *
 * @returns {Promise<void>}
 */
async function truncateRestaurants() {
    const result = await restaurants.deleteMany({});
    console.log(`Dropped ${result.deletedCount} restaurants successfully`)
}

/**
 * Insère les restaurants dans la base mongo
 *
 * @returns {Promise<void>}
 */
async function insertRestaurants(list) {
    const result = await restaurants.insertMany(list);
    console.log(`Inserted ${result.insertedCount} restaurants successfully`);
}
