var format = require('util').format;
var Promise = require('bluebird');
var split = require('split-fwd-slash');
var c = require('irc-colors');
var _ = require('lodash');

const helps = {
    "correction": [
        "s/<target>/<replacement>",
        "Correct a previously said message."
    ]
};

const _getNotice = function(msg) {
    return {
        intent: 'notice',
        query: true,
        message: msg
    };
}

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
            return Promise.try(function() {
                
                    var isSearchAndReplace = IRCMessage.message.match(/^[S|s]\/(.+)/);
                    var isSearchAndRandomReplace = IRCMessage.message.match(/^[R|r][A|a]\/(.+)/);
                    
                    if (!isSearchAndReplace && !isSearchAndRandomReplace) {
                        queueHandler.update(IRCMessage.message, IRCMessage.channel, IRCMessage.nickname);
                        return;
                    }

                    var splitMessage = split(IRCMessage.message);

                    if(isSearchAndReplace)
                    {

                        if (splitMessage.length !== 3) {
                            return _getNotice('Your search and replace did not have exactly one target, and one response. Make sure youre escaping slashes properlly.');
                        }
    
                        var target = splitMessage[1];
                        var replacement = splitMessage[2];
    
                        return Promise.try(function() {
                                if (_.isFunction(middleware)) {
                                    return callMiddleware(target, IRCMessage.channel, replacement);
                                }
                            })
                            .then(function(middlewareResponse) {
                                if (!_.isUndefined(middlewareResponse)) {
                                    return middlewareResponse;
                                } else {
                                    return handleCorrection(target, IRCMessage.channel, replacement);                                
                                }
                            })
                            .catch(function(err) {
                                client._logger.error('Error in tennu-correction middleware');
                                return err;
                            });
                            
                    }
                    else if(isSearchAndRandomReplace)
                    {
                        
                        var replacement = splitMessage[1];
    
                        return Promise.try(function() {
                                if (_.isFunction(middleware)) {
                                    return callMiddleware(null, IRCMessage.channel, replacement);
                                }
                            })
                            .then(function(middlewareResponse) {
                                if (!_.isUndefined(middlewareResponse)) {
                                    return middlewareResponse;
                                } else {
                                    return handleRandomCorrection(IRCMessage.channel, replacement);                                
                                }
                            })
                            .catch(function(err) {
                                client._logger.error('Error in tennu-correction middleware');
                                return err;
                            });
                    
                    }

                })
                .catch(function(err) {
                    client._logger.error(err);
                });
        }

        function callMiddleware(target, channel, replacement) {
            return middleware(correctionConfig.lookBackLimit, target, channel, replacement);
        }

        function handleCorrection(target, channel, replacement) {
            return queueHandler.findCorrectable(target, channel).then(function(maybeFound) {
                if (!maybeFound) {
                    return _getNotice(format('I searched the last %s in the cache but couldnt find anything with "%s" in it', correctionConfig.lookBackLimit, target));
                }
                return getCorrected(maybeFound, target, replacement);
            });
        }

        function handleRandomCorrection(channel, replacement) {
            return queueHandler.getRandomMessage().then(function(randomMessage){
                return correctRandomWord(randomMessage, replacement);
            });
        }

        function correctRandomWord(IRCMessage, replacement) {
            var randomMessage = IRCMessage.message;
            var words = randomMessage.split(/\s/);
            var randomWord = words[Math.floor(Math.random()*words.length)];
            var randomReplaceResult = randomMessage.replace(randomWord, replacement);
            return format('Correction, <%s> %s', IRCMessage.nickname, randomReplaceResult);
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
                addMiddleware: addMiddleware,
                queueHandler: queueHandler
            }
        };

    }
};

module.exports = TennuCorrection;