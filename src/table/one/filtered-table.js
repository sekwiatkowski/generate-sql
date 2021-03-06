import {generateSelectStatement} from '../../generation/statements/generate-select-statement'
import {createCountQuery, createQuery} from '../../query'
import {generateFilteredDelete} from '../../generation/statements/generate-delete-statement'
import {createAscendingOrdersFromColumns, createDescendingOrdersFromColumns} from '../../expressions/order'
import {SortedTable} from './sorted-table'
import {set} from '../../expressions/update'
import {generateUpdateStatement} from '../../generation/statements/generate-update-statement'
import {isObject} from 'standard-functions'

export class FilteredTable {
    #name
    #columns
    #where
    #generateSelectFromWhere

    constructor(name, columns, where) {
        this.#name = name
        this.#columns = columns
        this.#where = where
        this.#generateSelectFromWhere = select => generateSelectStatement({ select, from: this.#name, where: this.#where })
    }

    sortBy(f) {
        const orders = createAscendingOrdersFromColumns(this.#columns)

        return new SortedTable(this.#name, this.#columns, this.#where, f(orders))
    }

    sortDescendinglyBy(f) {
        const orders = createDescendingOrdersFromColumns(this.#columns)

        return new SortedTable(this.#name, this.#columns, this.#where, f(orders))
    }

    #query(f) {
        return createQuery(this.#generateSelectFromWhere(f(this.#columns)))
    }

    map(f) {
        return this.#query(f)
    }

    get(f) {
        return this.#query(f)
    }

    select() {
        return createQuery(this.#generateSelectFromWhere('*'))
    }

    count() {
        return createCountQuery(this.#generateSelectFromWhere)
    }

    update(assignment) {
        return generateUpdateStatement({
            firstTableName: this.#name,
            where: this.#where,
            set: set(
                this.#columns,
                isObject(assignment) ? assignment : assignment(this.#columns)
            )
        })
    }

    delete() {
        return generateFilteredDelete(this.#name) (this.#where)
    }
}