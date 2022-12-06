/**
 * Valide un paramètre d'une requête ou lève une exception si le paramètre n'est pas bon
 *
 * @param req
 * @param values
 * @param options
 * @throws Error
 */
export function expect(req, values, options = {}) {
    const errors = [];
    const formattedValues = [];
    for (const [k, type] of Object.entries(values)) {
        let v = req.body[k];
        let valid = true;
        let o = options[k];
        switch (type) {
            case "int":
                v = parseInt(v);
                valid = !isNaN(v);
                if (o && o.max) valid = valid && v <= o.max;
                break;
            case "array":
                valid = Array.isArray(v);
                break;
            case "string[]":
                valid = Array.isArray(v) && v.filter(e => typeof e !== "string").length === 0;
                if (o && o.in) valid = valid && v.filter(e => !o.in.includes(e)).length === 0;
                break;
            case "point":
                valid = typeof v === "object" &&
                    v.hasOwnProperty("type") &&
                    v.type === "Point" &&
                    v.hasOwnProperty("coordinates") &&
                    Array.isArray(v.coordinates);
        }
        formattedValues.push(v);
        if (!valid) {
            let error = "Champ {" + k + "} incorrect, type attendu: " + type + ". Type fourni: " + (typeof v) + ".";
            if (o) error += " (" + JSON.stringify(o) + ")";
            errors.push(error);
        }
    }
    if (errors.length === 0) {
        return formattedValues;
    } else {
        throw new Error(errors.join("\n"));
    }
}