var format = require('util').format;
var Promise = require('bluebird');
var c = require('irc-colors');
var _ = require('lodash');

// Will not change if 2 instances of tennu launched
const helps = {
    "correction": [
        "s/<target>/<replacement>",
        "Correct a previously said message."
    ]
};

var TennuCorrection = {
    init: function(client, imports) {

        var correctionConfig = client.config("correction");
        if (!correctionConfig || !correctionConfig.lookBackLimit) {
            throw Error("tennu-correction: is missing some or all of its configuration.");
        }

        var queueHandler = require('./lib/queue-handler')(correctionConfig.lookBackLimit);
        var correctionMiddleware;

        function router(IRCMessage) {
            var isSearchAndReplace = IRCMessage.message.match(/^s\/(.+?)\/(.*?)$/);
            if (!isSearchAndReplace) {
                if (!_.isFunction(correctionMiddleware)) {
                    queueHandler.update(IRCMessage.message, IRCMessage.channel, IRCMessage.nickname);
                }
                return;
            }

            var target = isSearchAndReplace[1];
            var replacement = isSearchAndReplace[2];

            if (_.isFunction(correctionMiddleware)) {
                var middlewareResponse = callMiddleware(target, IRCMessage.channel, replacement);
                if(!_.isUndefined(middlewareResponse)){
                    return middlewareResponse;
                }
            }
            
            return handleCorrection(target, IRCMessage.channel, replacement);
        }

        function callMiddleware(target, channel, replacement) {
            return correctionMiddleware(correctionConfig.lookBackLimit, target, channel, replacement);
        }

        function handleCorrection(target, channel, replacement) {
            return Promise.try(function() {
                return queueHandler.findCorrectable(target, channel);
            }).then(function(maybeFound) {
                if (!maybeFound) {
                    return {
                        intent: "notice",
                        query: true,
                        message: format('I searched the last %s messages to the channel but couldnt find anything with "%s" in it', correctionConfig.lookBackLimit, target)
                    };
                }
                return getCorrected(maybeFound, target, replacement);
            });
        }

        function getCorrected(IRCMessage, target, replacement) {
            var replacementValue = c.bold(replacement);
            var corrected = IRCMessage.message.replace(new RegExp(_.escapeRegExp(target), 'g'), replacementValue);
            return format('Correction, <%s> %s', IRCMessage.nickname, corrected);
        }

        function addMiddleware(middleware) {
            correctionMiddleware = middleware;
        }

        return {
            handlers: {
                "privmsg": router,
            },
            help: {
                "correction": helps.correction
            },
            exports: {
                addMiddleware: addMiddleware,
                correct: getCorrected
            }
        };

    }
};

module.exports = TennuCorrection;