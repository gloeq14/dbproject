import { paths, restaurants } from "../database/mongo.mjs";
import { ObjectId } from "mongodb";

/**
 * Rends la page d'accueil
 *
 * @param req
 * @param res
 */
export function homePage(req, res) {
    res.render("home");
}

/**
 * Affiche la modale de recherche de chemin
 *
 * @param req
 * @param res
 */
export function searchModal(req, res) {
    res.render("modals/search-modal");
}

/**
 * Affiche la modale de détail d'un chemin
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
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

/**
 * Affiche la modale du menu administrateur
 *
 * @param req
 * @param res
 */
export function adminModal(req, res) {
    res.render("modals/admin-modal");
}

/**
 * Retourne la liste des startings points précalculés
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
export async function startingPoints(req, res) {
    const result = (await paths.aggregate([{
        "$project": {
            "_id": 0,
            "start.coordinates": 1
        }
    }]).toArray()).map(doc => doc.start.coordinates);
    res.json(result);
}

/**
 * Affiche un modal d'erreur
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
export async function errorModal(req, res) {
    res.render("modals/error-modal", {
        error: req.query.error
    })
}