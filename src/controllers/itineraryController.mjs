import { paths, restaurants } from "../database/mongo.mjs";
import { client } from "../database/neo4j.mjs";
import { ObjectId } from "mongodb";

// Page d'accueil
export function homePage(req, res) {
    res.render("home");
}

// Modal de recherche de chemin
export function searchModal(req, res) {
    res.render("modals/search-modal");
}

// Modal de détail d'un chemin
export async function pathModal(req, res) {
    const restaurantIds = [];
    for (const r of JSON.parse(req.query.restaurants)) {
        restaurantIds.push(new ObjectId(r));
    }
    const path = await paths.findOne({ "_id" : new ObjectId(req.query.path) });
    const restaurantList = await restaurants.find({ "_id": { $in: restaurantIds } }).toArray();
    if (path) {
        res.render("modals/path-modal", {
            path: path,
            restaurants: restaurantList
        });
    } else {
        res.status(404).send("Chemin introuvable");
    }
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

// Modal d'erreur
export async function errorModal(req, res) {
    res.render("modals/error-modal", {
        error: req.query.error
    })
}