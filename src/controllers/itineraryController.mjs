import { paths } from "../database/mongo.mjs";
import { client } from "../database/neo4j.mjs";

// Page d'accueil
export function homePage(req, res) {
    res.render("home");
}

// Modal de recherche de chemin
export function searchModal(req, res) {
    res.render("modals/search-modal");
}

// Modal de détail d'un chemin
export function pathModal(req, res) {
    res.render("modals/path-modal", {
        distance: "100"
    });
}

// Modal du menu admin
export function adminModal(req, res) {
    res.render("modals/admin-modal");
}

// Liste des starting points
export async function startingPoints(req, res) {
    const result = (await paths.aggregate([{
        "$project": {
            "_id": 0,
            "start.coordinates": 1
        }
    }]).toArray()).map(doc => doc.start.coordinates);
    res.json(result);
}

// Plus court chemin
export async function shortestPath(req, res) {
    let depart = [ -73.60510433754504, 45.52846529402161 ]
    let arrival = [ -73.62025709903915, 45.52086586881242 ]

    let result = await client.session().run(
        'MATCH (start:Node {coordinates: $depart}), (end:Node {coordinates: $arrival}) \
        MATCH p=(start)-[:JOINS*]->(end) \
        WITH p, reduce(s = 0, r IN relationships(p) | s + r.distance) AS dist \
        RETURN p, dist ORDER BY dist LIMIT 1\
        ',
        { depart: depart, arrival: arrival }
    )

    res.json(result);
}


// 'MATCH (start:Node {coordinates: $depart}), (end:Node) WHERE start.coordinates <> end.coordinates\
// MATCH p=shortestPath((start)-[:JOINS*]->(end)) \
// RETURN p, end'

// 'MATCH (start:Node {coordinates: $depart}), (end:Node {coordinates: $arrival}) \
// CALL apoc.algo.dijkstra(start, end, \'JOINS\', \'distance\') YIELD path, weight \
// RETURN path, weight'