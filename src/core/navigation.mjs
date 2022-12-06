import { client } from "../database/neo4j.mjs";
import {restaurants} from "../database/mongo.mjs";

/**
 * Calcule un graphe de proximité à partir d'un point d'entrée d'une distance et d'un nombre maximum de sauts.
 * Dans ce graphe, il existera pour tout les noeuds au moins un chemin menant du point de départ vers le noeud dont la
 * distance est inférieure à la distance fournie par l'utilisateur.
 *
 * @param startingNode
 * @param minDistance
 * @param maxDistance
 * @param maxRelations
 */
export function computeProximityGraph(startingNode, minDistance, maxDistance, maxRelations=50) {
    // Obligé de faire une relation orientée, c'est plus long pour le calcul du graphe mais lors du calcul des chemins
    // possibles c'est impossible d'avoir un calcul dans un temps raisonnable si on a une relation non orientée
    return client.session().run(
        "MATCH (n:Node) WHERE n.coordinates = $coordinates " +
        "MATCH path = (n)-[rel:JOINS*.."+maxRelations+"]->(x) " +
        "WITH [x in rel | x.distance] as distances, x,n " +                        // Extraction des distances
        "WITH REDUCE(res = 0, x in distances | res + x) as distance, x,n " +       // Somme des distances
        "WHERE distance >= $minDistance AND distance <= $maxDistance " +
        "RETURN x,distance",
        {
            coordinates: startingNode,
            minDistance: minDistance,
            maxDistance: maxDistance,
            maxRelations: maxRelations
        }
    )
}

/**
 * Calcule le chemin reliant les deux noeuds de la distance fournie en paramètre
 *
 * @param startingNode
 * @param endingNode
 * @param exactDistance
 * @param maxRelations
 */
export function computePathBetween(startingNode, endingNode, exactDistance, maxRelations=50) {
    return client.session().run(
        "MATCH (start:Node {coordinates: $start}), (end:Node {coordinates: $end}) \
        MATCH p=(start)-[:JOINS*.." + maxRelations+"]->(end) \
        WITH p, reduce(s = 0, r IN relationships(p) | s + r.distance) AS dist \
        WHERE dist=$exactDistance \
        RETURN p, dist ORDER BY dist LIMIT 1",
        {
            start: startingNode,
            end: endingNode,
            exactDistance: exactDistance
        }
    )
}

/**
 * Retourne la liste des restaurants qui sont les plus présents dans la base
 *
 * @returns {Promise<Document[]>}
 */
export async function getMostPopularRestaurantTypes() {
    return restaurants.aggregate([
        { $group: {
                _id: "$properties.type",
                count: { $count: {} }
            } },
        { $match: { count: { $gt: 500 } } }
    ]).toArray();
}