import { MongoClient } from 'mongodb';

/**
 * MongoDB client
 *
 * @type {MongoClient}
 */
export const client = new MongoClient("mongodb://mongo:27017?retryWrites=true&w=majority");

/**
 * MongoDB database
 *
 * @type {Db}
 */
export const db = client.db("bda");

/**
 * Retourne la collection "routes"
 *
 * @returns {Collection<Document>}
 */
export const routes = db.collection("routes");

/**
 * Retourne la collection "restaurants"
 *
 * @type {Collection<Document>}
 */
export const restaurants = db.collection("restaurants");

/**
 * Retourne la collection "paths"
 *
 * @type {Collection<Document>}
 */
export const paths = db.collection("paths");