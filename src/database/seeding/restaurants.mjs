import { boot, ROOT } from "../../boot.mjs";
import { routes } from "../mongo.mjs";
import { restaurants } from "../mongo.mjs";
import { readFileSync } from "fs";
import {SingleBar} from "cli-progress";

await boot();

const radius = 1000;
const geoJSONFile = ROOT + '/../data/restaurants.geojson';
const restaurantsFromFile = loadRestaurantsFromFile(geoJSONFile);

console.log("=================== Starting restaurant seeding... ===================")
if (await restaurants.countDocuments() <= 0) {
    await truncateRestaurants()
    await createGeoIndex()
    await insertRestaurants(restaurantsFromFile);
    await linkRestaurants();
} else {
    console.log("Restaurant database already seeded")
}
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
 * Créé un index géospatial sur les restaurants
 */
async function createGeoIndex() {
    await restaurants.createIndex({ geometry: "2dsphere" });
}

/**
 * Relie les restaurants aux routes par rapport à leur distance
 *
 * @returns {Promise<void>}
 */
async function linkRestaurants() {
    const toLink = await routes.find().toArray();
    const bar = new SingleBar();
    bar.start(toLink.length-1, 0);
    for (let i = 0; i < toLink.length; i++) {
        const route = toLink[i];
        route.properties["restaurants"] = await findRoadRestaurants(route);
        await routes.updateOne({_id: route._id}, {$set: {properties: route.properties}});
        bar.update(i);
    }
    bar.stop();
    console.log("Linked restaurants successfully");
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
        const newRestaurants = await findRestaurantsNearToPoint(points[i], radius);
        restaurants = concatRestaurants(restaurants, newRestaurants);
    }

    return restaurants;
}

/**
 * Trouve et extraits les restaurants prêts d'un point
 *
 * @param point
 * @param radius
 * @returns {Promise<*[]>}
 */
async function findRestaurantsNearToPoint(point, radius) {
    let lat = point[1];
    let lng = point[0];

    const result = restaurants.find({
        "geometry": {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: point
                },
                $maxDistance: radius
            }
        }
    }).project({"_id": true});

    return await result.map(result => result["_id"]).toArray();
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
        if (!restaux1.find(r => r.equals(rest2))) restaux1.push(rest2);
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
