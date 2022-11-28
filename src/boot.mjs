import * as dotenv from "dotenv";
import path from "path";
import { client as mongoClient } from "./database/mongo.mjs";
import { client as neo4jClient } from "./database/neo4j.mjs";
import { fileURLToPath } from "url";

/**
 * Lancement du projet
 *
 * @returns {Promise<void>}
 */
export async function boot() {
    // Paramètrage de la fermeture du processus
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    // Chargement des variables d'environnement
    dotenv.config();
    // Connection à la base de donnée
    await mongoClient.connect();
    // Vérification que la connection neo est bonne
    await neo4jClient.verifyConnectivity();
}

/**
 * Fermeture du projet
 *
 * @returns {Promise<void>}
 */
async function shutdown() {
    await mongoClient.close();
    await neo4jClient.close();
}

/**
 * Racine du projet
 *
 * @type {string}
 */
export const ROOT = path.dirname(fileURLToPath(import.meta.url));
