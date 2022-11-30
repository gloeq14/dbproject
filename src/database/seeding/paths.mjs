import { boot, ROOT } from "../../boot.mjs";
import { restaurants, routes } from "../mongo.mjs";
import { paths } from "../mongo.mjs";

await boot();

console.log("=================== Starting paths seeding... ===================")
if (await paths.countDocuments() <= 0) {
    await truncatePaths();
    await createGeoIndex();
    const boundingBox = (await computeRestaurantsBoundingBox().toArray())[0];
    const startingPoints = await pickStartingPoints(boundingBox, 20);
    const computedPaths = await computePaths(startingPoints, 200, 5000, 100);
    await insertPaths(computedPaths);
} else {
    console.log("Paths database already seeded")
}
console.log("=================== Paths seeding ended =========================")

process.exit();

/**
 * Créé un index géospatial sur les chemins
 */
async function createGeoIndex() {
    await paths.createIndex({ start: "2dsphere" });
}

/**
 * Calcule la bounding box des restaurants. On prend celle des restaurants simplement car elle est plus simple à formuler
 * car chaque restaurant = 1 point alors que chaque route = plusieurs points
 *
 * @returns {AggregationCursor<Document>}
 */
function computeRestaurantsBoundingBox() {
    return restaurants.aggregate([
        { "$unwind": "$geometry.coordinates" },
        { "$group": {
            "_id": "$_id",
            "lat": { "$first": "$geometry.coordinates" },
            "lng": { "$last": "$geometry.coordinates" }
        }},
        { "$group": {
            "_id": null,
            "minLat": { "$min": "$lat" },
            "minLng": { "$min": "$lng" },
            "maxLat": { "$max": "$lat" },
            "maxLng": { "$max": "$lng" }
        }}
    ])
}

/**
 * Sépare la bounding box en rectangles de tailles égales et prend les coordonnées du point de départ de la route
 * la plus proche du centre de chaque rectangle de la grille
 *
 * @returns {Promise<[]>}
 */
async function pickStartingPoints(boundingBox, resolution) {
    const startingPoints = [];
    const minLat = boundingBox["minLat"];
    const minLng = boundingBox["minLng"];
    const maxLat = boundingBox["maxLat"];
    const maxLng = boundingBox["maxLng"];
    // On divise la bounding box en lattitude et en longitude par un nombre de carré égal à la résolution
    const latResolution = (maxLat - minLat) / resolution;
    const lngResolution = (maxLng - minLng) / resolution;
    for (let iLat = 0; iLat < resolution; iLat++) {
        for (let iLng = 0; iLng < resolution; iLng++) {
            // Coordonnée du centre du rectangle i
            const squareCenter = [
                minLat + iLat * latResolution + latResolution / 2,
                minLng + iLng * lngResolution + lngResolution / 2,
            ];
            // Récupération du restaurant le + proche
            const result = await routes.findOne({
                geometry: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: squareCenter
                        },
                    }
                }
            });
            // Conversion en point geoJSON pour l'index geospatial
            startingPoints.push({
                type: "Point",
                coordinates: result.geometry.coordinates[0]
            });
        }
    }
    console.log("Computed " + startingPoints.length + " starting points");
    return startingPoints;
}

/**
 * Calcule tous les chemins possibles partant des startingPoints de distance minimale minDistance, maximale maxDistance
 * et en prenant des distances incrémentales de distanceStep
 *
 * @param startingPoints
 * @param minDistance
 * @param maxDistance
 * @param distanceStep
 * @returns {*[]}
 */
function computePaths(startingPoints, minDistance, maxDistance, distanceStep) {
    const toReturn = [];
    for (let startingPoint of startingPoints) {
        toReturn.push({
            "start": startingPoint,
            "length": 200,
            "restaurants": []
        })
    }
    return toReturn;
}

/**
 * Insère les chemins calculés dans la base de donnée
 *
 * @param computedPaths
 * @returns {*}
 */
async function insertPaths(computedPaths) {
    const result = await paths.insertMany(computedPaths);
    console.log(`Inserted ${result.insertedCount} paths successfully`);
}

/**
 * Supprime les chemins de la base de donnée
 *
 * @returns {Promise<void>}
 */
async function truncatePaths() {
    const result = await paths.deleteMany({});
    console.log(`Dropped ${result.deletedCount} paths successfully`)
}