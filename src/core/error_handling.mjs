/**
 * ValidationError class
 *
 * Allows user to specify an error code in addition to the text message
 */
export class ValidationError extends Error {

    /**
     * Save the message text and error code
     *
     * @param message
     * @param code
     */
    constructor(message, code) {
        super(message);
        this.code = code;
    }

}

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
    let code = 400;
    const formattedValues = [];
    for (const [k, type] of Object.entries(values)) {
        let v = req.body[k];
        let valid = true;
        let o = options[k];
        switch (type) {
            case "int":
                v = parseInt(v);
                valid = !isNaN(v);
                if (valid && o && o.max) {
                    if (v > o.max) {
                        code = 404;
                        valid = false;
                    }
                }
                break;
            case "array":
                valid = Array.isArray(v);
                break;
            case "string[]":
                valid = Array.isArray(v) && v.filter(e => typeof e !== "string").length === 0;
                if (valid && o && o.in) {
                    if (v.filter(e => !o.in.includes(e)).length !== 0) {
                        code = 404;
                        valid = false;
                    }
                }
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
        throw new ValidationError(errors.join("\n"), code);
    }
}