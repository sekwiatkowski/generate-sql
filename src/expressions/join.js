function createJoin(otherIndex, otherTableName, comparison) {
    return ({
        otherTable: {
            index: otherIndex,
            name: otherTableName
        },
        comparison,
        kind: 'join'
    })
}

module.exports = {
    createJoin
}