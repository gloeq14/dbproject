import { boot, ROOT } from "../../boot.mjs";
import { paths } from "../mongo.mjs";
import { computePathBetween } from "../../core/navigation.mjs";
import {ObjectId} from "mongodb";
import {SingleBar} from "cli-progress";

await boot();

console.log("=================== Starting path routes seeding... ===================")
const emptyPaths = await getEmptyPaths();
await fillPaths(emptyPaths);
console.log("=================== Path routes seeding ended =========================")

process.exit();

/**
 * Retourne la liste des chemins qui n'ont pas encore été calculés
 *
 * @returns {Promise<FindCursor<WithId<TSchema>>>}
 */
async function getEmptyPaths() {
    return paths.find({
        "routes": null
    }).toArray();
}

/**
 * Calcule les routes de chacun des chemins donnés en paramètres
 *
 * @param emptyPaths
 * @returns {Promise<void>}
 */
async function fillPaths(emptyPaths) {
    const start = new Date().getTime();
    console.log("Filling " + emptyPaths.length + " paths...");
    const bar = new SingleBar();
    bar.start(emptyPaths.length, 0);
    for (let i = 0; i < emptyPaths.length; i++) {
        const path = emptyPaths[i];
        const computedPath = (await computePathBetween(path.start, path.end, path.length)).records[0]._fields[0];
        path.routes = [];
        for (let i = 0; i < computedPath.segments.length; i++) {
            path.routes.push(new ObjectId(computedPath.segments[i].relationship.properties["route_id"]))
        }
        await paths.updateOne({ "_id" : path._id }, {
            $set: { routes: path.routes }
        });
        bar.update(i);
    }
    bar.stop();
    console.log("Filled " + emptyPaths.length + " paths in " + ((new Date().getTime() - start) / (60000)) + " minutes");
}