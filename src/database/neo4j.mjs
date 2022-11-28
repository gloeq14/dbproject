import { driver } from "neo4j-driver";

/**
 * Driver Neo4j
 *
 * @type {Driver}
 */
export const client = driver("neo4j://neo4j:7687")