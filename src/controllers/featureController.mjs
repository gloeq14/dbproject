import { paths, restaurants, routes } from "../database/mongo.mjs";
import { ObjectId } from "mongodb";
import {types} from "neo4j-driver";

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
    const restaurantTypes = await restaurants.aggregate([{
        $group: {
            _id: "$properties.type",
            count: { $count: {} }
        }
    }]).toArray();
    let formattedTypes = {}
    for (const restaurant of restaurantTypes) {
        formattedTypes[restaurant["_id"]] = restaurant["count"];
    }
    res.json({
        restaurants: formattedTypes,
        longueurCyclable: totalLength[0]["total_distance"]
    });
}

// Calcule un parcours à partir d'un starting point, d'une longueur, d'un nombre de stop et d'une liste de type de resto
export async function parcours(req, res) {
    // Formattage des paramètres de la requête
    const length = parseInt(req.body.data.length) ?? 1000;
    const startingPoint = req.body.data.startingPoint;
    const restaurantTypes = req.body.data.type ?? [];
    const numberOfStops = parseInt(req.body.numberOfStops) ?? 1;
    // Recherche des chemins disponible en prenant un échantillon aléatoire de taille 1
    // Ici on ne met pas de max distance pour que l'interface web puisse proposer en tout cas des chemins
    // le max distance est fait sur l'endpoint starting_point en revanche
    // TODO LENGTHDIFFERENCE NAN
    const path = (await paths.aggregate([
        // Proximité du point de départ
        { $geoNear: {
            distanceField: "distance_from_starting_point",
            near: startingPoint,
            maxDistance: 500,
            includeLocs: "start",
        } },
        // Ajout du champ qui calcule la différence entre la longueur voulue et la longueur du chemin
        { $addFields: { length_difference: { $abs: { $subtract: [length, '$length'] } } } },
        // On exclut les chemins pas encore traités incrémentalement
        { $match: { routes: { $ne: null }, restaurants: { $ne: null } } },
        // On filtre les restaurants qui ne sont pas du bon type (ignorée si liste des types vides)
        { $addFields: {
            restaurants: {
                $filter: {
                    input: "$restaurants",
                    cond: {
                        $or: [
                            { $eq: [restaurantTypes, []] },
                            { $in: ["$$this.type", restaurantTypes] },
                        ]
                    }
                }
            }
        } },
        // Nombre de stops souhaités
        { $match: { ["restaurants." + (numberOfStops - 1)]: { $exists: true } } },
        { $sort: { "length_difference": 1, "distance_from_starting_point": 1 } },
        { $limit: 1 }
    ]).toArray())[0];
    if (path) {
        console.log(path);
        // Récupération des géometries des routes du chemin trouvé
        const pathRoutes = [];
        for (const routeId of path.routes) {
            const route = (await routes.find({ "_id": routeId }).project({
                "geometry.coordinates": 1,
            }).toArray())[0];
            pathRoutes.push(route)
        }
        // Formattage de la réponse
        const pathRestaurants = [];
        for (let i = 0; i < numberOfStops; i++) {
            const restaurant = (await restaurants.findOne({ "_id": path.restaurants[i]._id }))
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
        res.status(400).send("Impossible de trouver un chemin avec ces paramètres. Veuillez les ajuster.");
    }
}