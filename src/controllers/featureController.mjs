import { routes } from "../database/mongo.mjs";

// Affiche la ville choisie
export function heartbeat(req, res) {
    res.json({
        VilleChoisie: 'Montreal',
    });
}

// Affiche le nombre de restaurants ainsi que le nombre de routes
export function extractedData(req, res) {
    res.json({
       nbRestaurants: 10,
       nbSegments: 10
    });
}

// Affiche le nombre de restaurants par type ainsi que la longueur cyclable totale
export async function transformedData(req, res) {
    const totalLength = await routes.aggregate([
        {
            $group: {
                "_id":"",
                total_distance: {
                    $sum: {$sum:"$properties.length"}
                }
            }
        }
    ]);
    res.json({
        restaurants: {},
        longueurCyclable: totalLength
    });
}