const express = require("express");

const app = express();
const PORT = 80;

const obj = {
    VilleChoisie: 'Montreal',
}

app.get('/heartbeat', function (req, res) {
   res.json(obj);
});

app.listen(PORT, () => {
	console.log("Server");
});
