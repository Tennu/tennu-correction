var correction = require('./correction');
var format = require('util').format;

// Will not change if 2 instances of tennu launched
const helps = {
    "correction": [
        "s/<target>/<replacement>",
        "Correct a previously said message."
    ]
};

const requiresAdminHelp = "Requires admin privileges.";

var TennuCorrection = {
    //dblogger forces users to meet the dependency. No logger, no data.
    requiresRoles: ["admin", "dbcore", "dblogger"],
    init: function(client, imports) {

        var correctionConfig = client.config("correction");

        if (!correctionConfig || !correctionConfig.lookBackLimit) {
            throw Error("tennu-correction: is missing some or all of its configuration.");
        }

        var isAdmin = imports.admin.isAdmin;
        const adminCooldown = client._plugins.getRole("cooldown");
        if (adminCooldown) {
            var cooldown = correctionConfig['cooldown'];
            if (!cooldown) {
                client._logger.warn('tennu-correction: Cooldown plugin found but no cooldown defined.')
            }
            else {
                isAdmin = adminCooldown(cooldown);
                client._logger.notice('tennu-correction: cooldowns enabled: ' + cooldown + ' seconds.');
            }
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

            return isAdmin(IRCMessage.hostmask).then(function(isadmin) {

                // isadmin will be "undefined" if cooldown system is enabled
                // isadmin will be true/false if cooldown system is disabled
                if (typeof(isadmin) !== "undefined" && isadmin === false) {
                    throw new Error(requiresAdminHelp);
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


            }).catch(adminFail);

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