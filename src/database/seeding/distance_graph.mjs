import { boot, ROOT } from "../../boot.mjs";
import { routes } from "../mongo.mjs";
import { client } from "../neo4j.mjs";

await boot();

console.log("=================== Starting distance graph seeding... ===================")
if (await isDatabaseEmpty()) {
    const documents = await routes.find().toArray();
    await buildMissingNodes(documents);
    await buildConnections(documents);
} else {
    console.log("Distance graph already seeded");
}
console.log("=================== Distance graph seeding ended =========================")

process.exit();

/**
 * Vérifie si la base de donnée est vide ou non
 *
 * @returns {Promise<*>}
 */
async function isDatabaseEmpty() {
    let result = await client.session().run("OPTIONAL MATCH (n) RETURN n IS NULL LIMIT 1");
    return result.records[0]._fields[0];
}

/**
 * Insère dans la base les noeuds manquants
 *
 * @returns {Promise<void>}
 */
async function buildMissingNodes(routes) {
    let count = 0;
    for (const doc of routes) {
        const coordinates = doc["geometry"]["coordinates"];
        const distance = doc["properties"]["LONGUEUR"];
        if (coordinates.length > 1) {
            // Dans un premier temps on ne s'occupe que des noeuds départ et arrivé, dans une v2 pourquoi pas prendre
            // plus de noeuds
            const nodes = [coordinates[0], coordinates[coordinates.length - 1]]
            for (const node of nodes) {
                // On récupère le noeud existant
                let result = await client.session().run(
                    'MATCH (node:Node) WHERE node.coordinates=$coordinates RETURN node',
                    {coordinates: node}
                )
                // Si le noeud n'existe pas, on le créé
                if (result.records.length <= 0) {
                    count++;
                    await client.session().run(
                        'CREATE (node:Node {coordinates: $coordinates}) RETURN node',
                        {coordinates: node}
                    );
                }
            }
        }
    }
    console.log("Inserted " + count + " missing nodes")
}

/**
 * Insère dans la base les connections manquantes
 *
 * @returns {Promise<void>}
 */
async function buildConnections(routes) {
    let count = 0;
    for (const doc of routes) {
        const route_id = doc._id.toString();
        const coordinates = doc["geometry"]["coordinates"];
        const distance = doc["properties"]["LONGUEUR"];
        if (coordinates.length > 1) {
            // On vérifie que la relation n'existe pas déjà
            const result = await client.session().run(
                "RETURN EXISTS( (:Node {coordinates: $node1})-[:JOINS]-(:Node {coordinates: $node2}) )",
                {node1: coordinates[0], node2: coordinates[coordinates.length-1]}
            )
            if (!result.records[0]._fields[0]) {
                // On construit la relation sur les deux noeuds
                count++;
                await client.session().run(
                    "MATCH (node1:Node), (node2:Node) WHERE node1.coordinates=$node1 AND node2.coordinates=$node2 " +
                    "CREATE (node1)-[:JOINS {distance:$distance, route_id:$route_id}]->(node2)",
                    {
                        node1: coordinates[0],
                        node2: coordinates[coordinates.length - 1],
                        distance: distance,
                        route_id: route_id
                    }
                )
            }
        }
    }
    console.log("Created " + count + " missing connections")
}