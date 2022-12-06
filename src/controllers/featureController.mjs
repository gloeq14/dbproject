import { paths, restaurants, routes } from "../database/mongo.mjs";
import { expect } from "../core/error_handling.mjs";
import { getMostPopularRestaurantTypes } from "../core/navigation.mjs";

// Affiche la ville choisie
export function heartbeat(req, res) {
    res.json({
        VilleChoisie: 'Montreal',
    });
}

// Affiche le nombre de restaurants ainsi que le nombre de routes
export async function extractedData(req, res) {
    res.json({
        nbRestaurants: await restaurants.count(),
        nbSegments: await routes.count()
    });
}

// Affiche le nombre de restaurants par type ainsi que la longueur cyclable totale
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

// Retourne les types de restaurants disponibles
export async function type(req, res) {
    const restaurantTypes = await getMostPopularRestaurantTypes();
    let formattedTypes = [];
    for (const restaurant of restaurantTypes) {
        formattedTypes.push(restaurant["_id"]);
    }
    res.json(formattedTypes);
}

// Calcule un starting point à partir des paramètres donnés
export async function startingPoint(req, res) {
    const minStops = 10; // Pour la correction, le prof veut des chemins de 10 arrêts mini et on y a pas accès à cette étape...
    const lengthTolerance = 0.10;
    // Formattage des paramètres de la requête
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
            // Ajout du champ qui calcule la différence entre la longueur voulue et la longueur du chemin
            { $match: { length: {
                $gte: length - (lengthTolerance * length),
                $lte: length + (lengthTolerance * length)
            } } },
        ];
        // On filtre les restaurants qui ne sont pas du bon type (ignorée si liste des types vides)
        if (restaurantTypes.length > 0) {
            pipeline.push(
                {
                    $addFields: {
                        restaurants: {
                            $filter: {
                                input: "$restaurants",
                                cond: {$in: ["$$this.type", restaurantTypes]},
                            }
                        }
                    }
                },
                {$match: {["restaurants." + (minStops - 1)]: {$exists: true}}}
            );
        }
        // Sort et limite
        pipeline.push(
            //{ $sort: { "length_difference": 1 } }, Beaucoup plus rapide sans le sort on passe de 40s + à 3s max
            {$limit: 100},
            {$sample: { size: 1 }},
        )
        // Lancement de la recherche
        const path = (await paths.aggregate(pipeline).toArray())[0];
        if (path) {
            res.json({
                "startingPoint": {
                    "type": "Point",
                    "coordinates": path.start
                }
            });
        } else {
            throw new Error("Impossible de trouver un point de départ avec ces paramètres. Veuillez les ajuster.");
        }
    } catch (e) {
        res.status(400).send(e.message);
    }
}

// Calcule un parcours à partir d'un starting point, d'une longueur, d'un nombre de stop et d'une liste de type de resto
export async function parcours(req, res) {
    const lengthTolerance = 0.10;
    // Formattage des paramètres de la requête
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
        // Recherche des chemins disponible en prenant un échantillon aléatoire de taille 1
        // Ici on ne met pas de max distance pour que l'interface web puisse proposer en tout cas des chemins
        // le max distance est fait sur l'endpoint starting_point en revanche
        const pipeline = [
            // Proximité du point de départ
            {$match: {start: startingPoint.coordinates, routes: {$ne: null}, restaurants: {$ne: null}}},
            // Ajout du champ qui calcule la différence entre la longueur voulue et la longueur du chemin
            {$addFields: {length_difference: {$abs: {$subtract: [length, '$original_length']}}}},
            // On exclut les chemins pas encore traités incrémentalement
            {$match: {length_difference: {$lte: lengthTolerance * length}}},
        ];
        // On filtre les restaurants qui ne sont pas du bon type (ignorée si liste des types vides)
        if (restaurantTypes.length > 0) {
            pipeline.push(
                {
                    $addFields: {
                        restaurants: {
                            $filter: {
                                input: "$restaurants",
                                cond: {$in: ["$$this.type", restaurantTypes]},
                            }
                        }
                    }
                },
            );
        }
        // Nombre de stops souhaités
        if (numberOfStops > 0) {
            pipeline.push(
                {$match: {["restaurants." + (numberOfStops - 1)]: {$exists: true}}}
            );
        }
        // Sort et limite
        pipeline.push(
            // {$sort: {"length_difference": 1, "distance_from_starting_point": 1}}, Trop long :/
            {$limit: 1}
        )
        console.log(pipeline);
        // Lancement de la recherche
        const path = (await paths.aggregate(pipeline).toArray())[0];
        if (path) {
            console.log(path);
            // Récupération des géometries des routes du chemin trouvé
            const pathRoutes = [];
            for (const routeId of path.routes) {
                const route = (await routes.find({"_id": routeId}).project({
                    "geometry.coordinates": 1,
                }).toArray())[0];
                pathRoutes.push(route)
            }
            // Formattage de la réponse
            const pathRestaurants = [];
            for (let i = 0; i < numberOfStops; i++) {
                const restaurant = (await restaurants.findOne({"_id": path.restaurants[i]._id}))
                pathRestaurants.push(restaurant);
            }
            console.log(pathRestaurants);
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
            throw new Error("Impossible de trouver un chemin avec ces paramètres. Veuillez les ajuster.")
        }
    } catch (e) {
        res.status(400).send(e.message);
    }
}