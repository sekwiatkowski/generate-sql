const {generateParameterlessQuery} = require('../generation/generate_query')

class SortedTable {
    #name
    #orderBy

    constructor(name, orderBy) {
        this.#name = name
        this.#orderBy = orderBy
    }

    select() {
        return generateParameterlessQuery({ select: '*', from: this.#name, orderBy: this.#orderBy })
    }
}

module.exports = {
    SortedTable
}