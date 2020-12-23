import {
    filter,
    flatten,
    flattenObject,
    hasProperty,
    invertPairs,
    isArray,
    joinWithCommaSpace,
    joinWithNewline,
    joinWithSpace,
    keys,
    map,
    mapEntries,
    pick,
    surroundWithDoubleQuotes
} from 'standard-functions'
import {generateTableExpression} from './generate-table'
import generateColumn from './generate-column'
import generatePredicate from './generate-predicate'

/*
    someProperty: { tableIndex: 0, column: 'some_column', kind: 'column' }

    [ 'someProperty', { tableIndex: 0, column: 'some_column', kind: 'column' } ]

    [ { tableIndex: 0, column: 'some_column', kind: 'column' }, 'someProperty' ]

    [ 't1.some_column', 'someProperty' ]

    [ 't1.some_column', 'AS', 'someProperty' ]
 */
function generateColumnAlias([alias, column]) {
    return joinWithSpace(
        generateColumn(column),
        'AS',
        surroundWithDoubleQuotes(alias)
    )
}

function generateMap(obj) {
    const columns = flattenObject(obj, hasProperty('kind'))

    const aliases = mapEntries(generateColumnAlias) (columns)

    return joinWithCommaSpace(aliases)
}

function generateGet(column) {
    return generateColumn(column)
}

function generateSelectColumns(select) {
    if (select === '*') {
        return '*'
    }
    else if(select.kind === 'column') {
        return generateGet(select)
    }
    else {
        return generateMap(select)
    }
}

function generateSelect(select) {
    return `SELECT ${generateSelectColumns(select)}`
}

function generateFrom(from) {
    return `FROM ${generateTableExpression(from, 0)}`
}

function generateWhere(predicate) {
    const [sql, parameters] = generatePredicate(predicate)
    return [`WHERE ${sql}`, parameters]
}

function generateSortExpression(expr) {
    const column = generateColumn(expr)
    return `${column} ${expr.direction}`
}

function generateOrderBy(expr) {
    return `ORDER BY ${generateSortExpression(expr)}`
}

const queryGenerators = {
    select: generateSelect,
    from: generateFrom,
    joins: generateJoins,
    where: generateWhere,
    orderBy: generateOrderBy
}
const queryFragments = keys(queryGenerators)

function generateJoin({ otherTable, predicate }) {
    const [comparisonSql, parameters] = generatePredicate(predicate)

    const sqlFragments = [
        'INNER JOIN',
        generateTableExpression(otherTable.name, otherTable.index),
        'ON',
        comparisonSql
    ]

    const sql = joinWithSpace(sqlFragments)

    return [sql, parameters]
}

function generateJoins(joins) {
    const pairs = map(generateJoin)(joins)

    const [ sqlFragments, parameterLists ] = invertPairs(pairs)

    const parameters = flatten(parameterLists)

    return [ joinWithNewline(sqlFragments), parameters ]
}

function generateQueryFragments(query) {
    const presentFragments = filter(fragment => query[fragment])(queryFragments)

    const relevantGenerators = pick(presentFragments) (queryGenerators)

    const fragments = mapEntries(([fragment, generate]) =>
        generate(query[fragment])
    )(relevantGenerators)

    return fragments
}

export function generateQuery(query) {
    const fragments = generateQueryFragments(query)

    const ensuredPairs = map(stringOrArray => isArray(stringOrArray)
        ? stringOrArray
        : [stringOrArray, []]
    ) (fragments)

    const [sqlFragments, parameterFragments] = invertPairs(ensuredPairs)

    const sql = joinWithNewline(sqlFragments)
    const parameters = flatten(parameterFragments)

    return [sql, parameters]
}