const {createMapExpression} = require('./map_expressions')
const {generateParameterlessQuery} = require('../generation/generate_query')
const {generateTruncate} = require('../generation/generate_truncate')
const {SortedTable} = require('./sorted_table')
const {generateQuery} = require('../generation/generate_query')
const {generateInsert} = require('../generation/generate_insert')
const {createDescendingExpression} = require('./sort_expressions')
const {createAscendingExpression} = require('./sort_expressions')
const {createFilterExpressions} = require('./filter_expressions')
const {createSortCriterion} = require('./sort_expressions')
const {FilteredTable} = require('./filtered_table')
const {arrayOf} = require('compose-functions')
const {mapValues} = require('compose-functions')

class Table {
    #name
    #mapping

    constructor(name, mapping) {
        this.#name = name
        this.#mapping = mapping
    }

    filter(f) {
        const filterExpressions = mapValues(createFilterExpressions(0) (0))(this.#mapping)

        return new FilteredTable(this.#name, f(filterExpressions))
    }

    sortBy(f) {
        const ascendingExpressions = mapValues(createAscendingExpression(0))(this.#mapping)

        return new SortedTable(this.#name, f(ascendingExpressions))
    }

    sortDescendinglyBy(f) {
        const descendingExpressions = mapValues(createDescendingExpression(0))(this.#mapping)

        return new SortedTable(this.#name, f(descendingExpressions))
    }

    select() {
        return generateParameterlessQuery({ select: '*', from: this.#name })
    }

    map(f) {
        const mapExpressions = mapValues(createMapExpression(0))(this.#mapping)

        return generateParameterlessQuery({ select: f(mapExpressions), from: this.#name })
    }

    insert(obj) {
        return generateInsert(this.name) (this.#mapping) (arrayOf(obj))
    }

    insertBatch(objs) {
        return generateInsert(this.name) (this.#mapping) (objs)
    }

    /* TRUNCATE quickly removes all rows from a set of tables.
       It has the same effect as an unqualified DELETE on each table, but since it does not actually scan the tables it is faster.
       Furthermore, it reclaims disk space immediately, rather than requiring a subsequent VACUUM operation. This is most useful on large tables. */
    truncate() {
        return generateTruncate(this.name)
    }
}

module.exports = {
    Table
}