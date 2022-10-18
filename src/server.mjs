import express from 'express'
import { homePage } from "./controllers/itineraryController.mjs";
import { heartbeat } from "./controllers/featureController.mjs";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 80;

// Server configuration
app.set('views', __dirname + '/views')
app.set('view engine', 'pug');
app.use("/assets", express.static(__dirname + "/../public/assets"));
app.use("/bootstrap", express.static(__dirname + '../../node_modules/bootstrap/dist/css'));
app.use("/leaflet", express.static(__dirname + "../../node_modules/leaflet/dist"));

// Route definitions
app.get('/', homePage);
app.get('/heartbeat', heartbeat);

// Server handling
app.listen(PORT, () => {
	console.log("HTTP server listening on port " + PORT);
});
