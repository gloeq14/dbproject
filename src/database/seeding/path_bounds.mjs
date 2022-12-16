import { boot, ROOT } from "../../boot.mjs";
import { restaurants, routes } from "../mongo.mjs";
import { paths } from "../mongo.mjs";
import { computeProximityGraph } from "../../core/navigation.mjs";
import { SingleBar } from "cli-progress";

await boot();

console.log("=================== Starting path bounds seeding... ===================")
if (await paths.countDocuments() <= 0) {
    await truncatePaths();
    await createGeoIndex();
    const boundingBox = (await computeRestaurantsBoundingBox().toArray())[0];
    const startingPoints = await pickStartingPoints(boundingBox, 16, 2);
    const computedPaths = await pickEndingPoints(startingPoints, [5000, 7500, 10000, 12000, 8000, 15000], 0.10);
    await insertPaths(computedPaths);
} else {
    console.log("Path bounds database already seeded")
}
console.log("=================== Path bounds seeding ended =========================")

process.exit();

/**
 * Créé un index géospatial sur les chemins
 */
async function createGeoIndex() {
    await paths.createIndex({ start: "2dsphere" });
    await paths.createIndex({ routes: 1});
    await paths.createIndex({ restaurants: 1 });
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
async function pickStartingPoints(boundingBox, resolution, offset=0) {
    const startingPoints = [];
    let minLat = boundingBox["minLat"];
    let minLng = boundingBox["minLng"];
    let maxLat = boundingBox["maxLat"];
    let maxLng = boundingBox["maxLng"];
    // On divise la bounding box en lattitude et en longitude par un nombre de carré égal à la résolution
    const latResolution = (maxLat - minLat) / resolution;
    const lngResolution = (maxLng - minLng) / resolution;
    // On ajoute l'offset
    if (offset > 1) {
        minLat += latResolution / offset;
        minLng += lngResolution / offset;
    }
    for (let iLat = 0; iLat < resolution; iLat++) {
        for (let iLng = 0; iLng < resolution; iLng++) {
            // Coordonnée du centre du rectangle i
            const squareCenter = [
                minLat + iLat * latResolution + latResolution / 2,
                minLng + iLng * lngResolution + lngResolution / 2,
            ];
            // Récupération de la route la + proche
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
            startingPoints.push(result.geometry.coordinates[0]);
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
 * @param distances
 * @param distanceTolerance
 * @returns {*[]}
 */
async function pickEndingPoints(startingPoints, distances, distanceTolerance) {
    const toReturn = [];
    // On parcoure toutes les distances par pas de distanceStep
    for (let i = 0; i < distances.length; i++) {
        const distance = distances[i];
        const oldLen = toReturn.length;
        const bar_2 = new SingleBar();
        bar_2.start(startingPoints.length-1, 0);
        for (let j = 0; j < startingPoints.length; j++) {
            const startingPoint = startingPoints[j];
            // On calcule le graphe de proximité avec la tolérance renseignée
            const proximityGraph = await computeProximityGraph(
                startingPoint,
                distance - distanceTolerance * distance,
                distance + distanceTolerance * distance,
                distance/100
            );
            // Pour chaque point du graphe, créé un chemin entre le point de départ et le point du graphe
            for (let endingPoint of proximityGraph.records) {
                const endingPointCoordinates = endingPoint._fields[0].properties.coordinates;
                const pathDistance = endingPoint._fields[1];
                toReturn.push({
                    "original_length": distance, // Pour calculer le nombre de relations
                    "start": startingPoint,
                    "end": endingPointCoordinates,
                    "length": pathDistance,
                    "restaurants": null,
                    "routes": null
                })
            }
            bar_2.update(j);
        }
        bar_2.stop();
    }
    console.log("Computed " + toReturn.length + " ending points");
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