var correction = require('./correction');
var format = require('util').format;

// Will not change if 2 instances of tennu launched
const helps = {
    "correction": [
        "s/<target>/<replacement>",
        "Correct a previously said message."
    ]
};

var TennuCorrection = {
    //dblogger forces users to meet the dependency. No logger, no data.
    requiresRoles: ["dbcore", "dblogger"],
    init: function(client, imports) {

        var correctionConfig = client.config("correction");

        if (!correctionConfig || !correctionConfig.lookBackLimit) {
            throw Error("tennu-correction: is missing some or all of its configuration.");
        }

        const dbACorrectionPromise = imports.dbcore.then(function(knex) {
            return correction(knex);
        });

        function handleCorrection(IRCMessage) {

            // Lets do this quickly
            var isSearchAndReplace = IRCMessage.message.match(/^s\/(.+?)\/(.*?)$/);

            if (!isSearchAndReplace) {
                return;
            }

            // Build data for correction
            var target = isSearchAndReplace[1];
            var replacement = isSearchAndReplace[2];

            return dbACorrectionPromise.then(function(correction) {
                return correction.findCorrectable(correctionConfig.lookBackLimit, target, IRCMessage.channel).then(function(locatedDBTarget) {
                    if (!locatedDBTarget) {
                        return {
                            intent: "notice",
                            query: true,
                            message: format('I searched the last 30 messages to the channel but couldnt find anything with "%s" in it', target)
                        };
                    }
                    var corrected = correction.correct(locatedDBTarget.Message, target, replacement);
                    return format('Correction, <%s> %s', locatedDBTarget.FromNick, corrected);
                });
            });

        }

        function adminFail(err) {
            return {
                intent: 'notice',
                query: true,
                message: err
            };
        }

        return {
            handlers: {
                "privmsg": handleCorrection,
            },
            help: {
                "correction": helps.correction
            }
        };

    }
};

module.exports = TennuCorrection;