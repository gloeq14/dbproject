## 1. Application routes

### 1.1. @GET /hearbeat

Returns the choosen city for our app.

Response body example:

```json
{
  "villeChoisie": "Montreal"
}
```

### 1.2. @GET /extracted_data

Returns the number of restaurants and of segments (!= paths) in our application database.

Response body example:

```json
{
  "nbRestaurants": 45320,
  "nbSegments": 8907
}
```

### 1.3. @GET /transformed_data

Returns the types of restaurants in our application database plus their count.

Response body example:

```json
{
    "restaurants": {
        "Restaurant service rapide": 3216,
        "Traiteur": 748,
        "Restaurant mets pour emporter": 612,
        "Événements spéciaux": 3514,
        "Centre d'accueil": 501,
        "Autres": 717,
        "Cafétéria": 620,
        "Épicerie": 3984,
        "Boucherie-épicerie": 633,
        "Pâtisserie": 738,
        "Bar salon, taverne": 1053,
        "Distributrice automatique": 550,
        "Magasin à rayons": 1033,
        "Épicerie avec préparation": 3462,
        "Restaurant": 13605,
        "Casse-croûte": 1808,
        "Distributeur en gros de produits laitiers": 679,
        "Garderie": 1501
    },
    "longueurCyclable": 1037604
}
```

### 1.4. @GET /readme

Downloads this file

### 1.5. @GET /type

Returns the types of restaurants in our database.

Response body example:

```json
[
    "Restaurant service rapide",
    "Traiteur",
    "Restaurant mets pour emporter",
    "Événements spéciaux",
    "Centre d'accueil",
    "Autres",
    "Cafétéria",
    "Épicerie",
    "Boucherie-épicerie",
    "Pâtisserie",
    "Bar salon, taverne",
    "Distributrice automatique",
    "Magasin à rayons",
    "Épicerie avec préparation",
    "Casse-croûte",
    "Restaurant",
    "Distributeur en gros de produits laitiers",
    "Garderie"
]
```

### 1.6. @POST /starting_point

Pick a path starting point for a path of the desired length containing the desired types of restaurants.

Request body example:

```json
{
  "length": int (en metre),
  "type": [
    str ,
    str ,
    ...
  ]
}
```

Response body example:

```json
{
  "startingPoint": {
    "type": "Point",
    "coordinates": [
      -73.58745916400316,
      45.523511613017945
    ]
  }
}
```

### 1.7. @POST /parcours

Returns a path starting by the given point (generally obtained by /starting_point), with the given length and the given types of restaurants.
The returned path will contain `numberOfStops` restaurants. 

Request body example:

```json
{
  "startingPoint": {
    "type": "Point", 
    "coordinates": [
      float , float
    ]
  },
  "length": int (en metre),
  "numberOfStops": int,
  "type": [
    str ,
    str ,
    ...
  ]
}
```

Response body example:

```json
{
    "type": "FeatureCollection",
    "features": [
        {
            "_id": "638ba1b2e29fec4ed7612d69",
            "type": "Feature",
            "properties": {
                "business_id": 117946,
                "name": "DISTRIBUTRICE 2 CAFE CABRINI",
                "address": "5655   Rue Saint-Zotique Est",
                "city": "Montréal",
                "state": "Québec, Canada",
                "type": "Distributrice automatique",
                "statut": "Fermé",
                "date_statut": "20181217",
                "latitude": "45.579586",
                "longitude": "-73.57024699999999",
                "x": 299317.92,
                "y": 5048855.51,
                "reference": "restaurant_8941"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [
                    -73.57024698828747,
                    45.57958566694041
                ]
            }
        },
        {
            "_id": "638ba1b2e29fec4ed7614b6d",
            "type": "Feature",
            "properties": {
                "business_id": 123821,
                "name": "CAFÉ L'ESSENTIEL",
                "address": "5155   Rue Sainte-Catherine Est",
                "city": "Montréal",
                "state": "Québec, Canada",
                "type": "Distributrice automatique",
                "statut": "Ouvert",
                "date_statut": "20210824",
                "latitude": "45.558883",
                "longitude": "-73.528147",
                "x": 302602.57,
                "y": 5046552.81,
                "reference": "restaurant_5781"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [
                    -73.52814737147837,
                    45.55888335317154
                ]
            }
        },
        ...,
        {
            "type": "Feature",
            "geometry": {
                "type": "MultiLineString",
                "coordinates": [
                    [
                        [
                            [
                                -73.53240183242501,
                                45.550200708720034
                            ],
                            [
                                -73.5325231381932,
                                45.550237297555746
                            ]
                        ],
                        [
                            [
                                -73.5325231381932,
                                45.550237297555746
                            ],
                            [
                                -73.53256603455378,
                                45.55022351785083
                            ],
                            [
                                -73.53259496667303,
                                45.5502022734799
                            ],
                            [
                                -73.53262941041531,
                                45.55018885609684
                            ]
                        ],
                        ...,
                    ]
                ]
            },
            "properties": {
                "length": 9001,
                "path_id": "638e5e9eb3c52a02449b7bcc"
            }
        }
    ]
}
```

### 1.8. @GET /

Application home page. Graphical interface which allow users to select and visualize paths.

### 1.9 @GET /starting_points

Returns the list of existing startings points for our paths.

Response body example:

```json
[
  [-73.93605515442859,45.48917972049804],
  [-73.93605515442859,45.48917972049804],
  [-73.93605515442859,45.48917972049804],
  [-73.93605515442859,45.48917972049804],
  [-73.93605515442859,45.48917972049804],
  [-73.93605515442859,45.48917972049804],
  [-73.93605515442859,45.48917972049804],
  ...,
]
```

## 2. Developper guide

### 2.1. Build and seed

If any changes has been made to the client scripts, run the following command:

```bash
npm run browserify
```

To seed the database, run:

```bash
npm run seed
```

### 2.2. Running the server locally

```bash
# Needs root privileges to listen port 80
npm run serve 
```

### 2.3. Using docker for production

```bash
# Run the server
docker compose up
# Stop the server
docker compose down
# Forcebuild docker image if any changes has been made 
docker compose build
```