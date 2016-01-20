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
    configDefaults: {
        "correction": {
            "lookBackLimit": 60
        },
    },
    init: function(client) {

        var correctionConfig = client.config("correction");

        var queueHandler = require('./lib/queue-handler')(correctionConfig.lookBackLimit);

        var middleware;

        function router(IRCMessage) {

            var isSearchAndReplace = IRCMessage.message.match(/^s\/(.+?)\/(.*?)$/);
            if (!isSearchAndReplace) {
                queueHandler.update(IRCMessage.message, IRCMessage.channel, IRCMessage.nickname);
                return;
            }

            var target = isSearchAndReplace[1];
            var replacement = isSearchAndReplace[2];

            if (_.isFunction(middleware)) {
                return Promise.try(function() {
                    var middlewareResponse = callMiddleware(target, IRCMessage.channel, replacement);
                    if (!_.isUndefined(middlewareResponse)) {
                        return middlewareResponse;
                    }
                }).catch(function(err) {
                    client._logger.error('Error in middleware.');
                    client._logger.error(err);
                });
            }

            return handleCorrection(target, IRCMessage.channel, replacement);
        }

        function callMiddleware(target, channel, replacement) {
            return middleware(correctionConfig.lookBackLimit, target, channel, replacement);
        }

        function handleCorrection(target, channel, replacement) {
            return Promise.try(function() {
                return queueHandler.findCorrectable(target, channel);
            }).then(function(maybeFound) {
                if (!maybeFound) {
                    return {
                        intent: "notice",
                        query: true,
                        message: format('I searched the last %s in the cache but couldnt find anything with "%s" in it', correctionConfig.lookBackLimit, target)
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

        var addMiddleware = function(newMiddleware) {
            middleware = newMiddleware;
        };

        return {
            handlers: {
                "privmsg": router,
            },
            help: {
                "correction": helps.correction
            },
            exports: {
                addMiddleware: addMiddleware
            }
        };

    }
};

module.exports = TennuCorrection;