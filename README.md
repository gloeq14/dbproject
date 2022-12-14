## 1. Usage guide

Here are presented the existing requests in the application.

### 1.1. @GET /hearbeat

Response body example:

```json
{
  "VilleChoisie": "Montreal"
}
```

### 1.2. @GET /extracted_data

Response body example:

```json
{
  "nbRestaurants": 100,
  "nbSegments": 2000 
}
```

### 1.3. @GET /transformed_data

Response body example:

```json

```

### 1.4. @GET /readme

Downloads this file

### 1.5. @GET /type

Response body example:

```json

```

### 1.6. @POST /starting_point

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
      float , float
    ]
  }
}
```

### 1.7. @POST /parcours

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

```

### 1.8. @GET /

Page d'accueil de l'application, propose une interface graphique pour le calcul et la visualisation de chemins.

### 1.9 @GET /starting_points

Retourne la liste des points de départs existants sur nos chemins précalculés.

Response body example:

```json

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