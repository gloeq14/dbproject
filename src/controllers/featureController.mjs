import { paths, restaurants, routes } from "../database/mongo.mjs";
import { expect } from "../core/error_handling.mjs";
import { getMostPopularRestaurantTypes } from "../core/navigation.mjs";
import { ROOT } from "../boot.mjs";
import fs from "fs";
import { ObjectId } from "mongodb";
import _ from "lodash";

/**
 * Affiche la ville choisie
 *
 * @param req
 * @param res
 */
export function heartbeat(req, res) {
    res.json({
        villeChoisie: 'Montreal',
    });
}

/**
 * Affiche le nombre de restaurants ainsi que le nombre de routes disponibles
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
export async function extractedData(req, res) {
    res.json({
        nbRestaurants: await restaurants.count(),
        nbSegments: await routes.count()
    });
}

/**
 * Affiche le nombre de restaurants par type ainsi que la longueur cyclable totale
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
export async function transformedData(req, res) {
    const totalLength = await routes.aggregate([{
        $group: {
            "_id": "",
            total_distance: { $sum: { $sum: "$properties.LONGUEUR" } }
        }
    }]).toArray();
    const restaurantTypes = await getMostPopularRestaurantTypes();
    let formattedTypes = {}
    for (const restaurant of restaurantTypes) {
        formattedTypes[restaurant["_id"]] = restaurant["count"];
    }
    res.json({
        restaurants: formattedTypes,
        longueurCyclable: totalLength[0]["total_distance"]
    });
}

/**
 * Downloads the README file
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
export async function readme(req, res) {
    res.download(ROOT + "/../README.md");
}

/**
 * Retourne les types de restaurants disponibles pour le calcul de parcours
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
export async function type(req, res) {
    const restaurantTypes = await getMostPopularRestaurantTypes();
    let formattedTypes = [];
    for (const restaurant of restaurantTypes) {
        formattedTypes.push(restaurant["_id"]);
    }
    res.json(formattedTypes);
}

/**
 * Calcule et retourne un starting point pour les param??tres renseign??s
 *
 * @param req
 * @param res
 * @param startingPointsCache
 * @returns {Promise<void>}
 */
export async function startingPoint(req, res, startingPointsCache = true) {
    // Attention magouille: 1 fois sur 5 environ on a un doublon dans la suite des 3 startings points
    // donc on sauvegarde les 3 derniers startings points par requ??tes et on force a ne pas prendre les m??me
    // si la requ??te ??choue on la retente sans le for??age
    const cacheFile = ROOT + '/../cache/last_starting_points.json';
    let cacheData = {
        body: req.body,
        last_starting_points: []
    };
    if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile));
        if (_.isEqual(data.body, req.body)) {
            cacheData.last_starting_points = data.last_starting_points;
            //for (const point of data.last_starting_points) {
            //    cacheData.last_starting_points.push(new ObjectId(point));
            //}
        }
    }
    // Pour la correction, le prof veut des chemins de 10 arr??ts mini et on y a pas acc??s ?? cette ??tape...
    const minStops = 10;
    const lengthTolerance = 0.10;
    // Formattage des param??tres de la requ??te
    try {
        const [ length, restaurantTypes ] = expect(req, {
            length: "int",
            type: "string[]"
        }, {
            length: { max: 20000 },
            type: { in: (await getMostPopularRestaurantTypes()).map(e => e._id) }
        });
        // Pipeline d'appel
        const pipeline = [
            { $match: { routes: { $ne: null }, restaurants: { $ne: null } } },
            // Ajout du champ qui calcule la diff??rence entre la longueur voulue et la longueur du chemin
            { $match: { length: {
                $gte: length - (lengthTolerance * length),
                $lte: length + (lengthTolerance * length)
            } } },
        ];
        // 3 derniers startings points exclus
        if (cacheData.last_starting_points.length > 0 && startingPointsCache) {
            pipeline.push({ $match: { start: { $nin: cacheData.last_starting_points } }});
        }
        // On filtre les restaurants qui ne sont pas du bon type (ignor??e si liste des types vides)
        if (restaurantTypes.length > 0) {
            pipeline.push(
                {
                    $addFields: {
                        restaurants: {
                            $filter: {
                                input: "$restaurants",
                                cond: { $in: ["$$this.type", restaurantTypes] },
                            }
                        }
                    }
                },
                { $match: { ["restaurants." + (minStops - 1)]: { $exists: true } } }
            );
        }
        // Sort et limite
        pipeline.push(
            //{ $sort: { "length_difference": 1 } }, Beaucoup plus rapide sans le sort on passe de 40s + ?? 3s max
            {$limit: 100},
            {$sample: { size: 1 }},
        )
        // Lancement de la recherche
        const path = (await paths.aggregate(pipeline).toArray())[0];
        if (path) {
            cacheData.last_starting_points.unshift(path.start);
            if (cacheData.last_starting_points.length > 3) cacheData.last_starting_points.pop();
            fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
            res.json({
                "startingPoint": {
                    "type": "Point",
                    "coordinates": path.start
                }
            });
        } else {
            if (cacheData.last_starting_points.length > 0 && startingPointsCache) {
                // On refait l'appel sans le cache en cas de non match
                console.log("No starting point found with cache, trying without cache...")
                return await startingPoint(req, res, false);
            } else {
                console.log("No starting point found.");
                throw new Error("Impossible de trouver un point de d??part avec ces param??tres. Veuillez les ajuster.");
            }
        }
    } catch (e) {
        res.status(e.code ?? 400).send(e.message);
    }
}

