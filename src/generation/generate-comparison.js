import generateColumnExpression from './generate-column-expression'
import {concat} from 'standard-functions'

export function generateValue({value}) {
    return ['?', [value]]
}

function generateSide(side, useAlias) {
    switch (side.kind) {
        case 'column':
            return [useAlias ? generateColumnExpression(side) : side.columnName, []]
        case 'value':
            return generateValue(side)
    }
}

export function generateEquality({left, right}, useAlias) {
    const [leftSql, leftParameters] = generateSide(left, useAlias)
    const [rightSql, rightParameters] = generateSide(right, useAlias)
    return [`${leftSql} = ${rightSql}`, concat(leftParameters, rightParameters) ]
}

export function generateComparison(comparison, useAlias = true) {
    switch (comparison.kind) {
        case 'equals':
            return generateEquality(comparison, useAlias)
    }
}

