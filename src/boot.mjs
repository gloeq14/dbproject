import * as dotenv from "dotenv";
import path from "path";
import { client } from "./database/mongo.mjs";
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
    await client.connect();
}

/**
 * Fermeture du projet
 *
 * @returns {Promise<void>}
 */
async function shutdown() {
    await client.close();
}

/**
 * Racine du projet
 *
 * @type {string}
 */
export const ROOT = path.dirname(fileURLToPath(import.meta.url));