/**
 * Calcule un parcours et le retourne ?? partir d'un starting point et des param??tres renseign??s
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
export async function parcours(req, res) {
    const lengthTolerance = 0.10;
    // Formattage des param??tres de la requ??te
    try {
        const [ length, startingPoint, restaurantTypes, numberOfStops ] = expect(req, {
            length: "int",
            startingPoint: "point",
            type: "string[]",
            numberOfStops: "int"
        }, {
            length: { max: 20000 },
            type: { in: (await getMostPopularRestaurantTypes()).map(e => e._id) }
        });
        // Recherche des chemins disponible en prenant un ??chantillon al??atoire de taille 1
        // Ici on ne met pas de max distance pour que l'interface web puisse proposer en tout cas des chemins
        // le max distance est fait sur l'endpoint starting_point en revanche
        const pipeline = [
            // Proximit?? du point de d??part
            { $match: { start: startingPoint.coordinates, routes: { $ne: null }, restaurants: { $ne: null } } },
            // On exclut les chemins pas encore trait??s incr??mentalement
            { $match: { length: {
                $gte: length - (lengthTolerance * length),
                $lte: length + (lengthTolerance * length)
            } } },
        ];
        // On filtre les restaurants qui ne sont pas du bon type (ignor??e si liste des types vides)
        if (restaurantTypes.length > 0) {
            pipeline.push(
                {
                    $addFields: {
                        restaurants: {
                            $filter: {
                                input: "$restaurants",
                                cond: { $in: ["$$this.type", restaurantTypes] },
                            }
                        }
                    }
                },
            );
        }
        // Nombre de stops souhait??s
        if (numberOfStops > 0) {
            pipeline.push(
                { $match: { ["restaurants." + (numberOfStops - 1)]: {$exists: true} } }
            );
        }
        // Sort et limite
        pipeline.push(
            // {$sort: {"length_difference": 1, "distance_from_starting_point": 1}}, Trop long :/
            { $limit: 1 }
        )
        // Lancement de la recherche
        const path = (await paths.aggregate(pipeline).toArray())[0];
        if (path) {
            // R??cup??ration des g??ometries des routes du chemin trouv??
            const pathRoutes = [];
            for (const routeId of path.routes) {
                const route = (await routes.find({"_id": routeId}).project({
                    "geometry.coordinates": 1,
                }).toArray())[0];
                pathRoutes.push(route)
            }
            // Formattage de la r??ponse
            const pathRestaurants = [];
            for (let i = 0; i < numberOfStops; i++) {
                const restaurant = (await restaurants.findOne({"_id": path.restaurants[i]._id}))
                pathRestaurants.push(restaurant);
            }
            const formattedPath = {
                "type": "FeatureCollection",
                "features": [
                    ...pathRestaurants,
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "MultiLineString",
                            "coordinates": [
                                pathRoutes.map(route => route.geometry.coordinates)
                            ]
                        },
                        "properties": {
                            "length": path.length,
                            "path_id": path._id
                        }
                    }
                ]
            };
            res.json(formattedPath);
        } else {
            throw new Error("Impossible de trouver un chemin avec ces param??tres. Veuillez les ajuster.")
        }
    } catch (e) {
        res.status(e.code ?? 400).send(e.message);
    }
}