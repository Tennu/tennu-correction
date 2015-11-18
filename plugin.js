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
    requiresRoles: ["admin", "dbcore", "dblogger"],
    init: function(client, imports) {

        const adminCooldown = client._plugins.getRole("admin-cooldown");

        const requiresAdminHelp = "Requires admin privileges.";

        var isAdmin = imports.admin.isAdmin;
        if (adminCooldown) {
            var cooldown = client.config("correction")['cooldown'];
            if (!cooldown) {
                client._logger.warn('tennu-correction: Cooldown plugin found but no cooldown defined.')
            }
            else {
                isAdmin = adminCooldown.isAdmin;
            }
        }

        const dbACorrectionPromise = imports.dbcore.then(function(knex) {
            return correction(knex);
        });    

       function handleCorrection(IRCMessage){
           
           // Lets do this quickly
           var isSearchAndReplace = IRCMessage.message.match(/^s\/(.+?)\/(.*?)$/);
           
           if(!isSearchAndReplace)
           {
               return;
           }
           
           // Build data for correction
           var target = isSearchAndReplace[1];
           var replacement = isSearchAndReplace[2];
           
           return dbACorrectionPromise.then(function(correction){
               return correction.findCorrectable(target, IRCMessage.channel).then(function(locatedDBTarget){
                   if(!locatedDBTarget)
                   {
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