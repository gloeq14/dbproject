import axios from "axios";

/**
 * Class RoadMap
 *
 * Gère l'affichage de trajets sur openstreetmap
 */
export default class RoadMap {

    /**
     * Init RoadMap
     *
     * @param lat
     * @param long
     */
    constructor(lat, long) {
        this.activePath = null;
        this.modal = document.querySelector("#modal");
        this.mapContainer = document.querySelector("#map");
        this.pointer = document.querySelector("#pointer");
        this.pointerCallback = null;
        this.mapObjects = {};
        this.bind();
        this.initMap(lat, long);
        this.loadSearchModal();
    }

    /**
     * Bind les évènements de la carte
     */
    bind() {
        // Pointer events
        this.mapContainer.addEventListener("mousedown", () => this.setPointerState("up"));
        this.mapContainer.addEventListener("mouseup", () => this.setPointerState("down"));
        this.mapContainer.addEventListener("wheel", () => {
            this.setPointerState("up");
            this.pointerCallback = setTimeout(() => {
                this.setPointerState("down");
            }, 600);
        });
        this.setPointerState("down");
    }

    /**
     * Met le modal en loading ou en non loading
     *
     * @param state
     */
    setModalLoading(state) {
        if (!state) this.modal.classList.remove("loading");
        else this.modal.classList.add("loading");
    }

    /**
     * Charge un modal
     *
     * @param name
     * @param parameters
     */
    loadModal(name, parameters = {}) {
        this.setModalLoading(true);
        return axios.get("/modals/" + name + "-modal", parameters).then(data => {
            return new Promise(r => setTimeout(() => {
                this.modal.children.item(0).innerHTML = data.data;
                // Si on a un bouton retour on le bind
                const backButton = document.querySelector("#back-button");
                if (backButton) {
                    backButton.addEventListener("click", (e) => {
                        if (backButton.classList.contains("disabled")) return;
                        backButton.classList.add("disabled");
                        e.preventDefault();
                        this.loadSearchModal();
                    });
                }
                this.setModalLoading(false);
                r();
            }, 800));
        })
    }

    /**
     * Met à jour l'état du pointeur
     *
     * @param state
     */
    setPointerState(state) {
        if (this.pointerCallback) clearTimeout(this.pointerCallback);
        this.pointer.classList.remove("down");
        this.pointer.classList.remove("up");
        this.pointer.classList.add(state);
    }

    /**
     * Initie la carte openstreetmap
     *
     * @param lat
     * @param long
     */
    initMap(lat, long) {
        // Créer l'objet "macarte" et l'insèrer dans l'élément HTML qui a l'ID "map"
        this.map = L.map(this.mapContainer).setView([lat, long], 11);
        // Leaflet ne récupère pas les cartes (tiles) sur un serveur par défaut. Nous devons lui préciser où nous souhaitons les récupérer. Ici, openstreetmap.fr
        L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
            // Il est toujours bien de laisser le lien vers la source des données
            attribution: 'données © <a href="//osm.org/copyright">OpenStreetMap</a>/ODbL - rendu <a href="//openstreetmap.fr">OSM France</a>',
            minZoom: 1,
            maxZoom: 20
        }).addTo(this.map);
    }

    /**
     * Demande au serveur une liste de chemins
     *
     * @param startingPoint
     * @param distance
     * @param stopCount
     * @param restaurantTypes
     * @returns {Promise<AxiosResponse<any>>}
     */
    findPaths(startingPoint, distance, stopCount, restaurantTypes) {
        return axios.get("/parcours", {
            params: {
                startingPoint: startingPoint,
                length: distance,
                numberOfStops: stopCount,
                type: restaurantTypes
            }
        });
    }

    /**
     * Affiche un chemin sur la carte
     *
     * @param path
     */
    setActivePath(path) {
        this.path = path;
        let formattedPath = [];
        for (const route of path["features"][0]["geometry"]["coordinates"][0]) {
            for (const coordinates of route) {
                formattedPath.push([coordinates[1], coordinates[0]]); // GeoJSON inverse par rapport à Leaflet
            }
        }
        const pathPoly = L.polyline(formattedPath, {
            color: '#0d6efd',
            weight: 10
        });
        pathPoly.addTo(this.map);
        this.map.fitBounds(pathPoly.getBounds());
        this.loadPathModal();
    }

    /**
     * Charge le modal de détail d'un chemin
     */
    loadPathModal() {
        this.loadModal("path", { params: { path: this.path._id } });
    }

    /**
     * Charge le modal de sélection d'un itinéraire
     */
    loadSearchModal() {
        this.loadModal("search").then(() => {
            const submitButton = document.querySelector("#submit-button");
            const adminMenuButton = document.querySelector("#admin-menu-button");
            const distanceInput = document.querySelector("#distance-input");
            const stopCountInput = document.querySelector("#stop-count-input");
            submitButton.addEventListener("click", (e) => {
                e.preventDefault();
                if (submitButton.classList.contains("disabled")) return;
                this.setModalLoading(true);
                this.findPaths(
                    this.map.getCenter(),
                    parseInt(distanceInput.value),
                    parseInt(stopCountInput.value),
                    []
                ).then((data) => {
                    this.setActivePath(data.data);
                });
            });
            adminMenuButton.addEventListener("click", (e) => {
               e.preventDefault();
               this.loadAdminModal();
            });
        });
    }

    /**
     * Charge le modal du menu admin
     */
    loadAdminModal() {
        this.loadModal("admin").then(() => {
            const startingPointsCheckbox = document.querySelector("#starting-points-checkbox");
            startingPointsCheckbox.checked = !!this.mapObjects["starting_points"];
            startingPointsCheckbox.addEventListener("change", (e) => {
                if (startingPointsCheckbox.classList.contains("disabled")) return;
                startingPointsCheckbox.classList.add("disabled");
                if (startingPointsCheckbox.checked) {
                    this.mapObjects["starting_points"] = [];
                    axios.get("/starting_points").then((data) => {
                        for (let point of data.data) {
                            const startingPoint = L.marker([point[1], point[0]]);
                            startingPoint.addTo(this.map);
                            this.mapObjects["starting_points"].push(startingPoint);
                        }
                        startingPointsCheckbox.classList.remove("disabled");
                    })
                } else {
                    for (let point of this.mapObjects["starting_points"]) {
                        point.remove();
                    }
                    delete this.mapObjects["starting_points"];
                    startingPointsCheckbox.classList.remove("disabled");
                }
            });
        });
    }

}