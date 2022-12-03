import express from 'express'
import {homePage, searchModal, pathModal, adminModal, startingPoints, shortestPath } from "./controllers/itineraryController.mjs";
import { heartbeat, extractedData, transformedData, parcours } from "./controllers/featureController.mjs";
import { ROOT, boot } from "./boot.mjs";

await boot();

const app = express();

// Server configuration
app.set('views', ROOT + '/views')
app.set('view engine', 'pug');
app.use("/assets", express.static(ROOT + "/../public/assets"));
app.use("/bootstrap", express.static(ROOT + '../../node_modules/bootstrap/dist/css'));
app.use("/leaflet", express.static(ROOT + "../../node_modules/leaflet/dist"));

// Route definitions
app.get('/', homePage);
app.get('/modals/search-modal', searchModal);
app.get('/modals/path-modal', pathModal);
app.get('/modals/admin-modal', adminModal);
app.get('/starting_points', startingPoints);
app.get('/heartbeat', heartbeat);
app.get('/extracted_data', extractedData);
app.get('/transformed_data', transformedData);
app.get('/parcours', parcours);
app.get('/shortest_path', shortestPath);

// Server handling
const listener = app.listen(80, () => {
	console.log("\nHTTP server listening on port " + 80 + "\n");
});

// CTRL+C closing
process.on('SIGINT', () => {
	listener.close(() => {
		console.log("\nClosing HTTP server...\n");
		process.exit(0)
	})
})
