### Running the server locally

```bash
# Needs root privileges to listen port 80
npm start 
```

### Using docker for production

```bash
# Run the server
docker compose up
# Stop the server
docker compose down
# Forcebuild docker image if any changes has been made 
docker compose build
```