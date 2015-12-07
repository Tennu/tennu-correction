var c = require('irc-colors');
var format = require('util').format;


function correction(knex) {
    return {
        knex: knex,
        findCorrectable: findCorrectable,
        correct: correct
    };
}

// Returns one row, or undefined.
function findCorrectable(lookBackLimit, target, channel) {
    return this.knex.select('*')
        .from('message')
        .where('Channel', channel)
        .andWhere('Message', 'NOT LIKE', 's/%/%')
        .limit(lookBackLimit)
        .offset(0)
        .orderBy('Timestamp', 'desc')
        .then(function(rows) {
            if (rows) {
                var matches = rows.filter(function(message) {
                    return message.Message.indexOf(target) > -1;
                });
                // Grab the first match
                if(matches.length)
                {
                    return matches[0];
                }
            }
        });
}

function correct(dbMessage, target, replacement) {
    var replacementValue = c.bold(replacement);
    return dbMessage.replace(new RegExp(escapeRegExp(target), 'g'), replacementValue);
}

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

module.exports = correction;