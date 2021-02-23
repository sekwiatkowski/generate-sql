import {
    filter,
    flatten,
    isNotNull,
    joinWithCommaSpace,
    mapEntries,
    mapKeys,
    propertyOf,
    unzip
} from 'standard-functions'
import {generateEquality} from '../boolean/generate-comparison'
import {createColumn} from '../../expressions/column'
import {generateTableAccess} from '../access/generate-table-access'
import combineFragments from './combine-fragments'
import {generateJoins} from '../generate-joins'
import {generateWhere} from '../generate-where'

function generateUpdateTable(tableName) {
    return [`UPDATE ${generateTableAccess(tableName, 0)}`, []]
}

function generateAssignment(tableIndex) {
    return ([ columnName, value ]) => {

        const column = createColumn(tableIndex) (columnName)

        return generateEquality(true)({left: column, right: value})
    }
}

function generateSet(mapping, tableIndex, partialObject) {
    const partialRow = mapKeys(propertyOf(mapping)) (partialObject)

    const [ generatedAssignments, setParameters ] = unzip(mapEntries(generateAssignment(tableIndex)) (partialRow))

    const assignmentList = joinWithCommaSpace(generatedAssignments)
    const setSql = `SET ${assignmentList}`

    return [setSql, flatten(setParameters)]
}

export function generateUpdateStatement({ tableNames, mappings, joins, where, set }) {
    const { tableIndex, partialObject } = set

    const updateTableFragment = generateUpdateTable(tableNames[0])
    const joinFragment = joins ? generateJoins(joins) : null
    const setFragment = generateSet(mappings[tableIndex], tableIndex, partialObject)
    const whereFragment = generateWhere(true) (where)

    const fragments = [ updateTableFragment, joinFragment, setFragment, whereFragment ]

    const presentFragments = filter(isNotNull) (fragments)

    return combineFragments(presentFragments)
}