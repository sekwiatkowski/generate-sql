import {
    applyPairTo,
    compose, concatOptions, flatten,
    flattenObject, flipPair, foldPair, invertPairs, isFunction, isString,
    joinWithCommaSpace, joinWithNewline,
    joinWithSpace, map, mapEntries, mapOption, mapSecond,
    mapValues, maybeUndefined, onlyIf,
    pair, pairWith, safePropertyOf, some,
    surroundWithDoubleQuotes
} from 'compose-functions'

function generateTableAlias(index) {
    return `t${index + 1}`
}

function generateColumn({tableIndex, column}) {
    return `${generateTableAlias(tableIndex)}.${column}`
}

function generateValue({value}) {
    return ['?', [value]]
}

function generateSide(side) {
    switch (side.kind) {
        case 'column':
            return pair(generateColumn(side))([])
        case 'value':
            return generateValue(side)
    }
}

function generateComparison({kind, left, right}) {
    switch (kind) {
        case 'equals':
            const [leftSql, leftParameters] = generateSide(left)
            const [rightSql, rightParameters] = generateSide(right)
            return [`${leftSql} = ${rightSql}`, leftParameters.concat(rightParameters) ]
    }
}

/*
    someProperty: { tableIndex: 0, column: 'some_column', kind: 'column' }

    [ 'someProperty', { tableIndex: 0, column: 'some_column', kind: 'column' } ]

    [ { tableIndex: 0, column: 'some_column', kind: 'column' }, 'someProperty' ]

    [ 't1.some_column', 'someProperty' ]

    [ 't1.some_column', 'AS', 'someProperty' ]
 */
function generateColumnAlias(column) {
    return alias => joinWithSpace([
        generateColumn(column),
        'AS',
        surroundWithDoubleQuotes(alias)
    ])
}

function generateMap(obj) {
    const flattened = flattenObject(obj)
    const createdColumns = mapValues(f => f()) (flattened)

    return joinWithCommaSpace(mapEntries(compose(flipPair, applyPairTo(generateColumnAlias)))(createdColumns))
}

function generateGet(createColumn) {
    return generateColumn(createColumn())
}

function generateSelectColumns(select) {
    if (select === '*') {
        return '*'
    }
    else if(isFunction(select)) {
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
    return `FROM ${from} ${generateTableAlias(0)}`
}

function generateWhere(comparison) {
    const [sql, parameters] = generateComparison(comparison)
    return [`WHERE ${sql}`, parameters]
}

function generateSortExpression(expr) {
    const column = generateColumn(expr)
    return `${column} ${expr.direction}`
}

function generateOrderBy(expr) {
    return `ORDER BY ${generateSortExpression(expr)}`
}

const queryGenerators = [
    [generateSelect, 'select'],
    [generateFrom, 'from'],
    [generateJoins, 'joins'],
    [generateWhere, 'where'],
    [generateOrderBy, 'orderBy']
]

function generateJoin({ otherTable, comparison }) {
    const [comparisonSql, parameters] = generateComparison(comparison)

    const sqlFragments = [
        'INNER JOIN',
        otherTable.name,
        generateTableAlias(otherTable.index),
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
    /* [ [ generateSelect, some(select) ],
         [ generateFrom, some(from) ],
         [ generateWhere, maybe([where, parameters]) ]  */
    const withInput = map(mapSecond(safePropertyOf(query))) (queryGenerators)

    /* [ some('SELECT ...'])
         some('FROM ...'])
         maybe([['WHERE ...', parameters]) ] */
    const generated = map(foldPair(mapOption)) (withInput)

    /* [ 'SELECT ...',
         'FROM ...',
         ['WHERE ...', parameters] ] */
    const fragments = concatOptions(generated)

    return fragments
}

const ensurePair = onlyIf (isString) (pairWith([]))

export function generateParameterlessQuery({ select, from, orderBy }) {
    const selectSql = some(generateSelect(select))
    const fromSql = some(generateFrom(from))
    const orderBySql = mapOption(generateOrderBy)(maybeUndefined(orderBy))

    return joinWithNewline(concatOptions([selectSql, fromSql, orderBySql]))
}

export function generateQuery(query) {
    const fragments = generateQueryFragments(query)

    const ensuredPairs = map(ensurePair)(fragments)

    const [sqlFragments, parameterFragments] = invertPairs(ensuredPairs)

    const sql = joinWithNewline(sqlFragments)
    const parameters = flatten(parameterFragments)

    return [sql, parameters]
}