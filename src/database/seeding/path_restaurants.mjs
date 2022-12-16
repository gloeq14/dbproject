import { boot, ROOT } from "../../boot.mjs";
import { paths } from "../mongo.mjs";
import { SingleBar } from "cli-progress";

await boot();

console.log("=================== Starting path restaurants seeding... ===================")
await paths.updateMany({}, {$set: {restaurants: null}});
const emptyPaths = await getEmptyPaths();
await fillPaths(emptyPaths);
console.log("=================== Path restaurants seeding ended =========================")

process.exit();

/**
 * Retourne la liste des chemins qui n'ont pas encore été calculés
 *
 * @returns {Promise<FindCursor<WithId<TSchema>>>}
 */
async function getEmptyPaths() {
    return paths.find({
        "restaurants": null
    }).toArray();
}

/**
 * Calcule les restaurants de chacun des chemins donnés en paramètres
 *
 * @param emptyPaths
 * @returns {Promise<void>}
 */
async function fillPaths(emptyPaths) {
    const start = new Date().getTime();
    console.log("Filling " + emptyPaths.length + " paths...");
    const bar = new SingleBar();
    bar.start(emptyPaths.length-1, 0);
    for (let i = 0; i < emptyPaths.length; i++) {
        const path = emptyPaths[i];
        const result = (await paths.aggregate([
            { $match: { _id: path._id } },
            { $lookup: {
                from: "routes",
                localField: "routes",
                foreignField: "_id",
                as: "routes"
            } },
            { $lookup: {
                from: "restaurants",
                localField: "routes.properties.restaurants",
                foreignField: "_id",
                as: "restaurants"
            } }
        ]).toArray())[0];
        const uniqueRestaurants = [];
        for (const restaurant of result.restaurants) {
            const toInclude = {
                _id: restaurant._id,
                type: restaurant.properties.type
            }
            if (!uniqueRestaurants.includes(toInclude)) uniqueRestaurants.push(toInclude);
        }
        await paths.updateOne({ "_id" : path._id }, {
            $set: { restaurants: uniqueRestaurants }
        });
        bar.update(i);
    }
    bar.stop();
    console.log("Filled " + emptyPaths.length + " paths in " + ((new Date().getTime() - start) / (60000)) + " minutes");
}
