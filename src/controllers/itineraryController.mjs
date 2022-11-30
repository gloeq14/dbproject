import { paths } from "../database/mongo.mjs";

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