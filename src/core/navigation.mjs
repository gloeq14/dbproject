import { client } from "../database/neo4j.mjs";

/**
 * Calcule un graphe de proximité à partir d'un point d'entrée d'une distance et d'un nombre maximum de sauts.
 * Dans ce graphe, il existera pour tout les noeuds au moins un chemin menant du point de départ vers le noeud dont la
 * distance est inférieure à la distance fournie par l'utilisateur.
 *
 * @param startingNode
 * @param distance
 * @param maxRelations
 * @returns {Result<Dict>}
 */
export function computeProximityGraph(startingNode, distance, maxRelations=10) {
    return client.session().run(
        "MATCH (n:Node) WHERE id(n) = $id " +
        "MATCH path = (n)-[rel:JOINS*..$maxRelations]-(x) " +
        "WITH [x in rel | x.distance] as distances, x,n " +                        // Extraction des distances
        "WITH REDUCE(res = 0, x in distances | res + x) as distance, x,n " +       // Somme des distances
        "WHERE distance < $distance " +
        "RETURN x,n",
        {
            id: startingNode,
            distance: distance,
            maxRelations: maxRelations
        }
    )
}