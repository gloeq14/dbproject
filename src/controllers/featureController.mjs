import { restaurants, routes } from "../database/mongo.mjs";

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
    const path = await routes.find().project({
        "geometry.coordinates": 1,
        "properties.LONGUEUR": 1,
    }).limit(5).toArray();
    const restaurants = [];
    const formattedPath = {
        "type": "FeatureCollection",
        "features": [
            ...restaurants,
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiLineString",
                    "coordinates": [
                        path.map(route => route.geometry.coordinates)
                    ]
                },
                "properties": {
                    "length": path.reduce((sum, route) => sum + route.properties.LONGUEUR, 0)
                }
            }
        ]
    };
    res.json(formattedPath);
}